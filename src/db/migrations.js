const db = require('../db');

async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(255) NOT NULL,
      nar_id    VARCHAR(50)  NOT NULL UNIQUE,
      status    VARCHAR(20)  NOT NULL CHECK (status IN ('INVEST', 'MAINTAIN', 'DISINVEST')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Migrations complete');
}

module.exports = { runMigrations };
