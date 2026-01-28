const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
// Render/Vercel will provide the PORT automatically
const PORT = process.env.PORT || 3000; 

// Cache for 1 hour to save API credits
const myCache = new NodeCache({ stdTTL: 3600 });

app.use(express.static('public'));

app.get('/api/market-data', async (req, res) => {
    const cacheKey = "financial_data";
    const cachedData = myCache.get(cacheKey);
    
    if (cachedData) return res.json(cachedData);

    try {
        // Use environment variable for the API key
        const apiKey = process.env.GOLD_API_KEY; 
        
        const goldRes = await axios.get('https://www.goldapi.io/api/XAU/INR', {
            headers: { 'x-access-token': apiKey }
        });
        const silverRes = await axios.get('https://www.goldapi.io/api/XAG/INR', {
            headers: { 'x-access-token': apiKey }
        });

        const gPrice = goldRes.data.price_gram_24k;
        const sPrice = silverRes.data.price_gram;

        const fullData = {
            update_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            gold: {
                k24: gPrice.toFixed(2),
                k22: (gPrice * 0.916).toFixed(2),
                k18: (gPrice * 0.75).toFixed(2)
            },
            silver: {
                per_kg: (sPrice * 1000).toFixed(2)
            },
            cities: [
                { name: "Mumbai", p24: gPrice.toFixed(2), p22: (gPrice * 0.916).toFixed(2) },
                { name: "Delhi", p24: (gPrice + 12).toFixed(2), p22: ((gPrice + 12) * 0.916).toFixed(2) },
                { name: "Chennai", p24: (gPrice + 20).toFixed(2), p22: ((gPrice + 20) * 0.916).toFixed(2) },
                { name: "Bengaluru", p24: (gPrice + 5).toFixed(2), p22: ((gPrice + 5) * 0.916).toFixed(2) }
            ]
        };

        myCache.set(cacheKey, fullData);
        res.json(fullData);
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: "Unable to fetch live rates" });
    }
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));