const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// 2. LIVE MARKET DATA API (Mock Data for Gold, Silver, Sensex, etc.)
// In a production app, you would connect this to a real API like Alpha Vantage or Yahoo Finance
app.get('/api/market-data', (req, res) => {
    res.json({
        indices: {
            sensex: "72,430.20",
            nifty50: "21,950.45",
            nifty_change: "+0.85%"
        },
        commodities: {
            gold_24k: "62,450",
            silver: "74,200",
            crude_oil: "6,450"
        },
        fuel: {
            petrol: "106.31",
            diesel: "94.27"
        },
        currency: {
            usd_inr: "83.12",
            eur_inr: "90.45"
        },
        last_updated: new Date().toLocaleString()
    });
});

// 3. PAGE ROUTES
// Home (IPO Tracker & Sensex/Nifty Overview)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mutual Funds
app.get('/mutual-funds', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mutual-funds.html'));
});

// Calculators (SIP, SWP, Lumpsum)
app.get('/calculators', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calculators.html'));
});

// Gold, Silver & Jewellery Prices
app.get('/bullion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bullion.html'));
});

// Fuel & Currency
app.get('/rates', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rates.html'));
});

// 4. 404 REDIRECT (Keep users on site for Ads)
app.get('*', (req, res) => {
    res.redirect('/');
});

// 5. SERVER START
app.listen(PORT, () => {
    console.log(`
    ===================================================
    💰 INDIA WEALTH HUB - FULL SUITE ACTIVE
    ===================================================
    🚀 Server: http://localhost:${PORT}
    ---------------------------------------------------
    📊 Stocks:    Sensex, Nifty 50
    🟡 Bullion:   Gold, Silver, Jewellers
    🛢️ Energy:    Crude Oil, Fuel (Petrol/Diesel)
    💵 Forex:     Currency Exchange
    📈 Invest:    Mutual Funds, IPOs
    🧮 Tools:     SIP/SWP Calculators
    ===================================================
    `);
});
