

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const myCache = new NodeCache({ stdTTL: 3600 });

app.use(express.static('public'));

// --- ROUTES: Tell the server where the pages are ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/silver', (req, res) => res.sendFile(path.join(__dirname, 'public', 'silver.html')));
app.get('/nifty', (req, res) => res.sendFile(path.join(__dirname, 'public', 'nifty.html')));
app.get('/crude-oil', (req, res) => res.sendFile(path.join(__dirname, 'public', 'crude-oil.html')));
// Add these above app.listen()
app.get('/sensex', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sensex.html')));
app.get('/currency', (req, res) => res.sendFile(path.join(__dirname, 'public', 'currency.html')));
app.get('/fuel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fuel.html')));
// Add this to your server.js file
app.get('/jewellers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jewellers.html'));
});
app.get('/mutual-funds', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mutual-funds.html'));
});
app.get('/ipo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ipo.html'));
});
app.get('/calculators', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calculators.html'));
});
// Banking & Loans Route
app.get('/banking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'banking.html'));
});
app.get('/bullion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bullion.html'));
});

// --- API: Get data for all assets ---
// Ensure 'async' is present here ⬇️

// Use Render's port or default to 3000 for local testing
app.get('/api/bullion-prices', async (req, res) => {
    try {
        const apiKey = process.env.GOLD_API_KEY;
        
        const [goldRes, silverRes] = await Promise.all([
            axios.get('https://www.goldapi.io/api/XAU/INR', { headers: {'x-access-token': apiKey} }),
            axios.get('https://www.goldapi.io/api/XAG/INR', { headers: {'x-access-token': apiKey} })
        ]);

        // SAFETY: Check if the silver price exists in any common format
        const rawSilverGram = silverRes.data.price_gram || (silverRes.data.price / 31.1035) || 82; 
        const silverPriceKg = Math.round(rawSilverGram * 1000);

        const pricePerGram24k = goldRes.data.price_gram_24k || (goldRes.data.price / 31.1035);

        const responseData = {
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            // Format for Display
            gold24k: Math.round(pricePerGram24k * 10).toLocaleString('en-IN'),
            silver: silverPriceKg.toLocaleString('en-IN'),
            // Raw numbers for Calculator (No Commas)
            rawGold24: pricePerGram24k * 10,
            rawSilver: silverPriceKg,
            cityPremium: { "mumbai": 0, "delhi": 150, "chennai": 500, "kolkata": -220, "bangalore": 140 }
        };

        res.json(responseData);
    } catch (e) {
        console.error("API Error:", e.message);
        res.status(500).json({ error: "API connection failed" });
    }
});
// You must listen on '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is hooked up and listening on port ${PORT}`);
});






                                                           




















