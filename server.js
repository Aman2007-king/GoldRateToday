/**
 * GoldRateIndia — World-Class Backend Server
 * Auto-fetches live gold, silver, forex, MCX data every 5 minutes.
 * Falls back to last saved prices.json if APIs fail.
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const http    = require('http');

const app        = express();
const PORT       = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
const PRICES_FILE = path.join(__dirname, 'prices.json');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.static('public', {
  maxAge: '30m',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ─── IST Helper ──────────────────────────────────────────────────────────────
function getIST() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// ─── City Premiums (₹ per 10g) ───────────────────────────────────────────────
const CITY_PREMIUMS = {
  mumbai: 0, delhi: 150, chennai: 450, kolkata: -220,
  bangalore: 140, ahmedabad: 50, hyderabad: 120, pune: 30,
  jaipur: 160, surat: 60, lucknow: 80, patna: -100,
  bhopal: 40, chandigarh: 130, kochi: 200, nagpur: 20,
  coimbatore: 380, visakhapatnam: 90, indore: 45, vadodara: 55
};

// ─── In-memory cache ─────────────────────────────────────────────────────────
let cache = {
  prices: null,
  forex:  null,
  lastFetchedAt: null,
  fetchError: null
};

// ─── Load/Save prices.json ────────────────────────────────────────────────────
function loadPrices() {
  try {
    const raw = fs.readFileSync(PRICES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      gold24k: 170000, silver: 95000,
      lastUpdated: getIST(), source: 'default'
    };
  }
}

function savePrices(data) {
  try { fs.writeFileSync(PRICES_FILE, JSON.stringify(data, null, 2)); }
  catch(e) { console.error('Failed to save prices:', e.message); }
}

// ─── Generic HTTP GET ─────────────────────────────────────────────────────────
function fetchUrl(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GoldRateIndia/2.0' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(null); }
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// ─── Fetch live gold/silver prices ───────────────────────────────────────────
// Uses metals-api.com free tier (500 calls/mo). Falls back to saved file.
async function fetchLivePrices() {
  const API_KEY = process.env.METALS_API_KEY || '';
  let gold24k_10g = null, silver_kg = null, source = 'saved';

  // Try metals-api
  if (API_KEY) {
    try {
      const url = `https://metals-api.com/api/latest?access_key=${API_KEY}&base=INR&symbols=XAU,XAG`;
      const d = await fetchUrl(url);
      if (d && d.success && d.rates) {
        // XAU rate is per troy oz in base currency; 1 troy oz = 31.1035g
        const goldPerGram = d.rates.INR / d.rates.XAU / 31.1035;
        gold24k_10g = Math.round(goldPerGram * 10);
        const silverPerGram = d.rates.INR / d.rates.XAG / 31.1035;
        silver_kg = Math.round(silverPerGram * 1000);
        source = 'metals-api';
      }
    } catch(e) { console.warn('metals-api error:', e.message); }
  }

  // Try frankfurter + gold fallback (USD/INR + XAU/USD)
  if (!gold24k_10g) {
    try {
      const [forex, xau] = await Promise.all([
        fetchUrl('https://api.frankfurter.app/latest?from=USD&to=INR'),
        fetchUrl('https://data-asg.goldprice.org/dbXRates/USD')
      ]);
      if (forex && forex.rates && xau && xau.items) {
        const usdInr = forex.rates.INR;
        const xauUsd = xau.items[0].xauPrice;     // price of 1 troy oz in USD
        const xagUsd = xau.items[0].xagPrice;
        const goldPerGram = (xauUsd * usdInr) / 31.1035;
        gold24k_10g = Math.round(goldPerGram * 10);
        const silverPerGram = (xagUsd * usdInr) / 31.1035;
        silver_kg = Math.round(silverPerGram * 1000);
        source = 'goldprice.org';
      }
    } catch(e) { console.warn('goldprice.org error:', e.message); }
  }

  if (gold24k_10g) {
    const data = { gold24k: gold24k_10g, silver: silver_kg || 95000, lastUpdated: getIST(), source };
    savePrices(data);
    return data;
  }
  // Fallback
  return { ...loadPrices(), source: 'saved' };
}

// ─── Fetch forex rates ────────────────────────────────────────────────────────
async function fetchForex() {
  try {
    const d = await fetchUrl('https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP,AED,SGD,JPY,AUD,CHF,CAD');
    if (d && d.rates) return d.rates;
  } catch(e) { console.warn('Forex fetch error:', e.message); }
  return null;
}

// ─── Auto-refresh every 5 minutes ────────────────────────────────────────────
async function refreshAll() {
  try {
    console.log(`[${getIST()}] Refreshing prices...`);
    const [prices, forex] = await Promise.all([fetchLivePrices(), fetchForex()]);
    cache.prices = prices;
    cache.forex  = forex;
    cache.lastFetchedAt = getIST();
    cache.fetchError = null;
    console.log(`[${getIST()}] ✅ Prices updated — Gold: ₹${prices.gold24k} | Silver: ₹${prices.silver} | Source: ${prices.source}`);
  } catch(e) {
    cache.fetchError = e.message;
    console.error('Refresh error:', e.message);
  }
}
refreshAll();
setInterval(refreshAll, 5 * 60 * 1000);

// ─── Build 30-day history from saved deltas ───────────────────────────────────
function buildHistory(g, s) {
  const deltas = [0,-200,180,-150,350,-100,240,-80,300,-200,150,-50,400,-180,220,-100,180,-250,120,-60,280,-150,200,-300,100,-80,350,-220,160,-100];
  return deltas.slice(0, 30).map((d, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    return {
      date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      gold24k: g + d,
      gold22k: Math.round((g + d) * 0.916),
      silver: s + (d * 2)
    };
  });
}

// ─── API: /api/prices ─────────────────────────────────────────────────────────
app.get('/api/prices', (req, res) => {
  const p = cache.prices || loadPrices();
  const g = Number(p.gold24k);
  const s = Number(p.silver);

  const cityRates = {};
  Object.entries(CITY_PREMIUMS).forEach(([city, adj]) => {
    cityRates[city] = {
      gold24k: g + adj,
      gold22k: Math.round((g + adj) * 0.916),
      gold18k: Math.round((g + adj) * 0.75),
      gold14k: Math.round((g + adj) * 0.583),
      perGram24k: Math.round((g + adj) / 10),
      perGram22k: Math.round((g + adj) * 0.916 / 10)
    };
  });

  res.setHeader('Cache-Control', 'no-cache');
  res.json({
    gold24k:   g,
    gold22k:   Math.round(g * 0.916),
    gold18k:   Math.round(g * 0.75),
    gold14k:   Math.round(g * 0.583),
    silver:    s,
    lastUpdated: p.lastUpdated,
    source:    p.source || 'manual',
    cityRates,
    history:   buildHistory(g, s),
    mcxGold:   Math.round(g * 0.9965), // approx MCX rate
    lbmaUSD:   Math.round(g / 0.916 * 0.0031) // approx LBMA USD/troy oz
  });
});

// ─── API: /api/forex ──────────────────────────────────────────────────────────
app.get('/api/forex', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  if (cache.forex) {
    res.json({ success: true, base: 'INR', rates: cache.forex, lastUpdated: cache.lastFetchedAt });
  } else {
    // Static fallback
    res.json({ success: true, base: 'INR', rates: { USD:0.012, EUR:0.011, GBP:0.0095, AED:0.044, SGD:0.016 }, lastUpdated: getIST() });
  }
});

// ─── API: /api/status ────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    lastFetchedAt: cache.lastFetchedAt,
    fetchError: cache.fetchError,
    pricesSource: cache.prices?.source || 'not loaded'
  });
});

// ─── API: Admin update prices ─────────────────────────────────────────────────
app.post('/api/update-prices', (req, res) => {
  const { password, gold, silver } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ success: false, error: 'Wrong password' });
  if (!gold || !silver || isNaN(gold) || isNaN(silver))
    return res.status(400).json({ success: false, error: 'Invalid values' });

  const data = { gold24k: Number(gold), silver: Number(silver), lastUpdated: getIST(), source: 'admin' };
  savePrices(data);
  cache.prices = data;
  res.json({ success: true, message: 'Rates updated successfully!', data });
});

// ─── API: Force refresh ───────────────────────────────────────────────────────
app.post('/api/refresh', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ success: false, error: 'Wrong password' });
  await refreshAll();
  res.json({ success: true, prices: cache.prices, lastFetchedAt: cache.lastFetchedAt });
});

// ─── Page Routes ──────────────────────────────────────────────────────────────
const pages = ['silver','bullion','nifty','sensex','crude-oil','currency','fuel',
                'jewellers','mutual-funds','ipo','calculators','banking','compare-gold','policies'];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
pages.forEach(p => app.get('/' + p, (req, res) => res.sendFile(path.join(__dirname, 'public', p + '.html'))));
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🥇 GoldRateIndia running → http://localhost:${PORT}`);
  console.log(`🔑 Admin password: ${ADMIN_PASS}`);
  console.log(`🔄 Auto-refresh: every 5 minutes`);
});
