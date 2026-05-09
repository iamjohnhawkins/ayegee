const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const NAR_ID_RE = /^\d{6}-\d+$/;
const VALID_STATUSES = ['INVEST', 'MAINTAIN', 'DISINVEST'];

function validate(name, nar_id, status) {
  const errors = [];
  if (!name || !name.trim()) errors.push('Name is required');
  if (!nar_id || !NAR_ID_RE.test(nar_id.trim())) errors.push('NAR ID must be in the format 173062-1');
  if (!VALID_STATUSES.includes(status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  return errors;
}

// List all (with group name)
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, g.name AS group_name
    FROM applications a
    LEFT JOIN application_groups g ON g.id = a.group_id
    ORDER BY a.name ASC
  `);
  res.json(rows);
});

// Create one
router.post('/', async (req, res) => {
  const { name, nar_id, status, group_id = null } = req.body;
  const errors = validate(name, nar_id, status);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `INSERT INTO applications (name, nar_id, status, group_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), nar_id.trim(), status, group_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['NAR ID already exists'] });
    throw err;
  }
});

// Update one
router.put('/:id', async (req, res) => {
  const { name, nar_id, status, group_id = null } = req.body;
  const errors = validate(name, nar_id, status);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `UPDATE applications
          SET name = $1, nar_id = $2, status = $3, group_id = $4, updated_at = NOW()
        WHERE id = $5 RETURNING *`,
      [name.trim(), nar_id.trim(), status, group_id || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['Application not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['NAR ID already exists'] });
    throw err;
  }
});

// Delete one
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ errors: ['Application not found'] });
  res.status(204).end();
});

// Download sample Excel
router.get('/sample', (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'NAR ID', 'Status'],
    ['Customer Portal', '173062-1', 'INVEST'],
    ['ERP Modernization', '284751-2', 'MAINTAIN'],
    ['Legacy CRM', '391840-3', 'DISINVEST'],
  ]);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="applications_sample.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Bulk upload Excel
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ errors: ['No file uploaded'] });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Skip header row
  const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

  if (!dataRows.length) return res.status(422).json({ errors: ['No data rows found in file'] });

  const results = { inserted: 0, failed: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const [name, nar_id, status] = dataRows[i].map(v => (v !== undefined ? String(v).trim() : ''));
    const rowNum = i + 2;
    const errors = validate(name, nar_id, status?.toUpperCase());
    if (errors.length) {
      results.failed.push({ row: rowNum, errors });
      continue;
    }
    try {
      await db.query(
        `INSERT INTO applications (name, nar_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (nar_id) DO UPDATE SET name = $1, status = $3, updated_at = NOW()`,
        [name, nar_id, status.toUpperCase()]
      );
      results.inserted++;
    } catch (err) {
      results.failed.push({ row: rowNum, errors: [err.message] });
    }
  }

  res.json(results);
});

module.exports = router;
