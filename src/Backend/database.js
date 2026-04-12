const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "taskbridge.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      course TEXT,
      dueDate TEXT,
      priority TEXT,
      status TEXT DEFAULT 'Pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error("Error creating tasks table:", err.message);
    } else {
      console.log("Tasks table ready.");
    }
  });
});

module.exports = db;
