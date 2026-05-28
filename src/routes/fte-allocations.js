const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/fte-allocations/:fteId
// Returns { fte, adc: [], baseline_ctb: [], ctb_projects: [] }
router.get('/:fteId', async (req, res) => {
  const fteId = Number(req.params.fteId);
  if (!Number.isInteger(fteId) || fteId <= 0) {
    return res.status(400).json({ errors: ['Invalid FTE id'] });
  }
  const year = new Date().getFullYear();

  // Fetch FTE
  const { rows: fteRows } = await db.query(
    'SELECT id, first_name, last_name, title, region, email, availability FROM ftes WHERE id = $1',
    [fteId]
  );
  if (!fteRows.length) return res.status(404).json({ errors: ['FTE not found'] });
  const fte = fteRows[0];

  // ADC allocations
  const { rows: adcRows } = await db.query(`
    SELECT
      aa.id           AS alloc_id,
      'adc'           AS source_type,
      a.id            AS parent_id,
      a.title         AS parent_name,
      COALESCE(app.name, grp.name) AS target_name,
      CASE WHEN a.application_id IS NOT NULL THEN 'application' ELSE 'group' END AS target_type,
      a.application_id,
      a.application_group_id,
      NULL::int       AS portfolio_id,
      aa.jan, aa.feb, aa.mar, aa.apr, aa.may, aa.jun,
      aa.jul, aa.aug, aa.sep, aa.oct, aa.nov, aa.dec
    FROM adc_allocations aa
    JOIN adcs a ON a.id = aa.adc_id
    LEFT JOIN applications app       ON app.id = a.application_id
    LEFT JOIN application_groups grp ON grp.id = a.application_group_id
    WHERE aa.fte_id = $1 AND a.year = $2
    ORDER BY COALESCE(app.name, grp.name) ASC, a.title ASC
  `, [fteId, year]);

  // Baseline CTB allocations
  const { rows: ctbRows } = await db.query(`
    SELECT
      ba.id           AS alloc_id,
      'baseline_ctb'  AS source_type,
      b.id            AS parent_id,
      COALESCE(app.name, grp.name) AS parent_name,
      COALESCE(app.name, grp.name) AS target_name,
      CASE WHEN b.application_id IS NOT NULL THEN 'application' ELSE 'group' END AS target_type,
      b.application_id,
      b.application_group_id,
      NULL::int       AS portfolio_id,
      ba.jan, ba.feb, ba.mar, ba.apr, ba.may, ba.jun,
      ba.jul, ba.aug, ba.sep, ba.oct, ba.nov, ba.dec
    FROM baseline_ctb_allocations ba
    JOIN baseline_ctb b ON b.id = ba.ctb_id
    LEFT JOIN applications app       ON app.id = b.application_id
    LEFT JOIN application_groups grp ON grp.id = b.application_group_id
    WHERE ba.fte_id = $1 AND b.year = $2
    ORDER BY COALESCE(app.name, grp.name) ASC
  `, [fteId, year]);

  // CTB Project allocations
  const { rows: projectRows } = await db.query(`
    SELECT
      pa.id           AS alloc_id,
      'ctb_project'   AS source_type,
      p.id            AS parent_id,
      p.title         AS parent_name,
      COALESCE(app.name, grp.name, port.title) AS target_name,
      CASE
        WHEN p.application_id IS NOT NULL       THEN 'application'
        WHEN p.application_group_id IS NOT NULL THEN 'group'
        ELSE 'portfolio'
      END AS target_type,
      p.application_id,
      p.application_group_id,
      p.portfolio_id,
      pa.jan, pa.feb, pa.mar, pa.apr, pa.may, pa.jun,
      pa.jul, pa.aug, pa.sep, pa.oct, pa.nov, pa.dec
    FROM ctb_project_allocations pa
    JOIN ctb_projects p ON p.id = pa.project_id
    LEFT JOIN applications app       ON app.id  = p.application_id
    LEFT JOIN application_groups grp ON grp.id  = p.application_group_id
    LEFT JOIN portfolios port        ON port.id = p.portfolio_id
    WHERE pa.fte_id = $1 AND p.year = $2
    ORDER BY p.title ASC
  `, [fteId, year]);

  res.json({
    fte,
    adc:          adcRows,
    baseline_ctb: ctbRows,
    ctb_projects: projectRows,
  });
});

module.exports = router;
