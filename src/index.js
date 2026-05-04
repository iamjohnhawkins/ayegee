const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const db = require('./db');
const { runMigrations } = require('./db/migrations');
const applicationsRouter = require('./routes/applications');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/applications', applicationsRouter);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.warn('DB not available — running without database:', err.message);
  }
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
