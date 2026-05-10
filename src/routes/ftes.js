const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const REGIONS = ['London', 'Birmingham', 'Pune', 'Bangalore', 'Cary', 'New York', 'Frankfurt', 'Berlin'];
const TITLES  = ['Associate', 'AVP', 'VP', 'D', 'MD'];

function validate(first_name, last_name, email, region, title, availability) {
  const errors = [];
  if (!first_name || !first_name.trim()) errors.push('First name is required');
  if (!last_name  || !last_name.trim())  errors.push('Last name is required');
  if (!email || !email.trim())           errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Email is not valid');
  if (!REGIONS.includes(region))         errors.push(`Region must be one of: ${REGIONS.join(', ')}`);
  if (!TITLES.includes(title))           errors.push(`Title must be one of: ${TITLES.join(', ')}`);
  const avail = Number(availability);
  if (!Number.isInteger(avail) || avail < 1 || avail > 100) errors.push('Availability must be a whole number between 1 and 100');
  return errors;
}

// List all
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT * FROM ftes ORDER BY last_name ASC, first_name ASC
  `);
  res.json(rows);
});

// Create one
router.post('/', async (req, res) => {
  const { first_name, last_name, email, region, title, availability = 100 } = req.body;
  const errors = validate(first_name, last_name, email, region, title, availability);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `INSERT INTO ftes (first_name, last_name, email, region, title, availability)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [first_name.trim(), last_name.trim(), email.trim().toLowerCase(), region, title, Number(availability)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['Email address already exists'] });
    throw err;
  }
});

// Update one
router.put('/:id', async (req, res) => {
  const { first_name, last_name, email, region, title, availability = 100 } = req.body;
  const errors = validate(first_name, last_name, email, region, title, availability);
  if (errors.length) return res.status(422).json({ errors });
  try {
    const { rows } = await db.query(
      `UPDATE ftes
          SET first_name = $1, last_name = $2, email = $3,
              region = $4, title = $5, availability = $6, updated_at = NOW()
        WHERE id = $7 RETURNING *`,
      [first_name.trim(), last_name.trim(), email.trim().toLowerCase(), region, title, Number(availability), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['FTE not found'] });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ errors: ['Email address already exists'] });
    throw err;
  }
});

// Delete one
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM ftes WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ errors: ['FTE not found'] });
  res.status(204).end();
});

// Download sample Excel
router.get('/sample', (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['First Name', 'Last Name', 'Email', 'Region', 'Title', 'Availability %'],
    ['Jane',  'Smith',   'jane.smith@example.com',   'London',    'VP',        100],
    ['Raj',   'Patel',   'raj.patel@example.com',    'Pune',      'AVP',       100],
    ['Chris', 'Johnson', 'chris.j@example.com',      'New York',  'D',          80],
    ['Anna',  'Weber',   'anna.weber@example.com',   'Frankfurt', 'Associate', 100],
  ]);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'FTEs');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="ftes_sample.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Bulk upload Excel
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ errors: ['No file uploaded'] });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

  if (!dataRows.length) return res.status(422).json({ errors: ['No data rows found in file'] });

  const results = { inserted: 0, failed: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const [first_name, last_name, email, region, title, avail] = dataRows[i].map(v =>
      v !== undefined ? String(v).trim() : ''
    );
    const rowNum = i + 2;
    const availability = avail === '' ? 100 : Number(avail);
    const errors = validate(first_name, last_name, email, region, title, availability);
    if (errors.length) { results.failed.push({ row: rowNum, errors }); continue; }
    try {
      await db.query(
        `INSERT INTO ftes (first_name, last_name, email, region, title, availability)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE
           SET first_name = $1, last_name = $2, region = $4,
               title = $5, availability = $6, updated_at = NOW()`,
        [first_name, last_name, email.toLowerCase(), region, title, availability]
      );
      results.inserted++;
    } catch (err) {
      results.failed.push({ row: rowNum, errors: [err.message] });
    }
  }

  res.json(results);
});

module.exports = router;
