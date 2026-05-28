const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { parseExcelBuffer, validateWords } = require('../utils/excelParser');
const WordModel = require('../models/wordModel');
const LessonModel = require('../models/lessonModel');
const { getDb } = require('../models/db');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
    cb(null, true);
  }
});

// POST /api/upload/preview — parse without saving
router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const parsed = parseExcelBuffer(req.file.buffer);
    const { valid, errors } = validateWords(parsed);

    res.json({
      filename: req.file.originalname,
      totalRows: parsed.length,
      validRows: valid.length,
      errorRows: errors.length,
      errors: errors.slice(0, 20),
      preview: valid.slice(0, 20),
      lessons: [...new Set(valid.map(w => w.lesson).filter(Boolean))]
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/import — parse and save to DB
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { lessonName, createLessons = 'true' } = req.body;
    const parsed = parseExcelBuffer(req.file.buffer);
    const { valid, errors } = validateWords(parsed);

    if (valid.length === 0) {
      return res.status(400).json({
        error: 'No valid words found in file',
        parseErrors: errors.slice(0, 10)
      });
    }

    let defaultLesson = null;
    if (lessonName) {
      defaultLesson = LessonModel.findOrCreate(lessonName);
    }

    // Group words by lesson
    const wordsByLesson = {};
    for (const word of valid) {
      const key = word.lesson || lessonName || '_none_';
      if (!wordsByLesson[key]) wordsByLesson[key] = [];
      wordsByLesson[key].push(word);
    }

    let totalImported = 0, totalSkipped = 0;
    const lessonResults = [];

    for (const [lessonKey, words] of Object.entries(wordsByLesson)) {
      let lessonId = null;

      if (lessonKey !== '_none_') {
        const lesson = LessonModel.findOrCreate(lessonKey);
        lessonId = lesson.id;
        const { imported, skipped } = WordModel.bulkInsert(words, lessonId);
        lessonResults.push({ lesson: lessonKey, imported, skipped });
        totalImported += imported;
        totalSkipped += skipped;
      } else {
        const lid = defaultLesson ? defaultLesson.id : null;
        const { imported, skipped } = WordModel.bulkInsert(words, lid);
        lessonResults.push({ lesson: 'Uncategorized', imported, skipped });
        totalImported += imported;
        totalSkipped += skipped;
      }
    }

    // Log upload
    const db = getDb();
    db.prepare(`
      INSERT INTO uploads (filename, original_name, words_imported, words_skipped, status)
      VALUES (?, ?, ?, ?, 'completed')
    `).run(req.file.originalname, req.file.originalname, totalImported, totalSkipped);
    db.close();

    res.json({
      success: true,
      imported: totalImported,
      skipped: totalSkipped,
      parseErrors: errors.length,
      lessonBreakdown: lessonResults,
      message: `Successfully imported ${totalImported} words (${totalSkipped} duplicates skipped)`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/upload/history
router.get('/history', (req, res, next) => {
  try {
    const db = getDb();
    const uploads = db.prepare('SELECT * FROM uploads ORDER BY uploaded_at DESC LIMIT 20').all();
    db.close();
    res.json(uploads);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
