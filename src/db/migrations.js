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
  await db.query(`
    CREATE TABLE IF NOT EXISTS application_groups (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS group_id INTEGER
        REFERENCES application_groups(id) ON DELETE SET NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_applications_group_id ON applications(group_id)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ftes (
      id             SERIAL PRIMARY KEY,
      first_name     VARCHAR(100) NOT NULL,
      last_name      VARCHAR(100) NOT NULL,
      email          VARCHAR(255) NOT NULL UNIQUE,
      region         VARCHAR(50)  NOT NULL CHECK (region IN ('London','Birmingham','Pune','Bangalore','Cary','New York','Frankfurt','Berlin')),
      title          VARCHAR(20)  NOT NULL CHECK (title IN ('Associate','AVP','VP','D','MD')),
      availability   INTEGER      NOT NULL DEFAULT 100 CHECK (availability BETWEEN 1 AND 100),
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Migrations complete');
}

module.exports = { runMigrations };
