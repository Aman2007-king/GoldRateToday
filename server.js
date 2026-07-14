/**
 * GoldRateIndia — Production Server v3.0
 * ─────────────────────────────────────────────────────
 * Gold & Silver  → goldapi.io (your live key, primary)
 *                  goldprice.org + frankfurter (fallback)
 * Forex          → frankfurter.app (free, daily)
 * IPO / MF / Fuel→ data.json (admin-updated)
 * Auto-refresh   → 10:00 AM & 6:00 PM IST every day
 *                  + immediate fetch on boot
 */

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const https    = require('https');
const crypto   = require('crypto');

const app  = express();
app.set('trust proxy', 1); // needed on Render/Vercel so req.ip is the real client IP, not the proxy's

const PORT = process.env.PORT || 3000;

// ── Secrets ───────────────────────────────────────────────────────────────────
// Never hardcode real keys/passwords here — this file is committed to a public
// GitHub repo. Both values MUST come from environment variables set in your
// Render/Vercel dashboard.
const GOLDAPI_KEY = process.env.GOLDAPI_KEY || '';
if (!GOLDAPI_KEY) {
  console.warn('⚠️  GOLDAPI_KEY is not set. Live gold/silver fetch from goldapi.io will fail;');
  console.warn('   the app will fall back to its secondary source, then saved prices. Set');
  console.warn('   GOLDAPI_KEY in your environment to restore live updates.');
}

let ADMIN_PASS = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASS) {
  // No predictable default (the old 'admin123' fallback was a real security hole) and
  // no hard crash either (that would crash-loop the whole site over a missing admin
  // password). Instead: generate a random one-time password and print it to the
  // server logs, so you can still get into /admin-panel while you go set the real
  // env var. This password changes every restart until ADMIN_PASSWORD is set.
  ADMIN_PASS = crypto.randomBytes(9).toString('base64url');
  console.warn('⚠️  ADMIN_PASSWORD is not set. Generated a temporary one-time password for');
  console.warn(`   this run — check your Render/Vercel logs for it:`);
  console.warn(`   ${ADMIN_PASS}`);
  console.warn('   This will change on every restart. Set ADMIN_PASSWORD in your environment');
  console.warn('   to fix this permanently.');
}

// DATA_DIR lets prices.json/data.json live on a persistent disk (e.g. Render disk
// mounted at /var/data) so admin-panel edits survive redeploys. Defaults to the
// repo folder itself, so local dev and any host without DATA_DIR set is unaffected.
const DATA_DIR    = process.env.DATA_DIR || __dirname;
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');
const DATA_FILE   = path.join(DATA_DIR, 'data.json');

// ── Brute-force protection for admin routes ──────────────────────────────────
// In-memory is fine for a single-instance deploy like this. Tracks failed
// password attempts per IP; locks that IP out after too many in a short window.
const loginAttempts   = new Map(); // ip -> { count, windowStart, lockedUntil }
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS      = 5;
const LOCKOUT_MS        = 30 * 60 * 1000; // 30 minutes

function msLockedOut(ip) {
  const e = loginAttempts.get(ip);
  if (!e || !e.lockedUntil) return 0;
  const remaining = e.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}
function recordFailedAttempt(ip) {
  const now = Date.now();
  let e = loginAttempts.get(ip);
  if (!e || now - e.windowStart > ATTEMPT_WINDOW_MS) e = { count: 0, windowStart: now, lockedUntil: 0 };
  e.count++;
  if (e.count >= MAX_ATTEMPTS) e.lockedUntil = now + LOCKOUT_MS;
  loginAttempts.set(ip, e);
}
function recordSuccess(ip) {
  loginAttempts.delete(ip);
}
function checkAdminAuth(req, res, password) {
  const ip = req.ip || 'unknown';
  const locked = msLockedOut(ip);
  if (locked > 0) {
    res.status(429).json({ success: false, error: `Too many failed attempts. Try again in ${Math.ceil(locked / 60000)} minute(s).` });
    return false;
  }
  if (password !== ADMIN_PASS) {
    recordFailedAttempt(ip);
    res.status(401).json({ success: false, error: 'Wrong password' });
    return false;
  }
  recordSuccess(ip);
  return true;
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', {
  maxAge: '30m',
  setHeaders(res, fp) {
    if (fp.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function getIST() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
}
function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function save(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
  catch(e) { console.error('Save error:', e.message); }
}

// ── HTTP fetch helper ─────────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'User-Agent': 'GoldRateIndia/3.0', ...headers } };
    const req  = https.get(url, opts, r => {
      let b = '';
      r.on('data', d => b += d);
      r.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── In-memory cache ───────────────────────────────────────────────────────────
let CACHE = {
  prices: load(PRICES_FILE, { gold24k: 169200, silver: 95000, lastUpdated: getIST(), source: 'startup' }),
  forex:  null
};

// ── PRIMARY: goldapi.io ───────────────────────────────────────────────────────
// Docs: https://www.goldapi.io/dashboard
// Returns price in USD per troy oz; we convert → INR per 10g
async function fetchFromGoldAPI(usdInr) {
  const headers = { 'x-access-token': GOLDAPI_KEY, 'Content-Type': 'application/json' };
  const [xau, xag] = await Promise.all([
    fetchJSON('https://www.goldapi.io/api/XAU/INR', headers),
    fetchJSON('https://www.goldapi.io/api/XAG/INR', headers)
  ]);

  // goldapi.io returns price in the requested currency (INR) per troy oz
  if (!xau || !xau.price) throw new Error('goldapi.io: bad XAU response');
  
  const goldPerOz  = xau.price;           // INR per troy oz
  const goldPerG   = goldPerOz / 31.1035; // INR per gram
  const gold24k    = Math.round(goldPerG * 10); // per 10g

  let silver = 95000; // default
  if (xag && xag.price) {
    const silverPerOz = xag.price;
    const silverPerG  = silverPerOz / 31.1035;
    silver = Math.round(silverPerG * 1000); // per kg
  }

  return { gold24k, silver, source: 'goldapi.io' };
}

// ── FALLBACK: goldprice.org + frankfurter ────────────────────────────────────
async function fetchFromFallback() {
  const [xauData, forexData] = await Promise.all([
    fetchJSON('https://data-asg.goldprice.org/dbXRates/USD'),
    fetchJSON('https://api.frankfurter.app/latest?from=USD&to=INR')
  ]);
  if (!xauData?.items?.[0] || !forexData?.rates?.INR) throw new Error('Fallback: bad response');
  const usdInr    = forexData.rates.INR;
  const xauUsd    = xauData.items[0].xauPrice;
  const xagUsd    = xauData.items[0].xagPrice;
  const gold24k   = Math.round((xauUsd * usdInr / 31.1035) * 10);
  const silver    = Math.round((xagUsd * usdInr / 31.1035) * 1000);
  return { gold24k, silver, source: 'goldprice.org+frankfurter' };
}

// ── Main fetch orchestrator ───────────────────────────────────────────────────
async function fetchGoldSilver() {
  console.log(`[${getIST()}] 🔄 Fetching gold/silver...`);
  let result = null;

  // Try goldapi.io first (your paid key)
  try {
    result = await fetchFromGoldAPI();
    console.log(`[${getIST()}] ✅ goldapi.io → Gold: ₹${result.gold24k}/10g | Silver: ₹${result.silver}/kg`);
  } catch(e) {
    console.warn(`[${getIST()}] ⚠️  goldapi.io failed: ${e.message} — trying fallback`);
  }

  // Fallback if primary fails
  if (!result) {
    try {
      result = await fetchFromFallback();
      console.log(`[${getIST()}] ✅ Fallback → Gold: ₹${result.gold24k}/10g`);
    } catch(e) {
      console.warn(`[${getIST()}] ⚠️  All fetches failed: ${e.message} — using saved prices`);
      CACHE.prices = load(PRICES_FILE, CACHE.prices);
      return;
    }
  }

  // Append to 30-day history
  const stored  = load(PRICES_FILE, {});
  const history = stored.history || [];
  const today   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const idx     = history.findIndex(h => h.date === today);
  const entry   = { date: today, gold24k: result.gold24k, silver: result.silver };
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);

  const data = {
    gold24k:     result.gold24k,
    silver:      result.silver,
    lastUpdated: getIST(),
    source:      result.source,
    history:     history.slice(0, 30)
  };
  save(PRICES_FILE, data);
  CACHE.prices = data;
}

// ── Forex fetch ───────────────────────────────────────────────────────────────
async function fetchForex() {
  try {
    const d = await fetchJSON('https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP,AED,SGD,JPY,AUD,CHF,CAD,CNY,SAR,KWD');
    if (d?.rates) {
      CACHE.forex = d.rates;
      console.log(`[${getIST()}] ✅ Forex updated`);
    }
  } catch(e) { console.warn('Forex fetch failed:', e.message); }
}

// ── IST scheduler — fires at fixed hour:min IST each day ─────────────────────
function scheduleIST(hourIST, minuteIST, fn) {
  function runNext() {
    const ist   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const next  = new Date(ist);
    next.setHours(hourIST, minuteIST, 0, 0);
    if (ist >= next) next.setDate(next.getDate() + 1);
    const ms = next - ist;
    console.log(`⏰ Scheduled ${hourIST}:${String(minuteIST).padStart(2,'0')} IST fetch in ${Math.round(ms/60000)} min`);
    setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, ms);
  }
  runNext();
}

// Boot: fetch immediately, then schedule 10AM and 6PM IST
fetchGoldSilver().then(fetchForex);
scheduleIST(10, 0, () => fetchGoldSilver().then(fetchForex));
scheduleIST(18, 0, fetchGoldSilver);

// ── City premiums (₹ per 10g adjustment from Mumbai) ─────────────────────────
const PREMIUMS = {
  mumbai: 0, delhi: 150, chennai: 450, kolkata: -220, bangalore: 140,
  ahmedabad: 50, hyderabad: 120, pune: 30, jaipur: 160, surat: 60,
  lucknow: 80, patna: -100, kochi: 200, nagpur: 20, coimbatore: 380,
  chandigarh: 130, bhopal: 40, visakhapatnam: 90, indore: 45, vadodara: 55
};

// ── API: /api/prices ──────────────────────────────────────────────────────────
app.get('/api/prices', (req, res) => {
  const p = CACHE.prices || load(PRICES_FILE, { gold24k: 169200, silver: 95000 });
  const g = Number(p.gold24k), s = Number(p.silver);
  // Prefer an admin-set 22K value; otherwise fall back to the standard 91.6% purity ratio.
  const g22   = (p.gold22k != null && !isNaN(p.gold22k)) ? Number(p.gold22k) : Math.round(g * 0.916);
  const g22IsCustom = p.gold22k != null && !isNaN(p.gold22k);
  const r22   = g22 / g; // effective ratio, used so city-level 22K rates stay consistent with any custom value

  const cityRates = {};
  Object.entries(PREMIUMS).forEach(([city, adj]) => {
    const cg = g + adj;
    cityRates[city] = {
      gold24k:    cg,
      gold22k:    Math.round(cg * r22),
      gold18k:    Math.round(cg * 0.75),
      gold14k:    Math.round(cg * 0.583),
      perGram24k: Math.round(cg / 10),
      perGram22k: Math.round(cg * r22 / 10)
    };
  });

  res.setHeader('Cache-Control', 'no-cache');
  res.json({
    gold24k:     g,
    gold22k:     g22,
    gold22kIsCustom: g22IsCustom,
    gold18k:     Math.round(g * 0.75),
    gold14k:     Math.round(g * 0.583),
    silver:      s,
    lastUpdated: p.lastUpdated,
    source:      p.source || 'saved',
    cityRates,
    cityPremium: PREMIUMS,
    history:    (p.history || []).slice(0, 30),
    mcxGold:    Math.round(g * 0.9965)
  });
});

// ── API: /api/forex ───────────────────────────────────────────────────────────
app.get('/api/forex', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(CACHE.forex || {
    USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044,
    SGD: 0.016, JPY: 1.66, AUD: 0.018, CHF: 0.011, CAD: 0.016
  });
});

// ── API: /api/data — IPO, MF, Fuel ───────────────────────────────────────────
app.get('/api/data', (req, res) => {
  const d = load(DATA_FILE, getDefaultData());
  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.json(d);
});

// ── API: /api/status ──────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    prices: CACHE.prices?.lastUpdated,
    source: CACHE.prices?.source,
    forex:  !!CACHE.forex
  });
});

// ── API: Admin — update gold/silver ──────────────────────────────────────────
app.post('/api/update-prices', (req, res) => {
  const { password, gold, silver, gold22k } = req.body;
  if (!checkAdminAuth(req, res, password)) return;
  if (!gold || !silver || isNaN(gold) || isNaN(silver))
    return res.status(400).json({ success: false, error: 'Invalid values' });
  const has22 = gold22k !== undefined && gold22k !== '' && gold22k !== null;
  if (has22 && isNaN(gold22k))
    return res.status(400).json({ success: false, error: 'Invalid 22K value' });

  const stored  = load(PRICES_FILE, {});
  const today   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const history = stored.history || [];
  const g22ForHistory = has22 ? Number(gold22k) : Math.round(Number(gold) * 0.916);
  history.unshift({ date: today, gold24k: Number(gold), gold22k: g22ForHistory, silver: Number(silver) });

  const data = {
    gold24k: Number(gold),
    silver: Number(silver),
    lastUpdated: getIST(),
    source: 'admin',
    history: history.slice(0, 30)
  };
  // Only store gold22k when explicitly provided — leaving the field blank means
  // "go back to auto-calculating 22K as 91.6% of 24K" rather than keeping a stale override.
  if (has22) data.gold22k = Number(gold22k);

  save(PRICES_FILE, data);
  CACHE.prices = data;
  res.json({ success: true, message: '✅ Rates updated!', data });
});

// ── API: Admin — force live refresh ──────────────────────────────────────────
app.post('/api/refresh', async (req, res) => {
  const { password } = req.body;
  if (!checkAdminAuth(req, res, password)) return;
  await fetchGoldSilver();
  await fetchForex();
  res.json({ success: true, prices: CACHE.prices, forex: CACHE.forex });
});

// ── API: Admin — update data.json (IPO/MF/Fuel) ──────────────────────────────
app.post('/api/update-data', (req, res) => {
  const { password, ...updates } = req.body;
  if (!checkAdminAuth(req, res, password)) return;
  const existing = load(DATA_FILE, getDefaultData());
  save(DATA_FILE, { ...existing, ...updates, lastUpdated: getIST() });
  res.json({ success: true, message: 'Data updated!' });
});

// ── Page Routes ───────────────────────────────────────────────────────────────
const PAGES = ['silver','bullion','nifty','sensex','crude-oil','currency','fuel',
               'jewellers','mutual-funds','ipo','calculators','banking','compare-gold','policies'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
PAGES.forEach(p => app.get('/' + p, (req, res) => res.sendFile(path.join(__dirname, 'public', p + '.html'))));
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((req, res) => res.redirect('/'));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🥇 GoldRateIndia v3.0 → http://localhost:${PORT}`);
  console.log(`🔑 Admin Password : ${ADMIN_PASS}`);
  console.log(`🔑 GoldAPI Key    : ${GOLDAPI_KEY.slice(0, 12)}...`);
  console.log(`🔄 Auto-refresh   : 10:00 AM & 6:00 PM IST daily\n`);
});

// ── Default data.json content ─────────────────────────────────────────────────
function getDefaultData() {
  return {
    lastUpdated: getIST(),
    ipos: [
      { name:"Ather Energy",         price:"₹304–321",  open:"02 Jun 2026", close:"04 Jun 2026", status:"upcoming", type:"Mainboard", lot:46,   gmp:"+₹45",  link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" },
      { name:"Shadowfax Technologies",price:"₹195–205", open:"26 May 2026", close:"28 May 2026", status:"upcoming", type:"Mainboard", lot:73,   gmp:"+₹28",  link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" },
      { name:"Indira IVF",           price:"₹490–516",  open:"19 May 2026", close:"21 May 2026", status:"open",     type:"Mainboard", lot:29,   gmp:"+₹62",  link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" },
      { name:"Solinas Integrity",    price:"₹85–90",    open:"14 May 2026", close:"16 May 2026", status:"closed",   type:"SME",       lot:1600, gmp:"",      link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" },
      { name:"Unimech Aerospace",    price:"₹745–785",  open:"05 May 2026", close:"07 May 2026", status:"listed",   type:"Mainboard", lot:19,   gmp:"+₹140 (17.8%)", link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" },
      { name:"Quality Power Elec.",  price:"₹425–450",  open:"29 Apr 2026", close:"01 May 2026", status:"listed",   type:"Mainboard", lot:33,   gmp:"+₹95",  link:"https://angel-one.onelink.me/Wjgr/oc2kvsya" }
    ],
    mutualFunds: [
      { name:"Parag Parikh Flexi Cap Fund",  category:"Flexi Cap",  returns1y:"22.4%", returns3y:"19.1%", returns5y:"24.2%", risk:"Moderate",        aum:"₹72,400 Cr", nav:"₹84.32", minSIP:"₹1,000",  rating:5 },
      { name:"Mirae Asset Large Cap Fund",   category:"Large Cap",  returns1y:"16.2%", returns3y:"14.8%", returns5y:"17.6%", risk:"Low",             aum:"₹37,200 Cr", nav:"₹112.45",minSIP:"₹1,000",  rating:5 },
      { name:"HDFC Mid-Cap Opp. Fund",       category:"Mid Cap",    returns1y:"24.1%", returns3y:"21.6%", returns5y:"26.3%", risk:"Moderately High", aum:"₹61,200 Cr", nav:"₹148.70",minSIP:"₹1,000",  rating:5 },
      { name:"SBI Small Cap Fund",           category:"Small Cap",  returns1y:"28.7%", returns3y:"24.3%", returns5y:"29.8%", risk:"High",            aum:"₹25,600 Cr", nav:"₹163.42",minSIP:"₹500",    rating:4 },
      { name:"Axis Bluechip Fund",           category:"Large Cap",  returns1y:"14.6%", returns3y:"13.2%", returns5y:"16.1%", risk:"Low",             aum:"₹41,500 Cr", nav:"₹67.89", minSIP:"₹500",    rating:4 },
      { name:"Kotak Emerging Equity Fund",   category:"Mid Cap",    returns1y:"21.8%", returns3y:"19.4%", returns5y:"23.7%", risk:"Moderately High", aum:"₹42,100 Cr", nav:"₹132.15",minSIP:"₹1,000",  rating:4 },
      { name:"Quant Active Fund",            category:"Multi Cap",  returns1y:"31.2%", returns3y:"26.8%", returns5y:"33.1%", risk:"High",            aum:"₹8,900 Cr",  nav:"₹594.30",minSIP:"₹1,000",  rating:5 },
      { name:"Nippon India Liquid Fund",     category:"Liquid",     returns1y:"7.1%",  returns3y:"6.8%",  returns5y:"5.9%",  risk:"Very Low",        aum:"₹28,900 Cr", nav:"₹5,814", minSIP:"₹100",    rating:4 },
      { name:"UTI Nifty 50 Index Fund",      category:"Index",      returns1y:"15.3%", returns3y:"14.1%", returns5y:"17.2%", risk:"Low",             aum:"₹19,400 Cr", nav:"₹148.22",minSIP:"₹500",    rating:4 },
      { name:"Canara Rob Emerging Equities", category:"Mid Cap",    returns1y:"19.6%", returns3y:"17.8%", returns5y:"21.4%", risk:"Moderately High", aum:"₹21,300 Cr", nav:"₹274.50",minSIP:"₹1,000",  rating:4 }
    ],
    fuel: [
      { city:"Mumbai",      petrol:106.31, diesel:94.27,  cng:72.50 },
      { city:"Delhi",       petrol:96.72,  diesel:89.62,  cng:74.10 },
      { city:"Bangalore",   petrol:101.94, diesel:87.89,  cng:null  },
      { city:"Chennai",     petrol:102.63, diesel:94.24,  cng:null  },
      { city:"Hyderabad",   petrol:109.66, diesel:97.82,  cng:null  },
      { city:"Kolkata",     petrol:106.03, diesel:92.76,  cng:48.30 },
      { city:"Ahmedabad",   petrol:96.63,  diesel:92.38,  cng:88.20 },
      { city:"Pune",        petrol:105.97, diesel:93.62,  cng:null  },
      { city:"Jaipur",      petrol:108.48, diesel:93.72,  cng:78.50 },
      { city:"Lucknow",     petrol:96.57,  diesel:89.76,  cng:85.40 },
      { city:"Bhopal",      petrol:108.65, diesel:93.90,  cng:null  },
      { city:"Patna",       petrol:107.24, diesel:94.04,  cng:null  },
      { city:"Chandigarh",  petrol:96.20,  diesel:84.95,  cng:null  },
      { city:"Kochi",       petrol:107.22, diesel:95.17,  cng:null  },
      { city:"Nagpur",      petrol:106.28, diesel:93.60,  cng:null  },
      { city:"Indore",      petrol:108.50, diesel:93.80,  cng:null  },
      { city:"Surat",       petrol:96.48,  diesel:92.20,  cng:88.40 },
      { city:"Visakhapatnam",petrol:111.30,diesel:99.19,  cng:null  },
      { city:"Vadodara",    petrol:96.55,  diesel:92.10,  cng:88.70 },
      { city:"Coimbatore",  petrol:103.12, diesel:94.61,  cng:null  }
    ],
    fuelLastUpdated: "17 May 2026"
  };
}
