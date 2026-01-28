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

// --- API: Get data for all assets ---
app.get('/api/market-data', async (req, res) => {
    const cached = myCache.get("market_data");
    if (cached) return res.json(cached);

    try {
        const apiKey = process.env.GOLD_API_KEY;
        // Fetch Gold
        const gold = await axios.get('https://www.goldapi.io/api/XAU/INR', { headers: {'x-access-token': apiKey} });
        // Fetch Silver
        const silver = await axios.get('https://www.goldapi.io/api/XAG/INR', { headers: {'x-access-token': apiKey} });

        const data = {
            update_time: new Date().toLocaleString('en-IN'),
            gold: { k24: gold.data.price_gram_24k, k22: (gold.data.price_gram_24k * 0.916).toFixed(2) },
            silver: (silver.data.price_gram * 1000).toFixed(2),
            nifty: "21,750.40", // Placeholder: You'll need a stock API key for live Nifty
            crude: "6,240.00"   // Placeholder: You'll need a commodity API for live Crude
        };

        myCache.set("market_data", data);
        res.json(data);
    } catch (e) { res.status(500).send("API Error"); }
});

app.listen(PORT, () => console.log(`Site live on port ${PORT}`));
