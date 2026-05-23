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
      locked_until TEXT,
      section_id INTEGER,
      is_section_head INTEGER DEFAULT 0
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
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN ROUTING','UNDER REVIEW','PENDING','COMPLETED')),
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      forwarded_at TEXT,
      completed_at TEXT,
      completed_by INTEGER,
      mas_remarks TEXT,
      current_routing_step INTEGER DEFAULT 0,
      total_routing_steps INTEGER DEFAULT 0
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

    -- NEW: Routing journey per assignment
    CREATE TABLE IF NOT EXISTS assignment_routing (
      routing_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id     INTEGER NOT NULL REFERENCES assignments(assignment_id),
      section_id        INTEGER NOT NULL REFERENCES sections(section_id),
      routing_order     INTEGER NOT NULL,
      status            TEXT DEFAULT 'WAITING' CHECK(status IN ('WAITING','IN PROGRESS','DONE','SENT BACK')),
      assigned_to       INTEGER REFERENCES users(user_id),
      assigned_by       INTEGER REFERENCES users(user_id),
      assigned_at       TEXT,
      completed_at      TEXT,
      notes             TEXT,
      sent_back_reason  TEXT,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    -- NEW: Section data table header (one per section per assignment)
    CREATE TABLE IF NOT EXISTS section_data_tables (
      section_table_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id     INTEGER NOT NULL REFERENCES assignments(assignment_id),
      section_id        INTEGER NOT NULL REFERENCES sections(section_id),
      routing_id        INTEGER NOT NULL REFERENCES assignment_routing(routing_id),
      created_by        INTEGER NOT NULL REFERENCES users(user_id),
      remarks           TEXT,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    -- NEW: Columns for section data tables
    CREATE TABLE IF NOT EXISTS section_table_columns (
      column_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_table_id  INTEGER NOT NULL REFERENCES section_data_tables(section_table_id),
      column_name       TEXT NOT NULL,
      column_type       TEXT CHECK(column_type IN ('TEXT','NUMBER','DATE','CHECKBOX')),
      column_order      INTEGER NOT NULL,
      is_predefined     INTEGER DEFAULT 0
    );

    -- NEW: Rows for section data tables
    CREATE TABLE IF NOT EXISTS section_table_rows (
      row_id            INTEGER PRIMARY KEY AUTOINCREMENT,
      section_table_id  INTEGER NOT NULL REFERENCES section_data_tables(section_table_id),
      row_order         INTEGER NOT NULL
    );

    -- NEW: Cells for section data tables
    CREATE TABLE IF NOT EXISTS section_table_cells (
      cell_id           INTEGER PRIMARY KEY AUTOINCREMENT,
      row_id            INTEGER NOT NULL REFERENCES section_table_rows(row_id),
      column_id         INTEGER NOT NULL REFERENCES section_table_columns(column_id),
      cell_value        TEXT,
      UNIQUE(row_id, column_id)
    );
  `);

  // Migrate existing DB: add new columns to users and assignments if not present
  try { db.exec(`ALTER TABLE users ADD COLUMN section_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN is_section_head INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE assignments ADD COLUMN current_routing_step INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE assignments ADD COLUMN total_routing_steps INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE section_data_tables ADD COLUMN remarks TEXT`); } catch {}
}

module.exports = { getDb };
