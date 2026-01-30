

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
app.get('/api/bullion-prices', async (req, res) => {
    // Check cache first
    const cached = myCache.get("market_data");
    if (cached) return res.json(cached);

    try {
        const apiKey = process.env.GOLD_API_KEY;
        if (!apiKey) throw new Error("API Key is missing in Render Settings");

        const [gold, silver] = await Promise.all([
            axios.get('https://www.goldapi.io/api/XAU/INR', { headers: {'x-access-token': apiKey} }),
            axios.get('https://www.goldapi.io/api/XAG/INR', { headers: {'x-access-token': apiKey} })
        ]);

        // This structure matches your bullion.html perfectly
        const responseData = {
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            gold24k: (gold.data.price_gram_24k * 10).toFixed(0),
            gold22k: (gold.data.price_gram_22k * 10).toFixed(0),
            gold18k: (gold.data.price_gram_18k * 10).toFixed(0),
            silver: (silver.data.price_gram * 1000).toFixed(0),
            cityPremium: { "mumbai": 0, "delhi": 150, "chennai": 500, "kolkata": -220, "bangalore": 140 }
        };

        myCache.set("market_data", responseData);
        res.json(responseData);
    } catch (e) {
        console.error("Server API Error:", e.message);
        res.status(500).json({ error: "Failed to fetch live rates" });
    }
});

        const gold = axios.get('https://www.goldapi.io/api/XAU/INR', { headers: {'x-access-token': apiKey} });
        const silver = axios.get('https://www.goldapi.io/api/XAG/INR', { headers: {'x-access-token': apiKey} });

        res.json({
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            gold24k: (gold.data.price_gram_24k * 10).toFixed(0),
            gold22k: (gold.data.price_gram_24k * 0.916 * 10).toFixed(0),
            gold18k: (gold.data.price_gram_24k * 0.75 * 10).toFixed(0),
            silver: (silver.data.price_gram * 1000).toFixed(0),
            cityPremium: { "mumbai": 0, "delhi": 150, "chennai": 500, "kolkata": -220, "bangalore": 140 }
        });
    } catch (e) {
        res.status(500).json({ error: "API connection failed" });
    }
});
       
// Use Render's port or default to 3000 for local testing


// You must listen on '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==> Server is hooked up and listening on port ${PORT}`);
});






                                                           













