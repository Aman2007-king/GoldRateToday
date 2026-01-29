<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Calculators 2026 | SIP, SWP & Lumpsum</title>
    <style>
        :root { --brand: #0c2461; --accent: #eb2f06; --success: #38ada9; --bg: #f1f2f6; --text: #2f3542; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); margin: 0; color: var(--text); line-height: 1.8; }

        /* Navigation */
        .nav-bar { background: var(--brand); padding: 15px; text-align: center; position: sticky; top: 0; z-index: 1000; }
        .nav-bar a { color: white; margin: 0 15px; text-decoration: none; font-weight: bold; font-size: 0.9rem; }
        .nav-open-btn { background: var(--success); padding: 8px 15px; border-radius: 5px; }

        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        
        /* Ad Placement Styles */
        .ad-banner { background: #fff; border: 1px solid #ddd; margin: 20px 0; text-align: center; padding: 40px; color: #999; border-radius: 8px; }

        /* Calculator Layout */
        .calc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; margin-bottom: 40px; }
        .calc-card { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border-top: 5px solid var(--brand); }
        .calc-card h3 { margin-top: 0; color: var(--brand); border-bottom: 1px solid #eee; padding-bottom: 10px; }
        
        .input-box { margin-bottom: 20px; }
        .input-box label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 0.85rem; }
        .input-box input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }

        .res-display { background: #f0f3ff; padding: 20px; border-radius: 10px; text-align: center; margin-top: 20px; }
        .res-display span { display: block; font-size: 1.8rem; font-weight: 800; color: var(--brand); }

        /* Long Content Area for Ads */
        .article-wrap { background: white; padding: 40px; border-radius: 15px; margin-top: 40px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .article-wrap h2 { color: var(--brand); font-size: 2rem; }
        .content-block { margin-bottom: 50px; }
        
        .cta-box { background: var(--brand); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 40px 0; }
        .cta-btn { background: var(--success); color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; margin-top: 15px; }

        @media (max-width: 768px) { .calc-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>

<nav class="nav-bar">
    <a href="index.html">📈 IPO TRACKER</a>
    <a href="mutual-funds.html">📊 MUTUAL FUNDS</a>
    <a href="calculators.html" style="border-bottom: 2px solid #fff;">🧮 CALCULATORS</a>
    <a href="https://angel-one.onelink.me/Wjgr/oc2kvsya" target="_blank" class="nav-open-btn">OPEN FREE ACCOUNT</a>
</nav>

<div class="container">
    <div class="ad-banner">Header Ad Space (Display/Responsive)</div>

    <h1 style="text-align:center; color: var(--brand); font-size: 2.5rem;">Smart Wealth Calculators 2026</h1>
    <p style="text-align:center; color: #666; margin-bottom: 40px;">Plan your financial freedom with precision tools for Indian Markets.</p>

    <div class="calc-grid">
        <div class="calc-card">
            <h3>SIP Calculator</h3>
            <div class="input-box">
                <label>Monthly Investment (₹)</label>
                <input type="number" id="sipAmt" value="5000" oninput="runSip()">
            </div>
            <div class="input-box">
                <label>Expected Return (% p.a)</label>
                <input type="number" id="sipRate" value="12" oninput="runSip()">
            </div>
            <div class="input-box">
                <label>Time Period (Years)</label>
                <input type="number" id="sipTime" value="10" oninput="runSip()">
            </div>
            <div class="res-display">
                Total Wealth Created:
                <span id="sipOut">₹11,61,695</span>
            </div>
        </div>

        <div class="calc-card">
            <h3>Lumpsum Calculator</h3>
            <div class="input-box">
                <label>One-Time Investment (₹)</label>
                <input type="number" id="lumpAmt" value="100000" oninput="runLump()">
            </div>
            <div class="input-box">
                <label>Expected Return (% p.a)</label>
                <input type="number" id="lumpRate" value="12" oninput="runLump()">
            </div>
            <div class="input-box">
                <label>Time Period (Years)</label>
                <input type="number" id="lumpTime" value="10" oninput="runLump()">
            </div>
            <div class="res-display">
                Total Wealth Created:
                <span id="lumpOut">₹3,10,585</span>
            </div>
        </div>

        <div class="calc-card">
            <h3>SWP Calculator</h3>
            <div class="input-box">
                <label>Total Corpus (₹)</label>
                <input type="number" id="swpCorpus" value="1000000" oninput="runSwp()">
            </div>
            <div class="input-box">
                <label>Monthly Withdrawal (₹)</label>
                <input type="number" id="swpWith" value="10000" oninput="runSwp()">
            </div>
            <div class="input-box">
                <label>Expected Return (% p.a)</label>
                <input type="number" id="swpRate" value="12" oninput="runSwp()">
            </div>
            <div class="res-display">
                Balance after Period:
                <span id="swpOut">₹11,61,695</span>
            </div>
        </div>
    </div>

    <div class="ad-banner">In-Feed Native Ad Space</div>

    <div class="article-wrap">
        <div class="content-block">
            <h2>Understanding the Power of Compounding in 2026</h2>
            <p>Financial freedom is not about how much you earn, but how much you invest. Using a Systematic Investment Plan (SIP) allows you to benefit from Rupee Cost Averaging. In 2026, with market volatility at an all-time high, staying disciplined is the key to creating multi-generational wealth...</p>
            <p>The mathematical formula for SIP is expressed as: $$M = P \times \frac{(1 + i)^n - 1}{i} \times (1 + i)$$ where M is the final amount, P is the monthly contribution, and i is the monthly interest rate. Understanding this formula helps investors realize that the 'Time' factor (n) is more important than the 'Amount' factor (P).</p>
        </div>

        <div class="ad-banner">Article Body Ad Space</div>

        <div class="content-block">
            <h2>Benefits of SWP for Retired Professionals</h2>
            <p>Systematic Withdrawal Plans (SWP) are superior to traditional Fixed Deposits. While an FD gives you taxable interest, an SWP from a Mutual Fund allows for better tax efficiency through Long Term Capital Gains (LTCG) benefits. It acts like a self-made pension plan where your money works as hard as you did during your career...</p>
        </div>

        <div class="cta-box">
            <h2>Ready to start your investment journey?</h2>
            <p>Open your Free Demat Account with Angel One today and start investing in 5000+ Mutual Funds.</p>
            <a href="https://angel-one.onelink.me/Wjgr/oc2kvsya" target="_blank" class="cta-btn">CLICK HERE TO OPEN ACCOUNT</a>
        </div>

        <div class="content-block">
            <h2>Lumpsum Investing vs SIP</h2>
            <p>When you have a large amount of cash from a bonus or inheritance, Lumpsum investing is the way to go. However, the risk of timing the market is always there. Our Lumpsum calculator helps you visualize the future value of your money based on historical market returns of 12% to 15% seen in the Indian Equity markets over the last decade...</p>
        </div>

        <div class="ad-banner">Bottom Anchor Ad Space</div>
    </div>

    <footer style="padding: 40px; text-align: center; color: #888; font-size: 0.8rem;">
        Disclaimer: Mutual Fund investments are subject to market risks. Calculations are based on projected returns and are not a guarantee of future performance. We may earn a commission for referrals via Angel One.
    </footer>
</div>

<script>
    function formatInr(num) {
        return "₹" + Math.round(num).toLocaleString('en-IN');
    }

    function runSip() {
        let p = parseFloat(document.getElementById('sipAmt').value);
        let r = parseFloat(document.getElementById('sipRate').value) / 12 / 100;
        let n = parseFloat(document.getElementById('sipTime').value) * 12;
        let res = p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        document.getElementById('sipOut').innerText = formatInr(res);
    }

    function runLump() {
        let p = parseFloat(document.getElementById('lumpAmt').value);
        let r = parseFloat(document.getElementById('lumpRate').value) / 100;
        let n = parseFloat(document.getElementById('lumpTime').value);
        let res = p * Math.pow(1 + r, n);
        document.getElementById('lumpOut').innerText = formatInr(res);
    }

    function runSwp() {
        let p = parseFloat(document.getElementById('swpCorpus').value);
        let w = parseFloat(document.getElementById('swpWith').value);
        let r = parseFloat(document.getElementById('swpRate').value) / 12 / 100;
        let n = 10 * 12; // Standard 10 years or link to an input
        let res = p * Math.pow(1 + r, n) - w * ((Math.pow(1 + r, n) - 1) / r);
        document.getElementById('swpOut').innerText = formatInr(Math.max(0, res));
    }

    // Initial run
    window.onload = function() { runSip(); runLump(); runSwp(); };
</script>

</body>
</html>
