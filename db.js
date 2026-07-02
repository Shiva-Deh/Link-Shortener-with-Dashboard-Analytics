const Database = require('better-sqlite3');

const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    code TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    ts INTEGER NOT NULL,
    referrer TEXT
  );
`);

module.exports = db;
