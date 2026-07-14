<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Price Admin Panel</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; padding: 50px; background: #f4f4f4; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 340px; }
        label { font-size: .85em; color: #555; margin-top: 12px; display: block; }
        input { display: block; width: 100%; margin: 6px 0 10px; padding: 10px; font-size: 1em; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        .hint { font-size: .75em; color: #888; margin: -6px 0 8px; }
        button { background: #d4af37; color: white; border: none; padding: 12px 20px; cursor: pointer; width: 100%; font-weight: bold; margin-top: 14px; border-radius: 4px; font-size: 1em; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        #msg { margin-top: 14px; padding: 10px; border-radius: 4px; font-size: .9em; display: none; }
        #msg.ok { background: #e6f7ec; color: #0a7a3d; display: block; }
        #msg.err { background: #fdeaea; color: #b3261e; display: block; }
        #current { font-size: .8em; color: #666; margin-bottom: 4px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Update Rates</h2>
        <div id="current">Current: loading…</div>

        <form id="rate-form">
            <label>Admin Password</label>
            <input type="password" name="password" required>

            <hr>

            <label>Gold Rate — 24K (per 10g)</label>
            <input type="number" name="gold" id="f-gold" placeholder="169200" required>

            <label>Gold Rate — 22K (per 10g)</label>
            <input type="number" name="gold22k" id="f-gold22k" placeholder="e.g. 154987">
            <div class="hint">Optional. Leave blank to auto-calculate as 91.6% of 24K.</div>

            <label>Silver Rate (per 1kg)</label>
            <input type="number" name="silver" id="f-silver" placeholder="95000" required>

            <button type="submit" id="submit-btn">Update Website</button>
        </form>

        <div id="msg"></div>
    </div>

    <script>
    const msgEl = document.getElementById('msg');
    const btn = document.getElementById('submit-btn');

    function showMsg(text, ok) {
      msgEl.textContent = text;
      msgEl.className = ok ? 'ok' : 'err';
    }

    // Prefill current values so the admin can see what's live before changing anything.
    async function loadCurrent() {
      try {
        const res = await fetch('/api/prices');
        const d = await res.json();
        document.getElementById('current').textContent =
          `Current: 24K ₹${d.gold24k} · 22K ₹${d.gold22k}${d.gold22kIsCustom ? ' (manual)' : ' (auto 91.6%)'} · Silver ₹${d.silver} (as of ${d.lastUpdated || 'unknown'})`;
        document.getElementById('f-gold').value = d.gold24k || '';
        document.getElementById('f-gold22k').value = d.gold22kIsCustom ? d.gold22k : '';
        document.getElementById('f-silver').value = d.silver || '';
      } catch (e) {
        document.getElementById('current').textContent = 'Current: unable to load (see console)';
        console.error('Failed to load current prices:', e);
      }
    }
    loadCurrent();

    document.getElementById('rate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Updating…';
      msgEl.className = '';

      const form = e.target;
      const body = new URLSearchParams({
        password: form.password.value,
        gold: form.gold.value,
        silver: form.silver.value,
        gold22k: form.gold22k.value // may be empty string — server treats that as "auto-calculate"
      });

      try {
        const res = await fetch('/api/update-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        const result = await res.json();
        if (res.ok && result.success) {
          showMsg(result.message || 'Updated successfully.', true);
          form.password.value = '';
          loadCurrent();
        } else {
          showMsg(result.error || 'Update failed.', false);
        }
      } catch (err) {
        showMsg('Network error — could not reach the server.', false);
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Website';
      }
    });
    </script>
</body>
</html>
