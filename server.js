const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

function makeCode(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

app.post('/api/shorten', (req, res) => {
  const { url, code: custom } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Enter a URL starting with http:// or https://' });
  }

  let code;
  if (custom) {
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(custom)) {
      return res.status(400).json({ error: 'Custom code must be 3-20 letters, numbers, - or _' });
    }
    if (custom === 'api' || db.prepare('SELECT 1 FROM links WHERE code = ?').get(custom)) {
      return res.status(400).json({ error: 'That code is already taken' });
    }
    code = custom;
  } else {
    code = makeCode();
    while (db.prepare('SELECT 1 FROM links WHERE code = ?').get(code)) {
      code = makeCode();
    }
  }

  db.prepare('INSERT INTO links (code, url, created) VALUES (?, ?, ?)')
    .run(code, url, Date.now());

  res.json({ code, short: `${req.protocol}://${req.get('host')}/${code}` });
});

app.get('/api/stats', (req, res) => {
  const links = db.prepare(`
    SELECT l.code, l.url, l.created,
           COUNT(c.id) AS clicks,
           MAX(c.ts) AS lastClick
    FROM links l
    LEFT JOIN clicks c ON c.code = l.code
    GROUP BY l.code
    ORDER BY l.created DESC
  `).all();

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  res.json({
    links,
    totals: {
      links: links.length,
      clicks: totalClicks,
      avg: links.length ? +(totalClicks / links.length).toFixed(1) : 0
    }
  });
});

app.get('/api/link/:code', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE code = ?').get(req.params.code);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const recent = db.prepare(
    'SELECT ts, referrer FROM clicks WHERE code = ? ORDER BY ts DESC LIMIT 8'
  ).all(link.code);

  const sources = db.prepare(`
    SELECT COALESCE(referrer, 'Direct') AS source, COUNT(*) AS count
    FROM clicks WHERE code = ?
    GROUP BY source ORDER BY count DESC
  `).all(link.code);

  const dayMs = 86400000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const from = start.getTime() - i * dayMs;
    const row = db.prepare(
      'SELECT COUNT(*) AS n FROM clicks WHERE code = ? AND ts >= ? AND ts < ?'
    ).get(link.code, from, from + dayMs);
    daily.push({ date: from, count: row.n });
  }

  res.json({ recent, sources, daily });
});

app.delete('/api/link/:code', (req, res) => {
  const result = db.prepare('DELETE FROM links WHERE code = ?').run(req.params.code);
  db.prepare('DELETE FROM clicks WHERE code = ?').run(req.params.code);
  res.json({ deleted: result.changes > 0 });
});

app.get('/:code', (req, res, next) => {
  const link = db.prepare('SELECT * FROM links WHERE code = ?').get(req.params.code);
  if (!link) return next();

  db.prepare('INSERT INTO clicks (code, ts, referrer) VALUES (?, ?, ?)')
    .run(link.code, Date.now(), req.get('referer') || null);

  res.redirect(link.url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
