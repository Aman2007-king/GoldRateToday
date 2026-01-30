const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser to read form data
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- GLOBAL PRICE VARIABLES ---
let currentGoldPrice = 169200; 
let currentSilverPrice = 95000;

// --- PAGE ROUTES ---
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

// --- ADMIN PAGE ROUTE ---
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- API: Returns prices to your website ---
app.get('/api/bullion-prices', (req, res) => {
    res.json({
        gold24k: currentGoldPrice.toLocaleString('en-IN'),
        silver: currentSilverPrice.toLocaleString('en-IN'),
        lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        cityPremium: { mumbai: 0, delhi: 150, chennai: 450 },
        rawGold: currentGoldPrice
    });
});

// --- API: Receives updates from Admin Panel ---
app.post('/api/update-rates', (req, res) => {
    const { gold, silver } = req.body;
    if (gold) currentGoldPrice = Number(gold);
    if (silver) currentSilverPrice = Number(silver);
    
    console.log(`Updated Rates -> Gold: ${currentGoldPrice}, Silver: ${currentSilverPrice}`);
    // Redirect back to admin page after update
    res.send('<h1>Success! Rates updated.</h1><a href="/admin-panel">Go Back</a>');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server live on port ${PORT}`);
});
