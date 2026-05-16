const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to read form data and serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURATION ---
// This password will be checked when you click "Update"
// On Render, set an Environment Variable ADMIN_PASSWORD to hide this
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234'; 

// --- GLOBAL VARIABLES (Prices saved in server memory) ---
let currentGoldPrice = 169200; 
let currentSilverPrice = 95000;
let lastUpdateDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

// --- PASSWORD PROTECTION MIDDLEWARE ---
const checkAuth = (req, res, next) => {
    if (req.body.password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).send('<h1>Incorrect Password</h1><a href="/admin-panel">Try Again</a>');
    }
};

// --- HTML PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/bullion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'bullion.html')));
app.get('/silver', (req, res) => res.sendFile(path.join(__dirname, 'public', 'silver.html')));
app.get('/nifty', (req, res) => res.sendFile(path.join(__dirname, 'public', 'nifty.html')));
app.get('/crude-oil', (req, res) => res.sendFile(path.join(__dirname, 'public', 'crude-oil.html')));
app.get('/sensex', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sensex.html')));
app.get('/currency', (req, res) => res.sendFile(path.join(__dirname, 'public', 'currency.html')));
app.get('/fuel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fuel.html')));
app.get('/jewellers', (req, res) => res.sendFile(path.join(__dirname, 'public', 'jewellers.html')));
app.get('/mutual-funds', (req, res) => res.sendFile(path.join(__dirname, 'public', 'mutual-funds.html')));
app.get('/ipo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ipo.html')));
app.get('/calculators', (req, res) => res.sendFile(path.join(__dirname, 'public', 'calculators.html')));
app.get('/banking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'banking.html')));

// --- ADMIN PANEL ROUTE ---
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- API: Get Prices (Used by your website cards) ---
app.get('/api/bullion-prices', (req, res) => {
    res.json({
        gold24k: currentGoldPrice.toLocaleString('en-IN'),
        silver: currentSilverPrice.toLocaleString('en-IN'),
        lastUpdated: lastUpdateDate,
        cityPremium: { mumbai: 0, delhi: 150, chennai: 450 },
        rawGold: currentGoldPrice
    });
});

// --- API: Update Prices (Used by Admin Panel) ---
app.post('/api/update-rates', checkAuth, (req, res) => {
    const { gold, silver } = req.body;
    
    currentGoldPrice = Number(gold);
    currentSilverPrice = Number(silver);
    lastUpdateDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    console.log(`Updated! Gold: ${currentGoldPrice}, Silver: ${currentSilverPrice}`);
    res.send('<h1>Rates Updated Successfully!</h1><a href="/admin-panel">Back to Admin</a>');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server running on port ${PORT}`);
});
