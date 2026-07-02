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
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Enter a URL starting with http:// or https://' });
  }

  let code = makeCode();
  while (db.prepare('SELECT 1 FROM links WHERE code = ?').get(code)) {
    code = makeCode();
  }

  db.prepare('INSERT INTO links (code, url, created) VALUES (?, ?, ?)')
    .run(code, url, Date.now());

  res.json({ code, short: `${req.protocol}://${req.get('host')}/${code}` });
});

app.get('/api/stats', (req, res) => {
  const rows = db.prepare(`
    SELECT l.code, l.url, l.created, COUNT(c.id) AS clicks
    FROM links l
    LEFT JOIN clicks c ON c.code = l.code
    GROUP BY l.code
    ORDER BY l.created DESC
  `).all();

  res.json(rows);
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
