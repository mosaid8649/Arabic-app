const { getDb } = require('./db');

const LessonModel = {
  findAll() {
    const db = getDb();
    try {
      return db.prepare(`
        SELECT l.*, COUNT(w.id) as word_count
        FROM lessons l
        LEFT JOIN words w ON l.id = w.lesson_id
        GROUP BY l.id
        ORDER BY l.name ASC
      `).all();
    } finally {
      db.close();
    }
  },

  findById(id) {
    const db = getDb();
    try {
      return db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    } finally {
      db.close();
    }
  },

  findOrCreate(name) {
    const db = getDb();
    try {
      const existing = db.prepare('SELECT * FROM lessons WHERE name = ?').get(name.trim());
      if (existing) return existing;
      const result = db.prepare('INSERT INTO lessons (name) VALUES (?)').run(name.trim());
      return db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);
    } finally {
      db.close();
    }
  },

  create({ name, description }) {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO lessons (name, description) VALUES (?, ?)').run(name.trim(), description || null);
      return this.findById(result.lastInsertRowid);
    } finally {
      db.close();
    }
  },

  update(id, { name, description }) {
    const db = getDb();
    try {
      db.prepare('UPDATE lessons SET name = ?, description = ? WHERE id = ?').run(name.trim(), description || null, id);
      return this.findById(id);
    } finally {
      db.close();
    }
  },

  delete(id) {
    const db = getDb();
    try {
      return db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    } finally {
      db.close();
    }
  }
};

module.exports = LessonModel;
