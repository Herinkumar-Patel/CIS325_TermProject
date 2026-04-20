const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const dbFile = path.join(__dirname, 'taskbridge.db');

async function getDb() {
  const db = await open({
    filename: dbFile,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      course TEXT DEFAULT '',
      dueDate TEXT DEFAULT '',
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      course TEXT DEFAULT '',
      dueDate TEXT DEFAULT '',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      memberName TEXT NOT NULL,
      memberEmail TEXT DEFAULT '',
      role TEXT DEFAULT 'Member',
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      message TEXT NOT NULL,
      remindAt TEXT DEFAULT '',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}

module.exports = { getDb };
