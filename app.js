const path = require('path');
require('dotenv').config(); 

const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


async function checkDb() {
  try {
    await pool.query('SELECT 1');
    console.log(' База данных подключена');
  } catch (err) {
    console.error(' Ошибка подключения к БД:', err.message);
  }
}
checkDb();


app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, price, description, duration_min 
      FROM services 
      WHERE is_active = TRUE 
      ORDER BY id ASC;
`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить услуги' });
  }
});

app.get('/', (req, res) => {
  res.send('Сервер работает');
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));