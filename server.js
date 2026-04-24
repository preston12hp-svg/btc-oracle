const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// AI Analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    // Log the full response for debugging
    console.log('Anthropic response type:', r.status, JSON.stringify(data).slice(0, 200));
    res.json(data);
  } catch (e) {
    console.error('analyze error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Telegram
app.post('/api/telegram', async (req, res) => {
  try {
    const { token, chatId, text } = req.body;
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`);
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// BTC Price — Coinbase
app.get('/api/btcprice', async (req, res) => {
  try {
    const [r1, r2] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    const price = parseFloat(d1.data.amount);
    const chg = d2.bitcoin?.usd_24h_change || 0;
    res.json({ lastPrice: price.toString(), priceChangePercent: chg.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Klines — Kraken
app.get('/api/klines', async (req, res) => {
  try {
    const { interval, limit } = req.query;
    const map = { '1m':1,'5m':5,'15m':15,'1h':60,'4h':240,'1d':1440 };
    const ki = map[interval] || 5;
    const r = await fetch(`https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${ki}`);
    const d = await r.json();
    const key = Object.keys(d.result).find(k => k !== 'last');
    const raw = d.result[key] || [];
    const lim = parseInt(limit) || 30;
    const klines = raw.slice(-lim).map(c => [+c[0]*1000, c[1], c[2], c[3], c[4], c[6]]);
    res.json(klines);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fear & Greed
app.get('/api/feargreed', async (req, res) => {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1');
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Polymarket
app.get('/api/market', async (req, res) => {
  try {
    const r = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100');
    const ms = await r.json();
    const market = (ms || []).find(m => {
      const q = (m.question || '').toLowerCase();
      return q.includes('bitcoin up or down') && (q.includes('5 min') || q.includes('5-min'));
    }) || null;
    res.json({ market });
  } catch (e) { res.json({ market: null }); }
});

app.get('/', (req, res) => res.json({ status: 'BTC Oracle running', time: new Date().toISOString() }));
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
