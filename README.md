# Link Shortener

A small URL shortener that tracks how many times each short link gets clicked.
Built with Node/Express and SQLite. The dashboard lists every link and its click count.

## How it works

- Paste a URL, get back a short code (e.g. `/aB3xY9`).
- When someone visits the short link, the server logs the click and redirects them.
- The main page shows all links with their click totals.

## Running locally

You need Node.js installed.

```
npm install
npm start
```

Then open http://localhost:3000.

## Structure

- `server.js` — routes: create link, redirect, stats
- `db.js` — SQLite tables
- `public/index.html` — dashboard

The database file (`data.db`) is created automatically on first run.
