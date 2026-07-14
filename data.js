// api/data.js — Vercel Serverless Function
// Fetches gold/silver from GoldAPI.io + reads IPO/Fuel/MF from Google Sheets CSV
// Deploy on Vercel: this file goes in /api/data.js

const GOLDAPI_KEY = process.env.GOLDAPI_KEY || '';

// ── Google Sheet Published CSV URLs ──────────────────────────────────────────
// 1. Go to sheets.google.com and open your sheet
// 2. File → Share → Publish to web
// 3. For each tab, publish as CSV and paste the URL below
const SHEET_IPO  = process.env.SHEET_IPO  || '';
const SHEET_FUEL = process.env.SHEET_FUEL || '';
const SHEET_MF   = process.env.SHEET_MF   || '';

// ── Simple in-memory cache (resets per cold start, fine for serverless) ───────
let cache = { data: null, ts: 0 };
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/["\r]/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/["\r]/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchTimeout(url, opts = {}, ms = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return r;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ── Gold prices from GoldAPI.io ───────────────────────────────────────────────
async function fetchGoldPrices(usdInr) {
  try {
    const [goldRes, silverRes] = await Promise.all([
      fetchTimeout('https://www.goldapi.io/api/XAU/INR', {
        headers: { 'x-access-token': GOLDAPI_KEY, 'Content-Type': 'application/json' }
      }),
      fetchTimeout('https://www.goldapi.io/api/XAG/INR', {
        headers: { 'x-access-token': GOLDAPI_KEY, 'Content-Type': 'application/json' }
      })
    ]);

    const gold   = await goldRes.json();
    const silver = await silverRes.json();

    // GoldAPI returns price per troy oz in INR
    const goldPerGram   = gold.price   / 31.1035;
    const silverPerGram = silver.price / 31.1035;

    return {
      gold24kPer10g: Math.round(goldPerGram * 10),
      gold22kPer10g: Math.round(goldPerGram * 10 * 0.916),
      gold18kPer10g: Math.round(goldPerGram * 10 * 0.75),
      gold14kPer10g: Math.round(goldPerGram * 10 * 0.583),
      silverPerKg:   Math.round(silverPerGram * 1000),
      goldPrevClose: gold.prev_close_price ? Math.round(gold.prev_close_price / 31.1035 * 10) : null,
      silverPrevClose: silver.prev_close_price ? Math.round(silver.prev_close_price / 31.1035 * 1000) : null,
      source: 'GoldAPI.io'
    };
  } catch (e) {
    // fallback
    return {
      gold24kPer10g: 96500,
      gold22kPer10g: 88394,
      gold18kPer10g: 72375,
      gold14kPer10g: 56260,
      silverPerKg: 97000,
      goldPrevClose: 96300,
      silverPrevClose: 96500,
      source: 'fallback'
    };
  }
}

// ── USD/INR from Frankfurter (free, no key) ───────────────────────────────────
async function fetchUSDINR() {
  try {
    const r = await fetchTimeout('https://api.frankfurter.app/latest?from=USD&to=INR');
    const d = await r.json();
    return d.rates?.INR || 84.5;
  } catch {
    return 84.5;
  }
}

// ── Load IPOs from Google Sheet CSV ──────────────────────────────────────────
async function loadIPOs() {
  if (!SHEET_IPO) return getDefaultIPOs();
  try {
    const r = await fetchTimeout(SHEET_IPO);
    const text = await r.text();
    const rows = parseCSV(text);
    return rows.map(row => ({
      name:  row['company name'] || row['name'] || '—',
      price: row['price band']   || row['price'] || '—',
      open:  row['open date']    || row['open']  || '—',
      close: row['close date']   || row['close'] || '—',
      lot:   row['lot size']     || row['lot']   || '—',
      type:  row['type']  || 'Mainboard',
      gmp:   row['gmp']   || '',
      status: (row['status'] || 'upcoming').toLowerCase(),
      link:  row['link']  || 'https://angel-one.onelink.me/Wjgr/oc2kvsya'
    }));
  } catch {
    return getDefaultIPOs();
  }
}

function getDefaultIPOs() {
  return [
    { name: 'Stallion India Fluorochemicals', price: '₹85–₹90',  open: '14 May 2026', close: '16 May 2026', lot: '165', type: 'SME',       gmp: '+₹22', status: 'open',     link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Aegis Vopak Terminals',          price: '₹223–₹235', open: '14 May 2026', close: '16 May 2026', lot: '63',  type: 'Mainboard',  gmp: '+₹18', status: 'open',     link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Ather Energy',                   price: '₹304–₹321', open: '28 Apr 2026', close: '30 Apr 2026', lot: '46',  type: 'Mainboard',  gmp: '',     status: 'listed',   link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Schloss Bangalore',              price: '₹410–₹432', open: '26 May 2026', close: '28 May 2026', lot: '34',  type: 'Mainboard',  gmp: '+₹40', status: 'upcoming', link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Dr. Agarwal Eye Hospital',       price: '₹382–₹402', open: '29 May 2026', close: '02 Jun 2026', lot: '37',  type: 'Mainboard',  gmp: '+₹28', status: 'upcoming', link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Smartworks Coworking',           price: '₹140–₹148', open: '02 Jun 2026', close: '04 Jun 2026', lot: '101', type: 'Mainboard',  gmp: '',     status: 'upcoming', link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Vishal Mega Mart',               price: '₹78–₹80',   open: '20 Mar 2026', close: '24 Mar 2026', lot: '187', type: 'Mainboard',  gmp: '',     status: 'listed',   link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
    { name: 'Laxmi Dental',                   price: '₹407–₹428', open: '18 Mar 2026', close: '20 Mar 2026', lot: '35',  type: 'Mainboard',  gmp: '',     status: 'listed',   link: 'https://angel-one.onelink.me/Wjgr/oc2kvsya' },
  ];
}

// ── Load Fuel from Google Sheet ───────────────────────────────────────────────
async function loadFuel() {
  if (!SHEET_FUEL) return getDefaultFuel();
  try {
    const r = await fetchTimeout(SHEET_FUEL);
    const text = await r.text();
    const rows = parseCSV(text);
    return rows.map(row => ({
      city:    row['city'] || '—',
      petrol:  parseFloat(row['petrol'] || row['petrol price'] || 0),
      diesel:  parseFloat(row['diesel'] || row['diesel price'] || 0),
      cng:     row['cng'] ? parseFloat(row['cng']) : null,
      change:  row['change'] || '0',
    }));
  } catch {
    return getDefaultFuel();
  }
}

function getDefaultFuel() {
  return [
    { city: 'Mumbai',     petrol: 106.31, diesel: 94.27,  cng: 72.5,  change: '0' },
    { city: 'Delhi',      petrol: 96.72,  diesel: 89.62,  cng: 74.1,  change: '0' },
    { city: 'Bangalore',  petrol: 101.94, diesel: 87.89,  cng: null,  change: '0' },
    { city: 'Chennai',    petrol: 102.63, diesel: 94.24,  cng: null,  change: '0' },
    { city: 'Hyderabad',  petrol: 109.66, diesel: 97.82,  cng: null,  change: '0' },
    { city: 'Kolkata',    petrol: 106.03, diesel: 92.76,  cng: null,  change: '0' },
    { city: 'Ahmedabad',  petrol: 96.63,  diesel: 92.38,  cng: 80.5,  change: '0' },
    { city: 'Pune',       petrol: 105.54, diesel: 92.14,  cng: 74.0,  change: '0' },
    { city: 'Jaipur',     petrol: 108.48, diesel: 93.72,  cng: null,  change: '0' },
    { city: 'Surat',      petrol: 96.27,  diesel: 92.01,  cng: null,  change: '0' },
    { city: 'Lucknow',    petrol: 96.57,  diesel: 89.76,  cng: 75.3,  change: '0' },
    { city: 'Nagpur',     petrol: 106.82, diesel: 92.59,  cng: null,  change: '0' },
    { city: 'Kochi',      petrol: 104.93, diesel: 93.88,  cng: null,  change: '0' },
    { city: 'Chandigarh', petrol: 94.24,  diesel: 82.40,  cng: null,  change: '0' },
    { city: 'Bhopal',     petrol: 108.65, diesel: 93.90,  cng: null,  change: '0' },
    { city: 'Patna',      petrol: 107.46, diesel: 94.35,  cng: null,  change: '0' },
    { city: 'Indore',     petrol: 108.50, diesel: 94.37,  cng: null,  change: '0' },
    { city: 'Vizag',      petrol: 108.84, diesel: 96.90,  cng: null,  change: '0' },
    { city: 'Coimbatore', petrol: 100.62, diesel: 92.73,  cng: null,  change: '0' },
  ];
}

// ── Load Mutual Funds from Google Sheet ────────────────────────────────────────
async function loadMutualFunds() {
  if (!SHEET_MF) return getDefaultMF();
  try {
    const r = await fetchTimeout(SHEET_MF);
    const text = await r.text();
    const rows = parseCSV(text);
    return rows.map(row => ({
      name:      row['fund name'] || row['name'] || '—',
      category:  row['category']  || row['cat']  || '—',
      nav:       row['nav']       || '—',
      returns1y: row['1y return'] || row['returns1y'] || '—',
      returns3y: row['3y return'] || row['returns3y'] || '—',
      aum:       row['aum']       || '—',
      risk:      row['risk']      || 'Moderate',
      rating:    parseInt(row['rating'] || '4'),
      minSip:    row['min sip']   || '₹500',
      exitLoad:  row['exit load'] || '1%',
    }));
  } catch {
    return getDefaultMF();
  }
}

function getDefaultMF() {
  return [
    { name: 'SBI Blue Chip Fund – Direct Growth',        category: 'Large Cap',  nav: '₹78.42',  returns1y: '+14.2%', returns3y: '+12.8%', aum: '₹48,320 Cr', risk: 'Moderately High', rating: 4, minSip: '₹500',  exitLoad: '1%' },
    { name: 'HDFC Mid-Cap Opportunities – Direct',       category: 'Mid Cap',    nav: '₹142.30', returns1y: '+22.1%', returns3y: '+24.6%', aum: '₹82,440 Cr', risk: 'High',            rating: 5, minSip: '₹100',  exitLoad: '1%' },
    { name: 'Nippon India Small Cap – Direct',           category: 'Small Cap',  nav: '₹178.55', returns1y: '+28.7%', returns3y: '+31.2%', aum: '₹62,100 Cr', risk: 'Very High',       rating: 5, minSip: '₹100',  exitLoad: '1%' },
    { name: 'Parag Parikh Flexi Cap – Direct',           category: 'Flexi Cap',  nav: '₹92.15',  returns1y: '+18.4%', returns3y: '+19.7%', aum: '₹98,200 Cr', risk: 'Moderately High', rating: 5, minSip: '₹1000', exitLoad: '2%' },
    { name: 'Mirae Asset Large & Midcap – Direct',       category: 'Large Cap',  nav: '₹118.55', returns1y: '+17.2%', returns3y: '+18.4%', aum: '₹39,800 Cr', risk: 'High',            rating: 4, minSip: '₹1000', exitLoad: '1%' },
    { name: 'ICICI Pru Liquid Fund – Direct',            category: 'Liquid',     nav: '₹351.02', returns1y: '+7.1%',  returns3y: '+6.8%',  aum: '₹54,200 Cr', risk: 'Low',             rating: 4, minSip: '₹100',  exitLoad: '0%' },
    { name: 'Axis Small Cap Fund – Direct',              category: 'Small Cap',  nav: '₹95.40',  returns1y: '+24.5%', returns3y: '+28.1%', aum: '₹24,400 Cr', risk: 'Very High',       rating: 4, minSip: '₹500',  exitLoad: '1%' },
    { name: 'Kotak Flexi Cap Fund – Direct',             category: 'Flexi Cap',  nav: '₹74.20',  returns1y: '+15.8%', returns3y: '+16.9%', aum: '₹51,200 Cr', risk: 'Moderately High', rating: 4, minSip: '₹100',  exitLoad: '1%' },
    { name: 'DSP Mid Cap Fund – Direct',                 category: 'Mid Cap',    nav: '₹124.80', returns1y: '+19.4%', returns3y: '+22.3%', aum: '₹28,100 Cr', risk: 'High',            rating: 3, minSip: '₹100',  exitLoad: '1%' },
    { name: 'HDFC Liquid Fund – Direct',                 category: 'Liquid',     nav: '₹4,892',  returns1y: '+7.2%',  returns3y: '+6.9%',  aum: '₹71,800 Cr', risk: 'Low',             rating: 5, minSip: '₹100',  exitLoad: '0%' },
  ];
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Allow CORS from same site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  // Serve from cache if fresh
  if (cache.data && (Date.now() - cache.ts) < CACHE_MS) {
    return res.json(cache.data);
  }

  try {
    const [usdInr, goldData, ipos, fuel, mf] = await Promise.all([
      fetchUSDINR(),
      fetchGoldPrices(),
      loadIPOs(),
      loadFuel(),
      loadMutualFunds(),
    ]);

    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const data = {
      ...goldData,
      usdInr,
      ipos,
      fuel,
      mutualFunds: mf,
      lastUpdated: now,
      fuelLastUpdated: now,
    };

    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
