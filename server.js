

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


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
    const cachedData = myCache.get(cacheKey);
    
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        const response = await axios.get('https://www.goldapi.io/api/XAU/INR', {
            headers: { 'x-access-token': process.env.GOLD_API_KEY }
        });

        // SAFETY CHECK: Only cache if the price is a real number greater than 0
        if (response.data && response.data.price_gram_24k > 0) {
            const formattedData = {
                gold24k: Math.round(response.data.price_gram_24k * 10).toLocaleString('en-IN'),
                silver: "85,000", // You can update this to a live silver call too
                lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                cityPremium: { mumbai: 0, delhi: 150, chennai: 450 },
                rawGold: response.data.price_gram_24k * 10 // For calculator
            };

            myCache.set(cacheKey, formattedData);
            return res.json(formattedData);
        } else {
            throw new Error("Invalid price from API");
        }

    } catch (error) {
        console.error("API Error:", error.message);
        // BACKUP: Send a default price so the user doesn't see 0
        res.json({
            gold24k: "72,000", 
            silver: "85,000",
            lastUpdated: "Service Temporary Unavailable",
            cityPremium: { mumbai: 0, delhi: 150, chennai: 450 },
            rawGold: 72000
        });
    }
});
// You must listen on '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is hooked up and listening on port ${PORT}`);
});






                                                           
























