//-----
// * GoldRateIndia — Smart Server
// * Strategy:
 /*  - Gold & Silver: fetched 2× daily (10:00 AM + 6:00 PM IST) from free APIs
 *  - Forex: fetched daily from frankfurter.app (free, unlimited)
 *  - IPO / Mutual Funds / Fuel: stored in data.json (you update manually or via admin)
 *  - Markets (Nifty/Sensex/Crude): live TradingView widgets on frontend (free)
 *  - Admin panel: manual override anytime
 */

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const https    = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'admin123';
const PRICES_FILE = path.join(__dirname, 'prices.json');
const DATA_FILE   = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', {
  setHeaders(res, fp) { if (fp.endsWith('.html')) res.setHeader('Cache-Control','no-cache'); }
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function getIST() {
  return new Date().toLocaleString('en-IN',{
    timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:true
  });
}
function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch { return fallback; }
}
function save(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data,null,2)); }
  catch(e) { console.error('Save error:',e.message); }
}
function fetchJSON(url) {
  return new Promise((res,rej)=>{
    const req = https.get(url,{headers:{'User-Agent':'GoldRateIndia/2.0'}},r=>{
      let b=''; r.on('data',d=>b+=d); r.on('end',()=>{ try{res(JSON.parse(b))}catch{res(null)}});
    });
    req.setTimeout(9000,()=>{req.destroy();rej(new Error('timeout'))});
    req.on('error',rej);
  });
}

// ── In-memory cache ───────────────────────────────────────────────────────────
let CACHE = { prices: load(PRICES_FILE, {gold24k:169200,silver:95000,lastUpdated:getIST(),source:'startup'}), forex: null };

// ── Gold/Silver Fetch (free: goldprice.org + frankfurter) ────────────────────
async function fetchGoldSilver() {
  console.log(`[${getIST()}] Fetching gold/silver prices...`);
  try {
    // goldprice.org is a free, no-key endpoint used by many sites
    const [xau, forex] = await Promise.all([
      fetchJSON('https://data-asg.goldprice.org/dbXRates/USD'),
      fetchJSON('https://api.frankfurter.app/latest?from=USD&to=INR')
    ]);
    if (!xau?.items?.[0] || !forex?.rates?.INR) throw new Error('Bad response');
    const usdInr     = forex.rates.INR;
    const xauUsd     = xau.items[0].xauPrice;  // per troy oz
    const xagUsd     = xau.items[0].xagPrice;
    const goldPerG   = (xauUsd * usdInr) / 31.1035;
    const silverPerG = (xagUsd * usdInr) / 31.1035;
    const gold24k    = Math.round(goldPerG * 10);
    const silver     = Math.round(silverPerG * 1000);

    // Append to history
    const stored = load(PRICES_FILE, {});
    const history = stored.history || [];
    const today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
    const existingIdx = history.findIndex(h=>h.date===today);
    if (existingIdx>=0) history[existingIdx] = {date:today,gold24k,silver};
    else history.unshift({date:today,gold24k,silver});
    const trimmed = history.slice(0,30);

    const data = {gold24k, silver, lastUpdated:getIST(), source:'goldprice.org+frankfurter', history:trimmed};
    save(PRICES_FILE, data);
    CACHE.prices = data;
    console.log(`[${getIST()}] ✅ Gold: ₹${gold24k}/10g  Silver: ₹${silver}/kg`);
  } catch(e) {
    console.warn(`[${getIST()}] ⚠️  Gold fetch failed: ${e.message} — using saved prices`);
    CACHE.prices = load(PRICES_FILE, CACHE.prices);
  }
}

// ── Forex Fetch (free, unlimited) ────────────────────────────────────────────
async function fetchForex() {
  try {
    const d = await fetchJSON('https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP,AED,SGD,JPY,AUD,CHF,CAD');
    if (d?.rates) { CACHE.forex = d.rates; console.log(`[${getIST()}] ✅ Forex updated`); }
  } catch(e) { console.warn('Forex fetch failed:', e.message); }
}

// ── Scheduled: 2× daily — 10:00 AM IST and 6:00 PM IST ──────────────────────
function scheduleIST(hourIST, minuteIST, fn) {
  function runNext() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
    let next = new Date(ist);
    next.setHours(hourIST, minuteIST, 0, 0);
    if (ist >= next) next.setDate(next.getDate()+1);
    const msUntil = next - ist;
    setTimeout(()=>{ fn(); setInterval(fn, 24*60*60*1000); }, msUntil);
    console.log(`⏰ Next ${hourIST}:${String(minuteIST).padStart(2,'0')} IST fetch in ${Math.round(msUntil/60000)} min`);
  }
  runNext();
}

// Run immediately on boot, then schedule
fetchGoldSilver().then(fetchForex);
scheduleIST(10, 0, ()=>fetchGoldSilver().then(fetchForex));
scheduleIST(18, 0, fetchGoldSilver);

// ── API: /api/prices ─────────────────────────────────────────────────────────
app.get('/api/prices', (req,res)=>{
  const p = CACHE.prices || load(PRICES_FILE,{gold24k:169200,silver:95000});
  const g = Number(p.gold24k), s = Number(p.silver);
  const PREMIUMS = {
    mumbai:0,delhi:150,chennai:450,kolkata:-220,bangalore:140,ahmedabad:50,
    hyderabad:120,pune:30,jaipur:160,surat:60,lucknow:80,patna:-100,
    kochi:200,nagpur:20,coimbatore:380,chandigarh:130,bhopal:40
  };
  const cityRates={};
  Object.entries(PREMIUMS).forEach(([city,adj])=>{
    cityRates[city]={
      gold24k:g+adj, gold22k:Math.round((g+adj)*0.916),
      gold18k:Math.round((g+adj)*0.75),
      perGram24k:Math.round((g+adj)/10), perGram22k:Math.round((g+adj)*0.916/10)
    };
  });
  res.setHeader('Cache-Control','no-cache');
  res.json({
    gold24k:g, gold22k:Math.round(g*0.916), gold18k:Math.round(g*0.75), gold14k:Math.round(g*0.583),
    silver:s, lastUpdated:p.lastUpdated, source:p.source||'saved',
    cityRates, history:(p.history||[]).slice(0,10)
  });
});

// ── API: /api/forex ──────────────────────────────────────────────────────────
app.get('/api/forex',(req,res)=>{
  res.json(CACHE.forex||{USD:0.012,EUR:0.011,GBP:0.0095,AED:0.044,SGD:0.016,JPY:1.66,AUD:0.018});
});

// ── API: /api/data — IPO, mutual funds, fuel (served from data.json) ─────────
app.get('/api/data',(req,res)=>{
  const d = load(DATA_FILE, getDefaultData());
  res.setHeader('Cache-Control','public, max-age=3600');
  res.json(d);
});

// ── API: Admin — update gold/silver manually ─────────────────────────────────
app.post('/api/update-prices',(req,res)=>{
  const {password,gold,silver} = req.body;
  if (password!==ADMIN_PASS) return res.status(401).json({success:false,error:'Wrong password'});
  if (!gold||!silver||isNaN(gold)||isNaN(silver)) return res.status(400).json({success:false,error:'Invalid values'});
  const stored = load(PRICES_FILE,{});
  const today  = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
  const history= stored.history||[];
  history.unshift({date:today,gold24k:Number(gold),silver:Number(silver)});
  const data = {gold24k:Number(gold),silver:Number(silver),lastUpdated:getIST(),source:'admin',history:history.slice(0,30)};
  save(PRICES_FILE,data);
  CACHE.prices = data;
  res.json({success:true,message:'✅ Rates updated!',data});
});

// ── API: Admin — update data.json (IPO, fuel, mutual funds) ──────────────────
app.post('/api/update-data',(req,res)=>{
  const {password,...updates} = req.body;
  if (password!==ADMIN_PASS) return res.status(401).json({success:false,error:'Wrong password'});
  const existing = load(DATA_FILE,getDefaultData());
  const merged = {...existing,...updates};
  save(DATA_FILE,merged);
  res.json({success:true,message:'Data updated!'});
});

// ── API: Force refresh ────────────────────────────────────────────────────────
app.post('/api/refresh',(req,res)=>{
  const {password}=req.body;
  if(password!==ADMIN_PASS) return res.status(401).json({success:false,error:'Wrong password'});
  fetchGoldSilver().then(()=>res.json({success:true,prices:CACHE.prices}));
});

// ── API: Status ───────────────────────────────────────────────────────────────
app.get('/api/status',(req,res)=>res.json({ok:true,prices:CACHE.prices?.lastUpdated,source:CACHE.prices?.source}));

// ── Page Routes ───────────────────────────────────────────────────────────────
const PAGES=['silver','bullion','nifty','sensex','crude-oil','currency','fuel',
             'jewellers','mutual-funds','ipo','calculators','banking','compare-gold','policies'];
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
PAGES.forEach(p=>app.get('/'+p,(req,res)=>res.sendFile(path.join(__dirname,'public',p+'.html'))));
app.get('/admin-panel',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.use((req,res)=>res.redirect('/'));

app.listen(PORT,()=>{
  console.log(`🥇 GoldRateIndia → http://localhost:${PORT}`);
  console.log(`🔑 Admin: ${ADMIN_PASS} | 🔄 Auto-fetch: 10AM & 6PM IST`);
});

// ── Default data (IPO, mutual funds, fuel) ────────────────────────────────────
function getDefaultData() {
  return {
    lastUpdated: getIST(),
    ipos: [
      {name:"Ather Energy",price:"₹304–321",open:"2 Jun 2026",close:"4 Jun 2026",status:"upcoming",type:"Mainboard",lot:46,link:"https://angel-one.onelink.me/Wjgr/oc2kvsya"},
      {name:"Shadowfax Tech",price:"₹195–205",open:"26 May 2026",close:"28 May 2026",status:"upcoming",type:"Mainboard",lot:73,link:"https://angel-one.onelink.me/Wjgr/oc2kvsya"},
      {name:"Indira IVF",price:"₹490–516",open:"19 May 2026",close:"21 May 2026",status:"open",type:"Mainboard",lot:29,link:"https://angel-one.onelink.me/Wjgr/oc2kvsya"},
      {name:"Solinas Integrity",price:"₹85–90",open:"14 May 2026",close:"16 May 2026",status:"closed",type:"SME",lot:1600,link:"https://angel-one.onelink.me/Wjgr/oc2kvsya"},
      {name:"Unimech Aerospace",price:"₹745–785",open:"5 May 2026",close:"7 May 2026",status:"listed",gmp:"+₹140 (17.8%)",status2:"Listed at premium",link:"https://angel-one.onelink.me/Wjgr/oc2kvsya"}
    ],
    mutualFunds: [
      {name:"Mirae Asset Large Cap Fund",category:"Large Cap",returns1y:"16.2%",returns3y:"14.8%",risk:"Low",aum:"₹37,200 Cr",rating:5},
      {name:"Parag Parikh Flexi Cap Fund",category:"Flexi Cap",returns1y:"22.4%",returns3y:"19.1%",risk:"Moderate",aum:"₹72,400 Cr",rating:5},
      {name:"Axis Bluechip Fund",category:"Large Cap",returns1y:"14.6%",returns3y:"13.2%",risk:"Low",aum:"₹41,500 Cr",rating:4},
      {name:"SBI Small Cap Fund",category:"Small Cap",returns1y:"28.7%",returns3y:"24.3%",risk:"High",aum:"₹25,600 Cr",rating:4},
      {name:"HDFC Mid-Cap Opp Fund",category:"Mid Cap",returns1y:"24.1%",returns3y:"21.6%",risk:"Moderately High",aum:"₹61,200 Cr",rating:5},
      {name:"Nippon India Liquid Fund",category:"Liquid",returns1y:"7.1%",returns3y:"6.8%",risk:"Very Low",aum:"₹28,900 Cr",rating:4},
      {name:"Kotak Emerging Equity Fund",category:"Mid Cap",returns1y:"21.8%",returns3y:"19.4%",risk:"Moderately High",aum:"₹42,100 Cr",rating:4},
      {name:"Quant Active Fund",category:"Multi Cap",returns1y:"31.2%",returns3y:"26.8%",risk:"High",aum:"₹8,900 Cr",rating:5}
    ],
    fuel: [
      {city:"Mumbai",petrol:106.31,diesel:94.27},{city:"Delhi",petrol:96.72,diesel:89.62},
      {city:"Bangalore",petrol:101.94,diesel:87.89},{city:"Chennai",petrol:102.63,diesel:94.24},
      {city:"Hyderabad",petrol:109.66,diesel:97.82},{city:"Kolkata",petrol:106.03,diesel:92.76},
      {city:"Ahmedabad",petrol:96.63,diesel:92.38},{city:"Pune",petrol:105.97,diesel:93.62},
      {city:"Jaipur",petrol:108.48,diesel:93.72},{city:"Lucknow",petrol:96.57,diesel:89.76},
      {city:"Bhopal",petrol:108.65,diesel:93.90},{city:"Patna",petrol:107.24,diesel:94.04},
      {city:"Chandigarh",petrol:96.20,diesel:84.95},{city:"Kochi",petrol:107.22,diesel:95.17},
      {city:"Nagpur",petrol:106.28,diesel:93.60},{city:"Indore",petrol:108.50,diesel:93.80},
      {city:"Surat",petrol:96.48,diesel:92.20},{city:"Visakhapatnam",petrol:111.30,diesel:99.19}
    ],
    fuelLastUpdated: "17 May 2026"
  };
}
