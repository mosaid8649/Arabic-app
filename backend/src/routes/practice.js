const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const PracticeModel = require('../models/practiceModel');
const { validateRequest } = require('../middleware');

// POST /api/practice/session — start a new session
router.post('/session', [
  body('mode').optional().isIn(['sentence', 'flashcard', 'quiz'])
], validateRequest, (req, res, next) => {
  try {
    const session = PracticeModel.createSession(req.body.mode || 'sentence');
    res.status(201).json(session);
  } catch (err) { next(err); }
});

// PUT /api/practice/session/:id/end — end a session
router.put('/session/:id/end', [param('id').isInt({ min: 1 })], validateRequest, (req, res, next) => {
  try {
    const session = PracticeModel.endSession(req.params.id);
    res.json(session);
  } catch (err) { next(err); }
});

// POST /api/practice/attempt — record an attempt
router.post('/attempt', [
  body('sessionId').isInt({ min: 1 }),
  body('wordId').isInt({ min: 1 }),
  body('result').isIn(['correct', 'incorrect', 'skipped']),
  body('userInput').optional().isString().trim()
], validateRequest, (req, res, next) => {
  try {
    const attempt = PracticeModel.recordAttempt({
      sessionId: req.body.sessionId,
      wordId: req.body.wordId,
      userInput: req.body.userInput,
      result: req.body.result
    });
    res.status(201).json(attempt);
  } catch (err) { next(err); }
});

// GET /api/practice/stats
router.get('/stats', (req, res, next) => {
  try {
    res.json(PracticeModel.getStats());
  } catch (err) { next(err); }
});

// GET /api/practice/daily-progress
router.get('/daily-progress', (req, res, next) => {
  try {
    res.json(PracticeModel.getDailyProgress());
  } catch (err) { next(err); }
});

module.exports = router;
