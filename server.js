const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
const PRICES_FILE = path.join(__dirname, 'prices.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cache headers for static assets
app.use(express.static('public', { maxAge: '1h' }));

function loadPrices() {
  try { return JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8')); }
  catch(e) {
    const def = { gold24k: 169200, silver: 95000, lastUpdated: getIST() };
    fs.writeFileSync(PRICES_FILE, JSON.stringify(def, null, 2));
    return def;
  }
}

function getIST() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

// Page routes
const pages = ['silver','bullion','nifty','sensex','crude-oil','currency','fuel','jewellers','mutual-funds','ipo','calculators','banking','compare-gold','policies'];
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
pages.forEach(p => app.get('/'+p, (req,res) => res.sendFile(path.join(__dirname,'public',p+'.html'))));
app.get('/admin-panel', (req,res) => res.sendFile(path.join(__dirname,'public','admin.html')));

// API: Get all prices (single endpoint used by all pages)
app.get('/api/prices', (req,res) => {
  const p = loadPrices();
  const g = Number(p.gold24k);
  const s = Number(p.silver);
  const cities = { mumbai:0, delhi:150, chennai:450, kolkata:-220, bangalore:140, ahmedabad:50, hyderabad:120, pune:30, jaipur:160, surat:60 };
  res.setHeader('Cache-Control','no-cache');
  res.json({
    gold24k: g, gold22k: Math.round(g*0.916), gold18k: Math.round(g*0.75), gold14k: Math.round(g*0.583),
    silver: s, lastUpdated: p.lastUpdated,
    cityPremium: cities,
    history: buildHistory(g, s)
  });
});

function buildHistory(g, s) {
  const deltas = [0,-220,180,-140,350,-100,240];
  return deltas.map((d,i) => {
    const dt = new Date(); dt.setDate(dt.getDate()-i);
    return { date: dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}), gold24k: g+d, silver: s+(d*2) };
  });
}

// API: Update prices (admin)
app.post('/api/update-prices', (req,res) => {
  const { password, gold, silver } = req.body;
  if(password !== ADMIN_PASS) return res.status(401).json({success:false, error:'Wrong password'});
  if(!gold || !silver || isNaN(gold) || isNaN(silver)) return res.status(400).json({success:false,error:'Invalid values'});
  const data = { gold24k: Number(gold), silver: Number(silver), lastUpdated: getIST() };
  fs.writeFileSync(PRICES_FILE, JSON.stringify(data, null,2));
  res.json({success:true, message:'Rates updated successfully!', data});
});

app.listen(PORT, () => console.log(`🚀 GoldRateIndia running at http://localhost:${PORT}`));
