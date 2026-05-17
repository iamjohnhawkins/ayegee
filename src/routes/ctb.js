const express = require('express');
const db = require('../db');

const router = express.Router();

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function validateCtb(title, application_id, application_group_id) {
  const errors = [];
  if (!title || !String(title).trim()) errors.push('Title is required');
  const hasApp   = application_id       && Number.isInteger(Number(application_id))       && Number(application_id)       > 0;
  const hasGroup = application_group_id && Number.isInteger(Number(application_group_id)) && Number(application_group_id) > 0;
  if (!hasApp && !hasGroup) errors.push('A target application or application group is required');
  if (hasApp && hasGroup)   errors.push('Only one target (application or group) may be set');
  return errors;
}

function validateAllocation(fte_id, tbh_id) {
  const hasFte = fte_id && Number.isInteger(Number(fte_id)) && Number(fte_id) > 0;
  const hasTbh = tbh_id && Number.isInteger(Number(tbh_id)) && Number(tbh_id) > 0;
  if (!hasFte && !hasTbh) return ['An FTE or TBH slot is required'];
  if (hasFte && hasTbh)   return ['Only one person type (FTE or TBH) may be set'];
  return [];
}

function monthValues(body) {
  return MONTHS.map(m => Number(body[m]) || 0);
}

// List all Baseline CTBs for current year, with embedded allocations and aggregate month totals
router.get('/', async (req, res) => {
  const year = new Date().getFullYear();
  const { rows } = await db.query(`
    SELECT
      c.id, c.title, c.description, c.year,
      c.application_id, c.application_group_id,
      c.created_at, c.updated_at,
      COALESCE(app.name, ag.name) AS target_name,
      CASE WHEN c.application_id IS NOT NULL THEN 'application' ELSE 'group' END AS target_type,
      COALESCE(SUM(al.jan), 0) AS jan,
      COALESCE(SUM(al.feb), 0) AS feb,
      COALESCE(SUM(al.mar), 0) AS mar,
      COALESCE(SUM(al.apr), 0) AS apr,
      COALESCE(SUM(al.may), 0) AS may,
      COALESCE(SUM(al.jun), 0) AS jun,
      COALESCE(SUM(al.jul), 0) AS jul,
      COALESCE(SUM(al.aug), 0) AS aug,
      COALESCE(SUM(al.sep), 0) AS sep,
      COALESCE(SUM(al.oct), 0) AS oct,
      COALESCE(SUM(al.nov), 0) AS nov,
      COALESCE(SUM(al.dec), 0) AS dec,
      COUNT(al.id) AS allocation_count,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',          al.id,
            'fte_id',      al.fte_id,
            'tbh_id',      al.tbh_id,
            'person_name', CASE WHEN al.fte_id IS NOT NULL
                             THEN f.first_name || ' ' || f.last_name
                             ELSE t.label END,
            'fte_title',   f.title,
            'fte_region',  f.region,
            'fte_email',   f.email,
            'is_tbh',      (al.fte_id IS NULL),
            'jan', al.jan, 'feb', al.feb, 'mar', al.mar, 'apr', al.apr,
            'may', al.may, 'jun', al.jun, 'jul', al.jul, 'aug', al.aug,
            'sep', al.sep, 'oct', al.oct, 'nov', al.nov, 'dec', al.dec
          ) ORDER BY al.id ASC
        ) FILTER (WHERE al.id IS NOT NULL),
        '[]'::json
      ) AS allocations
    FROM baseline_ctb c
    LEFT JOIN applications     app ON app.id = c.application_id
    LEFT JOIN application_groups ag ON ag.id  = c.application_group_id
    LEFT JOIN baseline_ctb_allocations al ON al.ctb_id = c.id
    LEFT JOIN ftes f              ON f.id = al.fte_id
    LEFT JOIN tbh_slots t         ON t.id = al.tbh_id
    WHERE c.year = $1
    GROUP BY c.id, app.name, ag.name
    ORDER BY target_name ASC
  `, [year]);
  res.json(rows);
});

// Combined target list for autocomplete
router.get('/targets', async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, name, 'application' AS type FROM applications
    UNION ALL
    SELECT id, name, 'group' AS type FROM application_groups
    ORDER BY name ASC
  `);
  res.json(rows);
});

// Create CTB
router.post('/', async (req, res) => {
  const { title, description = null, application_id = null, application_group_id = null } = req.body;
  const errors = validateCtb(title, application_id, application_group_id);
  if (errors.length) return res.status(422).json({ errors });
  const year = new Date().getFullYear();
  try {
    const { rows } = await db.query(
      `INSERT INTO baseline_ctb (title, description, year, application_id, application_group_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), description || null, year,
       application_id       ? Number(application_id)       : null,
       application_group_id ? Number(application_group_id) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(422).json({ errors: ['A Baseline CTB already exists for this target in the current year'] });
    throw err;
  }
});

// Update CTB
router.put('/:id', async (req, res) => {
  const { title, description = null, application_id = null, application_group_id = null } = req.body;
  const errors = validateCtb(title, application_id, application_group_id);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `UPDATE baseline_ctb
          SET title = $1, description = $2,
              application_id = $3, application_group_id = $4,
              updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [title.trim(), description || null,
       application_id       ? Number(application_id)       : null,
       application_group_id ? Number(application_group_id) : null,
       req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['CTB not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(422).json({ errors: ['A Baseline CTB already exists for this target in the current year'] });
    throw err;
  }
});

// Delete CTB
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM baseline_ctb WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ errors: ['CTB not found'] });
  res.status(204).end();
});

// Create allocation
router.post('/:id/allocations', async (req, res) => {
  const { fte_id = null, tbh_id = null } = req.body;
  const errors = validateAllocation(fte_id, tbh_id);
  if (errors.length) return res.status(422).json({ errors });
  const mv = monthValues(req.body);
  try {
    const { rows } = await db.query(
      `INSERT INTO baseline_ctb_allocations
         (ctb_id, fte_id, tbh_id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [req.params.id,
       fte_id ? Number(fte_id) : null,
       tbh_id ? Number(tbh_id) : null,
       ...mv]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(422).json({ errors: ['FTE or TBH slot not found'] });
    throw err;
  }
});

// Update allocation
router.put('/:id/allocations/:allocId', async (req, res) => {
  const { fte_id = null, tbh_id = null } = req.body;
  const errors = validateAllocation(fte_id, tbh_id);
  if (errors.length) return res.status(422).json({ errors });
  const mv = monthValues(req.body);
  try {
    const { rows } = await db.query(
      `UPDATE baseline_ctb_allocations
          SET fte_id = $1, tbh_id = $2,
              jan=$3, feb=$4, mar=$5, apr=$6, may=$7, jun=$8,
              jul=$9, aug=$10, sep=$11, oct=$12, nov=$13, dec=$14,
              updated_at = NOW()
        WHERE id = $15 AND ctb_id = $16
        RETURNING *`,
      [fte_id ? Number(fte_id) : null,
       tbh_id ? Number(tbh_id) : null,
       ...mv,
       req.params.allocId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['Allocation not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(422).json({ errors: ['FTE or TBH slot not found'] });
    throw err;
  }
});

// Delete allocation
router.delete('/:id/allocations/:allocId', async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM baseline_ctb_allocations WHERE id = $1 AND ctb_id = $2',
    [req.params.allocId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ errors: ['Allocation not found'] });
  res.status(204).end();
});

module.exports = router;
