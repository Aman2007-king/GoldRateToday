const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- PERSISTENT PRICES via prices.json ---
const PRICES_FILE = path.join(__dirname, 'prices.json');

function loadPrices() {
    try {
        return JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
    } catch(e) {
        return { gold24k: 169200, silver: 95000, lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) };
    }
}

function savePrices(gold, silver) {
    const data = {
        gold24k: gold,
        silver: silver,
        lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };
    fs.writeFileSync(PRICES_FILE, JSON.stringify(data, null, 2));
    return data;
}

// --- AUTH MIDDLEWARE ---
const checkAuth = (req, res, next) => {
    if (req.body.password === ADMIN_PASSWORD) next();
    else res.status(401).json({ error: 'Incorrect Password' });
};

// --- PAGE ROUTES ---
const pages = ['bullion','silver','nifty','crude-oil','sensex','currency','fuel',
                'jewellers','mutual-funds','ipo','calculators','banking','compare-gold','policies'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
pages.forEach(p => app.get('/'+p, (req, res) => res.sendFile(path.join(__dirname, 'public', p+'.html'))));
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- API: Get Prices ---
app.get('/api/bullion-prices', (req, res) => {
    const p = loadPrices();
    const g = Number(p.gold24k);
    const s = Number(p.silver);
    res.json({
        gold24k: g.toLocaleString('en-IN'),
        gold22k: Math.round(g * 0.916).toLocaleString('en-IN'),
        gold18k: Math.round(g * 0.75).toLocaleString('en-IN'),
        silver: s.toLocaleString('en-IN'),
        lastUpdated: p.lastUpdated,
        cityPremium: { mumbai: 0, delhi: 150, chennai: 450, kolkata: -220, bangalore: 140, ahmedabad: 50 },
        rawGold: g,
        rawSilver: s
    });
});

// --- API: Update Prices ---
app.post('/api/update-rates', checkAuth, (req, res) => {
    const { gold, silver } = req.body;
    if (!gold || !silver || isNaN(gold) || isNaN(silver)) {
        return res.status(400).json({ error: 'Invalid gold or silver value' });
    }
    const data = savePrices(Number(gold), Number(silver));
    console.log(`Updated! Gold: ${data.gold24k}, Silver: ${data.silver}`);
    res.json({ success: true, message: 'Rates updated successfully!', data });
});

app.listen(PORT, '0.0.0.0', () => console.log(`==> Server running on port ${PORT}`));
EOF
