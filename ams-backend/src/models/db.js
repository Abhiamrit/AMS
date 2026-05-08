/**
 * SQLite wrapper using node-sqlite3-wasm (pure WebAssembly, no native build).
 * Exposes a better-sqlite3-compatible API so route code is unchanged:
 *   db.prepare(sql).get(...params)
 *   db.prepare(sql).all(...params)
 *   db.prepare(sql).run(...params)  -> { lastInsertRowid, changes }
 *   db.exec(sql)
 */
const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/ams.db';
const dir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db;

function getRawDb() {
  if (!_db) {
    _db = new Database(path.resolve(DB_PATH));
    _db.exec('PRAGMA journal_mode = WAL;');
    _db.exec('PRAGMA foreign_keys = ON;');
    initSchema(_db);
  }
  return _db;
}

// Compatibility shim: db.prepare(sql) -> statement object
function getDb() {
  const raw = getRawDb();

  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => ({
      get: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return raw.get(sql, params.length ? params : undefined) || null;
      },
      all: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return raw.all(sql, params.length ? params : undefined) || [];
      },
      run: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return raw.run(sql, params.length ? params : undefined);
      },
    }),
  };
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN','STAFF','MAS')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER,
      last_login TEXT,
      session_token TEXT,
      login_attempts INTEGER DEFAULT 0,
      locked_until TEXT
    );
    CREATE TABLE IF NOT EXISTS clients (
      client_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_code TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      client_type TEXT NOT NULL CHECK(client_type IN ('GOVERNMENT','PRIVATE')),
      address TEXT,
      associated_project TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sections (
      section_id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_code TEXT NOT NULL UNIQUE,
      section_name TEXT NOT NULL,
      section_head TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_section_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, section_id)
    );
    CREATE TABLE IF NOT EXISTS assignments (
      assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_code TEXT NOT NULL UNIQUE,
      assignment_name TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      scope TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING','COMPLETED')),
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      forwarded_at TEXT,
      completed_at TEXT,
      completed_by INTEGER,
      mas_remarks TEXT
    );
    CREATE TABLE IF NOT EXISTS assignment_table_columns (
      column_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      column_name TEXT NOT NULL,
      column_type TEXT NOT NULL CHECK(column_type IN ('TEXT','NUMBER','DATE','CHECKBOX')),
      column_order INTEGER NOT NULL,
      is_predefined INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS assignment_table_rows (
      row_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      row_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assignment_table_cells (
      cell_id INTEGER PRIMARY KEY AUTOINCREMENT,
      row_id INTEGER NOT NULL,
      column_id INTEGER NOT NULL,
      cell_value TEXT,
      UNIQUE(row_id, column_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      related_assignment_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_role TEXT,
      action_type TEXT NOT NULL,
      affected_entity TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS financial_year_sequences (
      fy TEXT NOT NULL PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS client_sequences (
      year TEXT NOT NULL PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );
  `);
}

module.exports = { getDb };
