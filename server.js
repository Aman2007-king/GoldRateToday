

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

        // DATA CONVERSION LOGIC
        // GoldAPI provides price per 1 gram. We want 10 grams for the display.
        const pricePerGram24k = goldRes.data.price_gram_24k;
        const pricePerGram22k = goldRes.data.price_gram_22k;
        const pricePerGram18k = goldRes.data.price_gram_18k;

        // GoldAPI provides Silver per gram or ounce. 
        // We multiply the gram price by 1000 to get the 1 KG price for India.
        const silverPriceKg = silverRes.data.price_gram * 1000;

        const responseData = {
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            gold24k: Math.round(pricePerGram24k * 10).toLocaleString('en-IN'), 
            gold22k: Math.round(pricePerGram22k * 10).toLocaleString('en-IN'),
            gold18k: Math.round(pricePerGram18k * 10).toLocaleString('en-IN'),
            silver: Math.round(silverPriceKg).toLocaleString('en-IN'),
            // raw numbers for the calculator to use without commas
            rawGold24: pricePerGram24k * 10,
            rawSilver: silverPriceKg,
            cityPremium: { "mumbai": 0, "delhi": 150, "chennai": 500, "kolkata": -220, "bangalore": 140 }
        };

        res.json(responseData);
    } catch (e) {
        console.error("API Error:", e.message);
        res.status(500).json({ error: "Failed to fetch rates" });
    }
});

// You must listen on '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is hooked up and listening on port ${PORT}`);
});






                                                           



















