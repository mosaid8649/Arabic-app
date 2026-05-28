const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const LessonModel = require('../models/lessonModel');
const { validateRequest } = require('../middleware');

router.get('/', (req, res, next) => {
  try {
    res.json(LessonModel.findAll());
  } catch (err) { next(err); }
});

router.get('/:id', [param('id').isInt({ min: 1 })], validateRequest, (req, res, next) => {
  try {
    const lesson = LessonModel.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  } catch (err) { next(err); }
});

router.post('/', [
  body('name').notEmpty().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim()
], validateRequest, (req, res, next) => {
  try {
    const lesson = LessonModel.create(req.body);
    res.status(201).json(lesson);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A lesson with this name already exists' });
    }
    next(err);
  }
});

router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('name').notEmpty().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim()
], validateRequest, (req, res, next) => {
  try {
    const existing = LessonModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Lesson not found' });
    res.json(LessonModel.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', [param('id').isInt({ min: 1 })], validateRequest, (req, res, next) => {
  try {
    const result = LessonModel.delete(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
