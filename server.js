const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
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
app.get('/bullion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'bullion.html')));

// --- MANUAL PRICE API ---
app.get('/api/bullion-prices', (req, res) => {
    
    // UPDATE THESE TWO VALUES MANUALLY
    const goldRate = 169200; // 24K Gold Price per 10g
    const silverRate = 95000; // Silver Price per 1kg

    const manualData = {
        gold24k: goldRate.toLocaleString('en-IN'),
        silver: silverRate.toLocaleString('en-IN'),
        lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        cityPremium: { 
            mumbai: 0, 
            delhi: 150, 
            chennai: 450 
        },
        rawGold: goldRate
    };

    res.json(manualData);
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is live. Manual pricing active on port ${PORT}`);
});
