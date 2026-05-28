const { getDb } = require('./db');

// Strip Arabic diacritics (harakat) - used in JS-side search normalisation
function stripDiacritics(str) {
  if (!str) return '';
  return str.replace(/[\u064B-\u065F\u0610-\u061A]/g, '');
}

// SQL expression to strip Arabic diacritics using Unicode codepoints
// Covers U+064B (tanwin fath) through U+0652 (sukun) + tatweel U+0640
const STRIP_SQL = (col) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${col},
  CHAR(1611),''),CHAR(1612),''),CHAR(1613),''),
  CHAR(1614),''),CHAR(1615),''),CHAR(1616),''),
  CHAR(1617),''),CHAR(1618),''),CHAR(1648),''),
  CHAR(1600),''),CHAR(1619),''),CHAR(1620),'')`;

const WordModel = {
  findAll({ lessonId, search, limit = 50, offset = 0, sortBy = 'created_at', sortDir = 'DESC' } = {}) {
    const db = getDb();
    try {
      const validSorts = ['arabic', 'english', 'created_at', 'difficulty'];
      const col = validSorts.includes(sortBy) ? sortBy : 'created_at';
      const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';

      const conditions = ['1=1'];
      const params = [];
      const countParams = [];

      if (lessonId) {
        conditions.push('w.lesson_id = ?');
        params.push(lessonId);
        countParams.push(lessonId);
      }

      if (search) {
        const s = `%${search}%`;
        const stripped = `%${stripDiacritics(search)}%`;
        conditions.push(`(
          w.english LIKE ? OR
          w.transliteration LIKE ? OR
          w.arabic LIKE ? OR
          ${STRIP_SQL('w.arabic')} LIKE ?
        )`);
        params.push(s, s, s, stripped);
        countParams.push(s, s, s, stripped);
      }

      const where = conditions.join(' AND ');

      const query = `
        SELECT w.*, l.name as lesson_name,
          ws.total_attempts, ws.correct_attempts, ws.last_practiced, ws.streak, ws.next_review
        FROM words w
        LEFT JOIN lessons l ON w.lesson_id = l.id
        LEFT JOIN word_stats ws ON w.id = ws.word_id
        WHERE ${where}
        ORDER BY w.${col} ${dir}
        LIMIT ? OFFSET ?
      `;
      const words = db.all(query, ...params, limit, offset);

      const countQuery = `SELECT COUNT(*) as total FROM words w WHERE ${where}`;
      const countRow = db.get(countQuery, ...countParams);
      const total = countRow ? countRow.total : 0;

      return { words, total };
    } finally {
      db.close();
    }
  },

  findById(id) {
    const db = getDb();
    try {
      return db.prepare(`
        SELECT w.*, l.name as lesson_name,
          ws.total_attempts, ws.correct_attempts, ws.last_practiced,
          ws.streak, ws.ease_factor, ws.interval_days, ws.next_review
        FROM words w
        LEFT JOIN lessons l ON w.lesson_id = l.id
        LEFT JOIN word_stats ws ON w.id = ws.word_id
        WHERE w.id = ?
      `).get(id);
    } finally {
      db.close();
    }
  },

  findRandom({ lessonId, excludeIds = [], dueOnly = false } = {}) {
    const db = getDb();
    try {
      const conditions = ['1=1'];
      const params = [];

      if (lessonId) { conditions.push('w.lesson_id = ?'); params.push(lessonId); }
      if (excludeIds.length > 0) {
        conditions.push(`w.id NOT IN (${excludeIds.map(() => '?').join(',')})`);
        params.push(...excludeIds);
      }
      if (dueOnly) {
        conditions.push(`(ws.next_review IS NULL OR ws.next_review <= datetime('now'))`);
      }

      const query = `
        SELECT w.*, l.name as lesson_name
        FROM words w
        LEFT JOIN lessons l ON w.lesson_id = l.id
        LEFT JOIN word_stats ws ON w.id = ws.word_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY RANDOM() LIMIT 1
      `;
      return db.get(query, ...params);
    } finally {
      db.close();
    }
  },

  create({ arabic, english, transliteration, example_sentence, example_translation, lesson_id, difficulty = 1, notes }) {
    const db = getDb();
    try {
      const result = db.run(
        `INSERT INTO words (arabic, english, transliteration, example_sentence, example_translation, lesson_id, difficulty, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        arabic, english, transliteration || null, example_sentence || null,
        example_translation || null, lesson_id || null, difficulty, notes || null
      );
      db.run('INSERT OR IGNORE INTO word_stats (word_id) VALUES (?)', result.lastInsertRowid);
      return this.findById(result.lastInsertRowid);
    } finally {
      db.close();
    }
  },

  update(id, fields) {
    const db = getDb();
    try {
      const allowed = ['arabic', 'english', 'transliteration', 'example_sentence', 'example_translation', 'lesson_id', 'difficulty', 'notes'];
      const updates = Object.keys(fields).filter(k => allowed.includes(k));
      if (updates.length === 0) return this.findById(id);
      const set = updates.map(k => `${k} = ?`).join(', ');
      const values = updates.map(k => fields[k] === '' ? null : fields[k]);
      db.run(`UPDATE words SET ${set}, updated_at = datetime('now') WHERE id = ?`, ...values, id);
      return this.findById(id);
    } finally {
      db.close();
    }
  },

  delete(id) {
    const db = getDb();
    try {
      return db.run('DELETE FROM words WHERE id = ?', id);
    } finally {
      db.close();
    }
  },

  bulkInsert(words, lessonId) {
    const db = getDb();
    try {
      let imported = 0, skipped = 0;
      for (const w of words) {
        try {
          const lid = lessonId || w.lesson_id || null;
          const existing = lid
            ? db.get('SELECT id FROM words WHERE arabic = ? AND lesson_id = ?', w.arabic, lid)
            : db.get('SELECT id FROM words WHERE arabic = ? AND lesson_id IS NULL', w.arabic);
          if (existing) { skipped++; continue; }
          const result = db.run(
            `INSERT INTO words (arabic, english, transliteration, example_sentence, example_translation, lesson_id, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            w.arabic, w.english, w.transliteration || null,
            w.example_sentence || null, w.example_translation || null,
            lid, w.difficulty || 1
          );
          if (result.changes > 0) {
            db.run('INSERT OR IGNORE INTO word_stats (word_id) VALUES (?)', result.lastInsertRowid);
            imported++;
          } else {
            skipped++;
          }
        } catch (e) {
          if (e.message?.includes('UNIQUE')) { skipped++; }
          else throw e;
        }
      }
      return { imported, skipped };
    } finally {
      db.close();
    }
  }
};

module.exports = WordModel;
