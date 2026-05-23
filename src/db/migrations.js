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
  await db.query(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id                   SERIAL PRIMARY KEY,
      title                VARCHAR(255) NOT NULL UNIQUE,
      sponsor_first_name   VARCHAR(100) NOT NULL,
      sponsor_last_name    VARCHAR(100) NOT NULL,
      sponsor_email        VARCHAR(255) NOT NULL,
      owner_id             INTEGER      NOT NULL REFERENCES ftes(id) ON DELETE RESTRICT,
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS adcs (
      id                   SERIAL PRIMARY KEY,
      title                VARCHAR(255) NOT NULL,
      description          TEXT,
      year                 INTEGER      NOT NULL,
      application_id       INTEGER      REFERENCES applications(id) ON DELETE CASCADE,
      application_group_id INTEGER      REFERENCES application_groups(id) ON DELETE CASCADE,
      jan  NUMERIC(6,2) NOT NULL DEFAULT 0,
      feb  NUMERIC(6,2) NOT NULL DEFAULT 0,
      mar  NUMERIC(6,2) NOT NULL DEFAULT 0,
      apr  NUMERIC(6,2) NOT NULL DEFAULT 0,
      may  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jun  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jul  NUMERIC(6,2) NOT NULL DEFAULT 0,
      aug  NUMERIC(6,2) NOT NULL DEFAULT 0,
      sep  NUMERIC(6,2) NOT NULL DEFAULT 0,
      oct  NUMERIC(6,2) NOT NULL DEFAULT 0,
      nov  NUMERIC(6,2) NOT NULL DEFAULT 0,
      dec  NUMERIC(6,2) NOT NULL DEFAULT 0,
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_adc_target CHECK (
        (application_id IS NOT NULL AND application_group_id IS NULL) OR
        (application_id IS NULL AND application_group_id IS NOT NULL)
      )
    )
  `);
  await db.query(`DROP INDEX IF EXISTS idx_adc_unique_app`);
  await db.query(`DROP INDEX IF EXISTS idx_adc_unique_group`);
  // Drop month columns from adcs (moved to adc_allocations)
  for (const col of ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']) {
    await db.query(`ALTER TABLE adcs DROP COLUMN IF EXISTS ${col}`);
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS tbh_slots (
      id         SERIAL PRIMARY KEY,
      label      VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS adc_allocations (
      id      SERIAL PRIMARY KEY,
      adc_id  INTEGER NOT NULL REFERENCES adcs(id) ON DELETE CASCADE,
      fte_id  INTEGER REFERENCES ftes(id) ON DELETE RESTRICT,
      tbh_id  INTEGER REFERENCES tbh_slots(id) ON DELETE RESTRICT,
      jan  NUMERIC(6,2) NOT NULL DEFAULT 0,
      feb  NUMERIC(6,2) NOT NULL DEFAULT 0,
      mar  NUMERIC(6,2) NOT NULL DEFAULT 0,
      apr  NUMERIC(6,2) NOT NULL DEFAULT 0,
      may  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jun  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jul  NUMERIC(6,2) NOT NULL DEFAULT 0,
      aug  NUMERIC(6,2) NOT NULL DEFAULT 0,
      sep  NUMERIC(6,2) NOT NULL DEFAULT 0,
      oct  NUMERIC(6,2) NOT NULL DEFAULT 0,
      nov  NUMERIC(6,2) NOT NULL DEFAULT 0,
      dec  NUMERIC(6,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_allocation_person CHECK (
        (fte_id IS NOT NULL AND tbh_id IS NULL) OR
        (fte_id IS NULL  AND tbh_id IS NOT NULL)
      )
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_adc_alloc_adc_id ON adc_allocations(adc_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_adc_alloc_fte_id ON adc_allocations(fte_id) WHERE fte_id IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_adc_alloc_tbh_id ON adc_allocations(tbh_id) WHERE tbh_id IS NOT NULL`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS baseline_ctb (
      id                   SERIAL PRIMARY KEY,
      year                 INTEGER      NOT NULL,
      application_id       INTEGER      REFERENCES applications(id) ON DELETE CASCADE,
      application_group_id INTEGER      REFERENCES application_groups(id) ON DELETE CASCADE,
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_ctb_target CHECK (
        (application_id IS NOT NULL AND application_group_id IS NULL) OR
        (application_id IS NULL     AND application_group_id IS NOT NULL)
      )
    )
  `);
  await db.query(`ALTER TABLE baseline_ctb DROP COLUMN IF EXISTS title`);
  await db.query(`ALTER TABLE baseline_ctb DROP COLUMN IF EXISTS description`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ctb_unique_app   ON baseline_ctb(application_id, year)       WHERE application_id       IS NOT NULL`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ctb_unique_group ON baseline_ctb(application_group_id, year) WHERE application_group_id IS NOT NULL`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS baseline_ctb_allocations (
      id      SERIAL PRIMARY KEY,
      ctb_id  INTEGER NOT NULL REFERENCES baseline_ctb(id) ON DELETE CASCADE,
      fte_id  INTEGER REFERENCES ftes(id) ON DELETE RESTRICT,
      tbh_id  INTEGER REFERENCES tbh_slots(id) ON DELETE RESTRICT,
      jan  NUMERIC(6,2) NOT NULL DEFAULT 0,
      feb  NUMERIC(6,2) NOT NULL DEFAULT 0,
      mar  NUMERIC(6,2) NOT NULL DEFAULT 0,
      apr  NUMERIC(6,2) NOT NULL DEFAULT 0,
      may  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jun  NUMERIC(6,2) NOT NULL DEFAULT 0,
      jul  NUMERIC(6,2) NOT NULL DEFAULT 0,
      aug  NUMERIC(6,2) NOT NULL DEFAULT 0,
      sep  NUMERIC(6,2) NOT NULL DEFAULT 0,
      oct  NUMERIC(6,2) NOT NULL DEFAULT 0,
      nov  NUMERIC(6,2) NOT NULL DEFAULT 0,
      dec  NUMERIC(6,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_ctb_alloc_person CHECK (
        (fte_id IS NOT NULL AND tbh_id IS NULL) OR
        (fte_id IS NULL     AND tbh_id IS NOT NULL)
      )
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ctb_alloc_ctb_id ON baseline_ctb_allocations(ctb_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ctb_alloc_fte_id ON baseline_ctb_allocations(fte_id) WHERE fte_id IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ctb_alloc_tbh_id ON baseline_ctb_allocations(tbh_id) WHERE tbh_id IS NOT NULL`);
  console.log('Migrations complete');
}

module.exports = { runMigrations };
