const express = require('express');
const db = require('../db');

const router = express.Router();

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function validateProject(body) {
  const errors = [];
  const { title, application_id, application_group_id, portfolio_id, reason } = body;
  if (!title || !String(title).trim()) errors.push('Title is required');
  const targets = [application_id, application_group_id, portfolio_id]
    .filter(v => v && Number.isInteger(Number(v)) && Number(v) > 0);
  if (targets.length === 0) errors.push('A target application, application group, or portfolio is required');
  if (targets.length > 1)   errors.push('Only one target may be set');
  const validReasons = ['Regulatory','Revenue Protection','Revenue Generation','Cost Reduction'];
  if (!reason || !validReasons.includes(reason)) errors.push('A valid reason is required');
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

// List all CTB projects for current year with embedded allocations
router.get('/', async (req, res) => {
  const year = new Date().getFullYear();
  const { rows } = await db.query(`
    SELECT
      p.id, p.title, p.description, p.year,
      p.status, p.reason, p.priority,
      p.benefit_eur, p.external_cost_eur,
      p.delivery_lead_id,
      p.application_id, p.application_group_id, p.portfolio_id,
      p.created_at, p.updated_at,
      COALESCE(app.name, ag.name, port.title) AS target_name,
      CASE
        WHEN p.application_id IS NOT NULL THEN 'application'
        WHEN p.application_group_id IS NOT NULL THEN 'group'
        ELSE 'portfolio'
      END AS target_type,
      dl.first_name || ' ' || dl.last_name AS delivery_lead_name,
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
    FROM ctb_projects p
    LEFT JOIN applications        app  ON app.id  = p.application_id
    LEFT JOIN application_groups  ag   ON ag.id   = p.application_group_id
    LEFT JOIN portfolios          port ON port.id  = p.portfolio_id
    LEFT JOIN ftes                dl   ON dl.id   = p.delivery_lead_id
    LEFT JOIN ctb_project_allocations al ON al.project_id = p.id
    LEFT JOIN ftes f              ON f.id = al.fte_id
    LEFT JOIN tbh_slots t         ON t.id = al.tbh_id
    WHERE p.year = $1
    GROUP BY p.id, app.name, ag.name, port.title, dl.first_name, dl.last_name
    ORDER BY target_name ASC, p.title ASC
  `, [year]);
  res.json(rows);
});

// Combined target list for autocomplete (applications + groups + portfolios)
router.get('/targets', async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, name, 'application' AS type, group_id FROM applications
    UNION ALL
    SELECT id, name, 'group' AS type, NULL AS group_id FROM application_groups
    UNION ALL
    SELECT id, title AS name, 'portfolio' AS type, NULL AS group_id FROM portfolios
    ORDER BY name ASC
  `);
  res.json(rows);
});

// Get single project with full details + allocations
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      p.id, p.title, p.description, p.year,
      p.status, p.reason, p.priority,
      p.benefit_eur, p.external_cost_eur,
      p.delivery_lead_id,
      p.application_id, p.application_group_id, p.portfolio_id,
      p.created_at, p.updated_at,
      COALESCE(app.name, ag.name, port.title) AS target_name,
      CASE
        WHEN p.application_id IS NOT NULL THEN 'application'
        WHEN p.application_group_id IS NOT NULL THEN 'group'
        ELSE 'portfolio'
      END AS target_type,
      dl.first_name || ' ' || dl.last_name AS delivery_lead_name,
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
    FROM ctb_projects p
    LEFT JOIN applications        app  ON app.id  = p.application_id
    LEFT JOIN application_groups  ag   ON ag.id   = p.application_group_id
    LEFT JOIN portfolios          port ON port.id  = p.portfolio_id
    LEFT JOIN ftes                dl   ON dl.id   = p.delivery_lead_id
    LEFT JOIN ctb_project_allocations al ON al.project_id = p.id
    LEFT JOIN ftes f              ON f.id = al.fte_id
    LEFT JOIN tbh_slots t         ON t.id = al.tbh_id
    WHERE p.id = $1
    GROUP BY p.id, app.name, ag.name, port.title, dl.first_name, dl.last_name
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ errors: ['Project not found'] });
  res.json(rows[0]);
});

// Create project
router.post('/', async (req, res) => {
  const {
    title, description = null,
    application_id = null, application_group_id = null, portfolio_id = null,
    status = 'Proposed', reason, priority = 'Medium',
    benefit_eur = 0, external_cost_eur = 0, delivery_lead_id = null
  } = req.body;
  const errors = validateProject(req.body);
  if (errors.length) return res.status(422).json({ errors });
  const year = new Date().getFullYear();
  const { rows } = await db.query(
    `INSERT INTO ctb_projects
       (title, description, year, status, reason, priority,
        benefit_eur, external_cost_eur, delivery_lead_id,
        application_id, application_group_id, portfolio_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      String(title).trim(), description || null, year,
      status, reason, priority,
      Number(benefit_eur) || 0, Number(external_cost_eur) || 0,
      delivery_lead_id ? Number(delivery_lead_id) : null,
      application_id       ? Number(application_id)       : null,
      application_group_id ? Number(application_group_id) : null,
      portfolio_id         ? Number(portfolio_id)         : null
    ]
  );
  res.status(201).json(rows[0]);
});

// Update project
router.put('/:id', async (req, res) => {
  const {
    title, description = null,
    application_id = null, application_group_id = null, portfolio_id = null,
    status = 'Proposed', reason, priority = 'Medium',
    benefit_eur = 0, external_cost_eur = 0, delivery_lead_id = null
  } = req.body;
  const errors = validateProject(req.body);
  if (errors.length) return res.status(422).json({ errors });
  const { rows } = await db.query(
    `UPDATE ctb_projects
        SET title=$1, description=$2, status=$3, reason=$4, priority=$5,
            benefit_eur=$6, external_cost_eur=$7, delivery_lead_id=$8,
            application_id=$9, application_group_id=$10, portfolio_id=$11,
            updated_at=NOW()
      WHERE id=$12
      RETURNING *`,
    [
      String(title).trim(), description || null,
      status, reason, priority,
      Number(benefit_eur) || 0, Number(external_cost_eur) || 0,
      delivery_lead_id ? Number(delivery_lead_id) : null,
      application_id       ? Number(application_id)       : null,
      application_group_id ? Number(application_group_id) : null,
      portfolio_id         ? Number(portfolio_id)         : null,
      req.params.id
    ]
  );
  if (!rows.length) return res.status(404).json({ errors: ['Project not found'] });
  res.json(rows[0]);
});

// Delete project
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM ctb_projects WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ errors: ['Project not found'] });
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
      `INSERT INTO ctb_project_allocations
         (project_id, fte_id, tbh_id, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
      `UPDATE ctb_project_allocations
          SET fte_id=$1, tbh_id=$2,
              jan=$3, feb=$4, mar=$5, apr=$6, may=$7, jun=$8,
              jul=$9, aug=$10, sep=$11, oct=$12, nov=$13, dec=$14,
              updated_at=NOW()
        WHERE id=$15 AND project_id=$16
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
    'DELETE FROM ctb_project_allocations WHERE id=$1 AND project_id=$2',
    [req.params.allocId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ errors: ['Allocation not found'] });
  res.status(204).end();
});

module.exports = router;
