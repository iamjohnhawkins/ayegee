const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Cloud Run connects via Unix socket; local dev uses host/port
  ...(process.env.INSTANCE_CONNECTION_NAME
    ? { host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` }
    : { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432 }
  ),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
