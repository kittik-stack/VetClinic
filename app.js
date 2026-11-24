const path = require('path');
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const app = express();
const PORT = 3000;
const SPECIES = ['dog', 'cat', 'rodent', 'bird', 'other'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Необходимо войти в систему' });
  }
  next();
}

async function checkDb() {
  try {
    await pool.query('SELECT 1');
    console.log('База данных подключена');
  } catch (err) {
    console.error('Ошибка подключения к БД:', err.message);
  }
}
checkDb();

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, price, description, duration_min
         FROM services
        WHERE is_active = TRUE
        ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить услуги' });
  }
});

app.get('/api/specialists', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, specialization, photo_url
         FROM specialists
        WHERE is_active = TRUE
        ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить врачей' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, phone, email, password } = req.body;

    if (!full_name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    const cleanPhone = String(phone).replace(/[^\d+]/g, '');
    if (!/^\+375\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Телефон должен быть в формате +375XXXXXXXXX' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'Некорректный email' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, role`,
      [String(full_name).trim(), cleanPhone, String(email).trim(), passwordHash]
    );

    const newUser = result.rows[0];
    req.session.userId = newUser.id;
    res.status(201).json({ message: 'Регистрация успешна', user: newUser });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Этот телефон или email уже зарегистрирован' });
    }
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');

    if (!cleanPhone || !password) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ error: 'Неверный телефон или пароль' });
    }

    req.session.userId = user.id;
    res.json({
      message: 'Вход выполнен',
      user: { id: user.id, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Не удалось выйти' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Вы вышли из системы' });
  });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ user: null });
    }
    const result = await pool.query(
      'SELECT id, full_name, role FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json({ user: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/me/pets', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, species FROM pets WHERE owner_id = $1 ORDER BY id',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении питомцев' });
  }
});

app.post('/api/me/pets', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const { species } = req.body;

    if (!name || !SPECIES.includes(species)) {
      return res.status(400).json({ error: 'Укажите кличку и вид питомца' });
    }

    const result = await pool.query(
      `INSERT INTO pets (owner_id, name, species)
       VALUES ($1, $2, $3)
       RETURNING id, name, species`,
      [req.session.userId, name, species]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при добавлении питомца' });
  }
});

app.get('/api/me/appointments', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS appointment_id,
              a.status,
              p.name AS pet_name,
              d.full_name AS doctor_name,
              sl.starts_at,
              sl.ends_at,
              COALESCE(string_agg(s.name, ', ' ORDER BY s.name), '') AS services,
              COALESCE(sum(aps.price_at_booking), 0) AS total
         FROM appointments a
         JOIN pets p ON p.id = a.pet_id
         JOIN slots sl ON sl.id = a.slot_id
         JOIN specialists d ON d.id = sl.specialist_id
         LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
         LEFT JOIN services s ON s.id = aps.service_id
        WHERE a.client_id = $1
        GROUP BY a.id, p.name, d.full_name, sl.starts_at, sl.ends_at
        ORDER BY sl.starts_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при загрузке истории' });
  }
});

app.post('/api/me/appointments', requireAuth, async (req, res) => {
  const { pet_id, slot_id, service_id } = req.body;
  if (!pet_id || !slot_id || !service_id) {
    return res.status(400).json({ error: 'Укажите питомца, время и услугу' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const pet = await client.query(
      'SELECT 1 FROM pets WHERE id = $1 AND owner_id = $2',
      [pet_id, req.session.userId]
    );
    if (!pet.rowCount) throw new HttpError(400, 'Питомец не найден');

    const slot = await client.query(
      `SELECT sl.id, sl.specialist_id
         FROM slots sl
        WHERE sl.id = $1
          AND NOT sl.is_blocked
          AND sl.starts_at > now()
          AND NOT EXISTS (SELECT 1 FROM appointments a
                           WHERE a.slot_id = sl.id AND a.status <> 'cancelled')
          FOR UPDATE`,
      [slot_id]
    );
    if (!slot.rowCount) throw new HttpError(409, 'Это время уже занято или недоступно');

    const service = await client.query(
      `SELECT s.price
         FROM services s
         JOIN specialist_services ss ON ss.service_id = s.id
        WHERE s.id = $1 AND s.is_active AND ss.specialist_id = $2`,
      [service_id, slot.rows[0].specialist_id]
    );
    if (!service.rowCount) throw new HttpError(400, 'Этот врач не оказывает выбранную услугу');

    const appointment = await client.query(
      `INSERT INTO appointments (client_id, pet_id, slot_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [req.session.userId, pet_id, slot_id]
    );
    const appointmentId = appointment.rows[0].id;

    await client.query(
      `INSERT INTO appointment_services (appointment_id, service_id, price_at_booking)
       VALUES ($1, $2, $3)`,
      [appointmentId, service_id, service.rows[0].price]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Вы успешно записаны', appointment_id: appointmentId });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Это время уже занято' });
    }
    console.error(err);
    res.status(500).json({ error: 'Не удалось записаться' });
  } finally {
    if (client) client.release();
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));