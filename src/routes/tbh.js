const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tbh_slots ORDER BY label ASC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { label } = req.body;
  if (!label || !String(label).trim()) {
    return res.status(422).json({ errors: ['Label is required'] });
  }
  const { rows } = await db.query(
    'INSERT INTO tbh_slots (label) VALUES ($1) RETURNING *',
    [String(label).trim()]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
