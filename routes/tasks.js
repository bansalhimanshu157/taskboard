const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth); // every task route needs a logged-in user

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ message: 'Invalid task id' });

// CREATE
router.post('/', async (req, res, next) => {
  try {
    const { title, description, priority, dueDate } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' });
    const task = await Task.create({
      user: req.userId,
      title,
      description,
      priority,
      dueDate: dueDate || null,
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// READ (all of this user's tasks, with optional ?status= & ?q= filters)
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (['pending', 'done'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.q) {
      const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safe, $options: 'i' };
    }
    const tasks = await Task.find(filter).sort({ status: -1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// UPDATE
router.put('/:id', validId, async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'priority', 'status', 'dueDate'];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (updates.title !== undefined && !String(updates.title).trim())
      return res.status(400).json({ message: 'Title cannot be empty' });

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE
router.delete('/:id', validId, async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
