const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let DB_PATH = null;
let _db = null;  // Single persistent in-memory DB instance

function getDbPath() {
  return process.env.DB_PATH || './data/arabic_vocab.db';
}

function ensureDir(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveDb() {
  if (!_db || !DB_PATH) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Safe wrapper - returns { changes, lastInsertRowid }
function runSql(sql, params = []) {
  _db.run(sql, params);
  const changes = _db.getRowsModified();
  let lastInsertRowid = 0;
  try {
    const r = _db.exec('SELECT last_insert_rowid()');
    if (r.length > 0) lastInsertRowid = r[0].values[0][0];
  } catch (_) {}
  return { changes, lastInsertRowid };
}

function getSql(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function allSql(sql, params = []) {
  const result = _db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function getDb() {
  if (!_db) throw new Error('DB not initialized. Await initDb() first.');
  return {
    run(sql, ...args) {
      const params = args.flat().map(v => v === undefined ? null : v);
      const result = runSql(sql, params);
      saveDb();
      return result;
    },
    get(sql, ...args) {
      const params = args.flat().map(v => v === undefined ? null : v);
      return getSql(sql, params);
    },
    all(sql, ...args) {
      const params = args.flat().map(v => v === undefined ? null : v);
      return allSql(sql, params);
    },
    exec(sql) {
      _db.exec(sql);
      saveDb();
    },
    prepare(sql) {
      const self = this;
      return {
        run(...args) { return self.run(sql, ...args); },
        get(...args) { return self.get(sql, ...args); },
        all(...args) { return self.all(sql, ...args); },
      };
    },
    transaction(fn) {
      return (...args) => {
        _db.run('BEGIN');
        try {
          fn(...args);
          _db.run('COMMIT');
          saveDb();
        } catch (e) {
          try { _db.run('ROLLBACK'); } catch (_) {}
          throw e;
        }
      };
    },
    close() { /* no-op: singleton stays alive */ }
  };
}

async function initDb() {
  DB_PATH = getDbPath();
  ensureDir(DB_PATH);

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON;');

  // Create schema
  _db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arabic TEXT NOT NULL,
      english TEXT NOT NULL,
      transliteration TEXT,
      example_sentence TEXT,
      example_translation TEXT,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
      difficulty INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(arabic, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      mode TEXT DEFAULT 'sentence',
      total_attempts INTEGER DEFAULT 0,
      correct_attempts INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES practice_sessions(id) ON DELETE CASCADE,
      word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
      user_input TEXT,
      result TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS word_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER UNIQUE REFERENCES words(id) ON DELETE CASCADE,
      total_attempts INTEGER DEFAULT 0,
      correct_attempts INTEGER DEFAULT 0,
      last_practiced DATETIME,
      next_review DATETIME,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      words_imported INTEGER DEFAULT 0,
      words_skipped INTEGER DEFAULT 0,
      lesson_id INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed'
    );
    CREATE INDEX IF NOT EXISTS idx_words_lesson ON words(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_words_arabic ON words(arabic);
    CREATE INDEX IF NOT EXISTS idx_attempts_word ON practice_attempts(word_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON practice_attempts(session_id);
  `);

  saveDb();
  console.log('✅ Database initialized at:', DB_PATH);
}

module.exports = { getDb, initDb };
