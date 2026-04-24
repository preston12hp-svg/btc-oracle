const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/telegram', async (req, res) => {
  try {
    const { token, chatId, text } = req.body;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/market', async (req, res) => {
  try {
    const r = await fetch('https://clob.polymarket.com/markets?next_cursor=&limit=100');
    const data = await r.json();
    const ms = data.data || [];
    const market = ms.find(m => {
      const q = (m.question || '').toLowerCase();
      return q.includes('bitcoin up or down') && (q.includes('5 min') || q.includes('5-min'));
    }) || null;
    res.json({ market });
  } catch (e) {
    try {
      const r2 = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100');
      const ms = await r2.json();
      const market = (ms || []).find(m => {
        const q = (m.question || '').toLowerCase();
        return q.includes('bitcoin up or down') && q.includes('5 min');
      }) || null;
      res.json({ market });
    } catch (e2) {
      res.json({ market: null });
    }
  }
});

app.get('/api/btcprice', async (req, res) => {
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/klines', async (req, res) => {
  try {
    const { interval, limit } = req.query;
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit || 30}`);
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/feargreed', async (req, res) => {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1');
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'BTC Oracle Server running', time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`BTC Oracle server running on port ${PORT}`));
