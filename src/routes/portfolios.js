const express = require('express');
const db = require('../db');

const router = express.Router();

function validate(title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id) {
  const errors = [];
  if (!title || !title.trim())                       errors.push('Title is required');
  if (!sponsor_first_name || !sponsor_first_name.trim()) errors.push('Sponsor first name is required');
  if (!sponsor_last_name  || !sponsor_last_name.trim())  errors.push('Sponsor last name is required');
  if (!sponsor_email || !sponsor_email.trim())       errors.push('Sponsor email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sponsor_email.trim())) errors.push('Sponsor email is not valid');
  if (!owner_id)                                     errors.push('Portfolio owner is required');
  return errors;
}

// List all
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.*, f.first_name AS owner_first_name, f.last_name AS owner_last_name
    FROM portfolios p
    JOIN ftes f ON f.id = p.owner_id
    ORDER BY p.title ASC
  `);
  res.json(rows);
});

// Create one
router.post('/', async (req, res) => {
  const { title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id } = req.body;
  const errors = validate(title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `INSERT INTO portfolios (title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), sponsor_first_name.trim(), sponsor_last_name.trim(), sponsor_email.trim().toLowerCase(), Number(owner_id)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['A portfolio with that title already exists'] });
    if (err.code === '23503') return res.status(422).json({ errors: ['Selected owner FTE does not exist'] });
    throw err;
  }
});

// Update one
router.put('/:id', async (req, res) => {
  const { title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id } = req.body;
  const errors = validate(title, sponsor_first_name, sponsor_last_name, sponsor_email, owner_id);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `UPDATE portfolios
          SET title = $1, sponsor_first_name = $2, sponsor_last_name = $3,
              sponsor_email = $4, owner_id = $5, updated_at = NOW()
        WHERE id = $6 RETURNING *`,
      [title.trim(), sponsor_first_name.trim(), sponsor_last_name.trim(), sponsor_email.trim().toLowerCase(), Number(owner_id), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['Portfolio not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['A portfolio with that title already exists'] });
    if (err.code === '23503') return res.status(422).json({ errors: ['Selected owner FTE does not exist'] });
    throw err;
  }
});

// Delete one
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM portfolios WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ errors: ['Portfolio not found'] });
  res.status(204).end();
});

module.exports = router;
