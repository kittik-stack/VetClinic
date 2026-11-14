const { Pool } = require('pg');

const pool = new Pool({
  database: process.env.PGDATABASE,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула БД:', err.message);
});

module.exports = pool;