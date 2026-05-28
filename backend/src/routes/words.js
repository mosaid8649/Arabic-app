const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const WordModel = require('../models/wordModel');
const { validateRequest } = require('../middleware');

// GET /api/words
router.get('/', [
  query('lessonId').optional().isInt({ min: 1 }),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('sortBy').optional().isIn(['arabic', 'english', 'created_at', 'difficulty']),
  query('sortDir').optional().isIn(['ASC', 'DESC'])
], validateRequest, (req, res, next) => {
  try {
    const { lessonId, search, limit = 50, offset = 0, sortBy, sortDir } = req.query;
    const result = WordModel.findAll({ lessonId, search, limit, offset, sortBy, sortDir });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/words/random
router.get('/random', [
  query('lessonId').optional().isInt({ min: 1 }),
  query('dueOnly').optional().isBoolean().toBoolean(),
  query('exclude').optional().isString()
], validateRequest, (req, res, next) => {
  try {
    const { lessonId, dueOnly, exclude } = req.query;
    const excludeIds = exclude ? exclude.split(',').map(Number).filter(Boolean) : [];
    const word = WordModel.findRandom({ lessonId, excludeIds, dueOnly });
    if (!word) return res.status(404).json({ error: 'No words available' });
    res.json(word);
  } catch (err) { next(err); }
});

// GET /api/words/:id
router.get('/:id', [param('id').isInt({ min: 1 })], validateRequest, (req, res, next) => {
  try {
    const word = WordModel.findById(req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    res.json(word);
  } catch (err) { next(err); }
});

// POST /api/words
router.post('/', [
  body('arabic').notEmpty().isString().trim().isLength({ max: 200 }),
  body('english').notEmpty().isString().trim().isLength({ max: 500 }),
  body('transliteration').optional().isString().trim(),
  body('example_sentence').optional().isString().trim(),
  body('example_translation').optional().isString().trim(),
  body('lesson_id').optional().isInt({ min: 1 }),
  body('difficulty').optional().isInt({ min: 1, max: 5 }),
  body('notes').optional().isString().trim()
], validateRequest, (req, res, next) => {
  try {
    const word = WordModel.create(req.body);
    res.status(201).json(word);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Word already exists in this lesson' });
    }
    next(err);
  }
});

// PUT /api/words/:id
router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('arabic').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('english').optional().isString().trim().isLength({ min: 1, max: 500 }),
  body('difficulty').optional().isInt({ min: 1, max: 5 })
], validateRequest, (req, res, next) => {
  try {
    const word = WordModel.findById(req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    const updated = WordModel.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/words/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], validateRequest, (req, res, next) => {
  try {
    const result = WordModel.delete(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Word not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
