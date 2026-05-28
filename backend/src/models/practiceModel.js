const { getDb } = require('./db');

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(easeFactor, intervalDays, quality) {
  // quality: 0-5 (0=blackout, 5=perfect)
  let newInterval, newEase;

  if (quality < 3) {
    newInterval = 1;
    newEase = easeFactor;
  } else {
    if (intervalDays === 1) newInterval = 6;
    else if (intervalDays === 6) newInterval = Math.round(intervalDays * easeFactor);
    else newInterval = Math.round(intervalDays * easeFactor);

    newEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEase < 1.3) newEase = 1.3;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return { interval: newInterval, easeFactor: newEase, nextReview: nextReview.toISOString() };
}

const PracticeModel = {
  createSession(mode = 'sentence') {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO practice_sessions (mode) VALUES (?)').run(mode);
      return db.prepare('SELECT * FROM practice_sessions WHERE id = ?').get(result.lastInsertRowid);
    } finally {
      db.close();
    }
  },

  endSession(sessionId) {
    const db = getDb();
    try {
      const stats = db.prepare(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
        FROM practice_attempts WHERE session_id = ?
      `).get(sessionId);

      db.prepare(`
        UPDATE practice_sessions
        SET ended_at = CURRENT_TIMESTAMP,
            total_attempts = ?, correct_attempts = ?
        WHERE id = ?
      `).run(stats.total, stats.correct || 0, sessionId);

      return db.prepare('SELECT * FROM practice_sessions WHERE id = ?').get(sessionId);
    } finally {
      db.close();
    }
  },

  recordAttempt({ sessionId, wordId, userInput, result }) {
    const db = getDb();
    try {
      const attempt = db.prepare(`
        INSERT INTO practice_attempts (session_id, word_id, user_input, result)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, wordId, userInput || null, result);

      // Update word_stats
      const quality = result === 'correct' ? 4 : result === 'incorrect' ? 1 : 2;
      const stats = db.prepare('SELECT * FROM word_stats WHERE word_id = ?').get(wordId);

      if (stats) {
        const { interval, easeFactor, nextReview } = calculateNextReview(
          stats.ease_factor, stats.interval_days, quality
        );
        const newStreak = result === 'correct' ? (stats.streak || 0) + 1 : 0;

        db.prepare(`
          UPDATE word_stats SET
            total_attempts = total_attempts + 1,
            correct_attempts = correct_attempts + CASE WHEN ? = 'correct' THEN 1 ELSE 0 END,
            last_practiced = CURRENT_TIMESTAMP,
            next_review = ?,
            ease_factor = ?,
            interval_days = ?,
            streak = ?
          WHERE word_id = ?
        `).run(result, nextReview, easeFactor, interval, newStreak, wordId);
      }

      return db.prepare('SELECT * FROM practice_attempts WHERE id = ?').get(attempt.lastInsertRowid);
    } finally {
      db.close();
    }
  },

  getStats() {
    const db = getDb();
    try {
      const overall = db.prepare(`
        SELECT
          COUNT(DISTINCT w.id) as total_words,
          COUNT(DISTINCT pa.word_id) as practiced_words,
          SUM(ws.total_attempts) as total_attempts,
          SUM(ws.correct_attempts) as total_correct,
          COUNT(DISTINCT DATE(pa.attempted_at)) as practice_days,
          COUNT(DISTINCT CASE WHEN DATE(pa.attempted_at) = DATE('now') THEN pa.id END) as today_attempts
        FROM words w
        LEFT JOIN word_stats ws ON w.id = ws.word_id
        LEFT JOIN practice_attempts pa ON w.id = pa.word_id
      `).get();

      const recentSessions = db.prepare(`
        SELECT ps.*, 
          ROUND(CASE WHEN ps.total_attempts > 0 
            THEN (ps.correct_attempts * 100.0 / ps.total_attempts) 
            ELSE 0 END, 1) as accuracy
        FROM practice_sessions ps
        ORDER BY ps.started_at DESC LIMIT 10
      `).all();

      const weakWords = db.prepare(`
        SELECT w.arabic, w.english, ws.total_attempts, ws.correct_attempts,
          ROUND(CASE WHEN ws.total_attempts > 0 
            THEN (ws.correct_attempts * 100.0 / ws.total_attempts) 
            ELSE 0 END, 1) as accuracy
        FROM word_stats ws
        JOIN words w ON ws.word_id = w.id
        WHERE ws.total_attempts >= 3
        ORDER BY accuracy ASC LIMIT 10
      `).all();

      const dueForReview = db.prepare(`
        SELECT COUNT(*) as count FROM word_stats
        WHERE next_review IS NULL OR next_review <= datetime('now')
      `).get();

      return { overall, recentSessions, weakWords, dueForReview: dueForReview.count };
    } finally {
      db.close();
    }
  },

  getDailyProgress() {
    const db = getDb();
    try {
      return db.prepare(`
        SELECT DATE(attempted_at) as date,
          COUNT(*) as attempts,
          SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
        FROM practice_attempts
        WHERE attempted_at >= datetime('now', '-30 days')
        GROUP BY DATE(attempted_at)
        ORDER BY date ASC
      `).all();
    } finally {
      db.close();
    }
  }
};

module.exports = PracticeModel;
