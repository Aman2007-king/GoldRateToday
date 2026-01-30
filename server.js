

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
const NodeCache = require("node-cache");
// stdTTL is the "Time to Live" in seconds. 86400 seconds = 24 hours.
const myCache = new NodeCache({ stdTTL: 86400 }); 

app.get('/api/bullion-prices', async (req, res) => {
    const cacheKey = "daily_gold_price";
    
    // 1. Check if we already have the price saved
    const cachedData = myCache.get(cacheKey);
    
    if (cachedData) {
        console.log("Serving from Cache - API not called");
        return res.json(cachedData);
    }

    // 2. If no cache, call the actual API
    try {
        console.log("Cache expired or empty. Calling External API...");
        const response = await fetch('https://www.goldapi.io/api/XAU/INR', {
            headers: { "x-access-token": "YOUR_API_KEY" }
        });
        const apiData = await response.json();

        // Format the data as you currently do
        const formattedData = {
            gold24k: apiData.price_gram_24k * 10,
            silver: 85000, // Example static or from other API
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            cityPremium: { mumbai: 0, delhi: 150, chennai: 450 }
        };

        // 3. Save this result in the cache for the next 24 hours
        myCache.set(cacheKey, formattedData);

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch data" });
    }
});
// You must listen on '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is hooked up and listening on port ${PORT}`);
});






                                                           





















