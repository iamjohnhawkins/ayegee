const express = require('express');
const db = require('../db');

const router = express.Router();

function validate(name) {
  if (!name || !name.trim()) return ['Name is required'];
  if (name.trim().length > 255) return ['Name must be 255 characters or fewer'];
  return [];
}

// List all groups with member count
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT g.*, COUNT(a.id)::int AS member_count
    FROM application_groups g
    LEFT JOIN applications a ON a.group_id = g.id
    GROUP BY g.id
    ORDER BY g.name ASC
  `);
  res.json(rows);
});

// Single group detail
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`
    SELECT g.*, COUNT(a.id)::int AS member_count
    FROM application_groups g
    LEFT JOIN applications a ON a.group_id = g.id
    WHERE g.id = $1
    GROUP BY g.id
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ errors: ['Group not found'] });
  res.json(rows[0]);
});

// Create group
router.post('/', async (req, res) => {
  const { name } = req.body;
  const errors = validate(name);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `INSERT INTO application_groups (name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    res.status(201).json({ ...rows[0], member_count: 0 });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['Group name already exists'] });
    throw err;
  }
});

// Rename group
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const errors = validate(name);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `UPDATE application_groups SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [name.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['Group not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['Group name already exists'] });
    throw err;
  }
});

// Delete group (ON DELETE SET NULL handles ungrouping)
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM application_groups WHERE id = $1',
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ errors: ['Group not found'] });
  res.status(204).end();
});

// List members
router.get('/:id/members', async (req, res) => {
  const group = await db.query('SELECT id FROM application_groups WHERE id = $1', [req.params.id]);
  if (!group.rows.length) return res.status(404).json({ errors: ['Group not found'] });
  const { rows } = await db.query(
    `SELECT id, name, nar_id, status FROM applications WHERE group_id = $1 ORDER BY name ASC`,
    [req.params.id]
  );
  res.json(rows);
});

// Replace full member set
router.put('/:id/members', async (req, res) => {
  const { application_ids = [] } = req.body;
  const groupId = req.params.id;

  const group = await db.query('SELECT id FROM application_groups WHERE id = $1', [groupId]);
  if (!group.rows.length) return res.status(404).json({ errors: ['Group not found'] });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE applications SET group_id = NULL, updated_at = NOW() WHERE group_id = $1',
      [groupId]
    );
    if (application_ids.length) {
      await client.query(
        'UPDATE applications SET group_id = $1, updated_at = NOW() WHERE id = ANY($2)',
        [groupId, application_ids]
      );
    }
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
