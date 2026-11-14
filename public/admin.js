'use strict';

/* ===== ДАННЫЕ: демо-набор. Сохраняется в браузере (localStorage), сервер не нужен ===== */
const KEY = 'healthy-paws-admin-v1';
const STATUS = { pending: 'Ожидает', confirmed: 'Подтверждена', completed: 'Проведён', cancelled: 'Отменена' };
const DOCTORS = ['Анна Смирнова', 'Иван Петров', 'Елена Смит'];

const seed = () => ({
  settings: { admin: 'Анна Смирнова', phone: '+375171234567', address: 'г. Минск, ул. Лесная, 12' },
  seq: { service: 8, appt: 9 },
  services: [
    { id: 1, name: 'Первичный осмотр', description: 'Осмотр питомца и оценка общего состояния, план лечения.', price: 45, duration: 30, hidden: false },
    { id: 2, name: 'Вакцинация', description: 'Комплексные прививки, запись в ветеринарный паспорт.', price: 60, duration: 30, hidden: false },
    { id: 3, name: 'УЗИ', description: 'Ультразвуковое исследование органов брюшной полости и сердца.', price: 55, duration: 30, hidden: false },
    { id: 4, name: 'Чистка зубов', description: 'Снятие зубного камня и лечение дёсен под наркозом.', price: 120, duration: 60, hidden: false },
    { id: 5, name: 'Лабораторные анализы', description: 'Общий и биохимический анализ крови, результат в день сдачи.', price: 35, duration: 20, hidden: false },
    { id: 6, name: 'Хирургия', description: 'Плановые и экстренные операции любой сложности.', price: 250, duration: 90, hidden: false },
    { id: 7, name: 'Рентген', description: 'Рентгенография костей и грудной клетки.', price: 50, duration: 30, hidden: true }
  ],
  clients: [
    { id: 1, name: 'Иван Иванов', phone: '+375291234567', email: 'ivan@example.by', pets: ['Бадди (собака)', 'Мурка (кошка)'] },
    { id: 2, name: 'Мария Кузнецова', phone: '+375441234567', email: 'maria@example.by', pets: ['Рекс (собака)'] },
    { id: 3, name: 'Алексей Ковальчук', phone: '+375295718204', email: 'alexey.kovalchuk@example.by', pets: ['Бублик (собака)'] },
    { id: 4, name: 'Анна Мельник', phone: '+375259073346', email: 'anna.melnik@example.by', pets: ['Снежок (кошка)'] },
    { id: 5, name: 'Сергей Лукашевич', phone: '+375291846270', email: 'sergey.lukashevich@example.by', pets: ['Хомка (грызун)'] }
  ],
  appointments: [
    { id: 1, clientId: 1, pet: 'Бадди', serviceId: 1, doctor: 'Анна Смирнова', date: '2026-10-20T10:00', status: 'completed' },
    { id: 2, clientId: 1, pet: 'Бадди', serviceId: 2, doctor: 'Анна Смирнова', date: '2026-10-27T11:00', status: 'completed' },
    { id: 3, clientId: 2, pet: 'Рекс', serviceId: 1, doctor: 'Анна Смирнова', date: '2026-11-09T10:00', status: 'confirmed' },
    { id: 4, clientId: 1, pet: 'Мурка', serviceId: 3, doctor: 'Иван Петров', date: '2026-11-09T12:00', status: 'pending' },
    { id: 5, clientId: 3, pet: 'Бублик', serviceId: 2, doctor: 'Анна Смирнова', date: '2026-11-10T09:00', status: 'confirmed' },
    { id: 6, clientId: 4, pet: 'Снежок', serviceId: 1, doctor: 'Анна Смирнова', date: '2026-11-10T10:30', status: 'cancelled' },
    { id: 7, clientId: 5, pet: 'Хомка', serviceId: 1, doctor: 'Иван Петров', date: '2026-11-11T11:30', status: 'pending' },
    { id: 8, clientId: 2, pet: 'Рекс', serviceId: 4, doctor: 'Елена Смит', date: '2026-11-12T14:00', status: 'confirmed' }
  ]
});

let db = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { return seed(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* без сохранения тоже работает */ } }

/* ===== ПОМОЩНИКИ ===== */
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Number(n).toLocaleString('ru-RU') + ' BYN';
const fmtDate = (d) => new Date(d).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const fmtPhone = (p) => String(p).replace(/^\+375(\d{2})(\d{3})(\d{2})(\d{2})$/, '+375 ($1) $2-$3-$4');
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const clientOf = (id) => db.clients.find((c) => c.id === id);
const serviceOf = (id) => db.services.find((s) => s.id === id);

/* ===== РАЗДЕЛЫ ===== */
let view = 'services', apptFilter = 'all';
const VIEWS = {
  services: { title: 'Управление услугами', render: renderServices, add: true },
  appointments: { title: 'Записи', render: renderAppointments },
  clients: { title: 'Клиенты', render: renderClients },
  settings: { title: 'Настройки', render: renderSettings }
};

function go(name) {
  view = name;
  $('#title').textContent = VIEWS[name].title;
  $('#add').classList.toggle('hidden', !VIEWS[name].add);
  $('#add').style.display = VIEWS[name].add ? '' : 'none';
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
  VIEWS[name].render();
}

function renderSidebar() {
  $('#me-name').textContent = db.settings.admin;
  $('#me-ava').textContent = initials(db.settings.admin);
}

/* --- Каталог услуг --- */
function renderServices() {
  $('#view').innerHTML = db.services.length ? `<div class="cards">${db.services.map((s) => `
    <article class="card ${s.hidden ? 'is-hidden' : ''}">
      <h3>${esc(s.name)} ${s.hidden ? '<span class="tag">Скрыта</span>' : ''}</h3>
      <p>${esc(s.description)}</p>
      <div class="card__meta"><span>${money(s.price)}</span><span>${s.duration} мин</span></div>
      <div class="card__act">
        <button class="link" data-act="edit" data-id="${s.id}">Ред.</button>
        <button class="link" data-act="toggle" data-id="${s.id}">${s.hidden ? 'Показать' : 'Скрыть'}</button>
      </div>
    </article>`).join('')}</div>` : '<div class="empty">Услуг пока нет. Добавьте первую.</div>';
}

function serviceForm(s) {
  const v = s || { name: '', description: '', price: '', duration: 30, hidden: false };
  $('#dlg-body').innerHTML = `
    <h3>${s ? 'Редактирование услуги' : 'Новая услуга'}</h3>
    <form class="form" id="svc-form" novalidate>
      <label>Название <input name="name" value="${esc(v.name)}"></label>
      <label>Описание <textarea name="description" rows="3">${esc(v.description)}</textarea></label>
      <div class="two">
        <label>Цена, BYN <input name="price" type="number" min="0" step="0.5" value="${esc(v.price)}"></label>
        <label>Длительность, мин <input name="duration" type="number" min="5" step="5" value="${esc(v.duration)}"></label>
      </div>
      <label class="chk"><input type="checkbox" name="visible" ${v.hidden ? '' : 'checked'}> Показывать на сайте</label>
      <p class="err"></p>
      <div class="row"><button class="btn">Сохранить</button><button type="button" class="link" data-close>Отмена</button></div>
    </form>`;
  $('#dlg').showModal();
  $('#svc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const data = { name: f.name.value.trim(), description: f.description.value.trim(), price: parseFloat(f.price.value), duration: parseInt(f.duration.value, 10), hidden: !f.visible.checked };
    const err = !data.name ? 'Введите название'
      : !(data.price >= 0) ? 'Укажите цену (0 или больше)'
      : !(data.duration > 0) ? 'Укажите длительность в минутах' : '';
    if (err) return (e.target.querySelector('.err').textContent = err);
    if (s) Object.assign(s, data);
    else db.services.push({ id: db.seq.service++, ...data });
    save(); $('#dlg').close(); renderServices();
  });
}

/* --- Записи --- */
function renderAppointments() {
  const list = db.appointments.filter((a) => apptFilter === 'all' || a.status === apptFilter)
    .sort((a, b) => b.date.localeCompare(a.date));
  $('#view').innerHTML = `
    <div class="toolbar">
      <label class="row muted">Показать:
        <select class="sm" id="appt-filter">
          <option value="all">Все записи</option>
          ${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${apptFilter === k ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="tbl"><table>
      <tr><th>Дата и время</th><th>Клиент</th><th>Питомец</th><th>Услуга</th><th>Врач</th><th>Статус</th><th></th></tr>
      ${list.map((a) => {
        const c = clientOf(a.clientId), s = serviceOf(a.serviceId);
        return `<tr>
          <td>${fmtDate(a.date)}</td>
          <td>${esc(c ? c.name : '—')}<span class="sub">${c ? fmtPhone(c.phone) : ''}</span></td>
          <td>${esc(a.pet)}</td><td>${esc(s ? s.name : '—')}</td><td>${esc(a.doctor)}</td>
          <td><select class="sm" data-status="${a.id}">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${a.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
          <td class="act"><button class="link danger" data-act="del-appt" data-id="${a.id}">Удалить</button></td></tr>`;
      }).join('') || '<tr><td colspan="7" class="muted">Записей с таким статусом нет</td></tr>'}
    </table></div>`;
}

/* --- Клиенты (с историей посещений) --- */
function renderClients() {
  $('#view').innerHTML = `<div class="tbl"><table>
    <tr><th>Клиент</th><th>Телефон</th><th>Email</th><th>Питомцы</th><th>Визитов</th><th></th></tr>
    ${db.clients.map((c) => `<tr>
      <td><b>${esc(c.name)}</b></td><td>${fmtPhone(c.phone)}</td><td>${esc(c.email)}</td>
      <td>${esc(c.pets.join(', '))}</td>
      <td>${db.appointments.filter((a) => a.clientId === c.id && a.status !== 'cancelled').length}</td>
      <td class="act"><button class="link" data-act="history" data-id="${c.id}">История</button></td></tr>`).join('')}
  </table></div>`;
}

function showHistory(id) {
  const c = clientOf(id);
  const visits = db.appointments.filter((a) => a.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  $('#dlg-body').innerHTML = `
    <h3>${esc(c.name)}</h3>
    <p class="muted" style="margin-bottom:12px">${fmtPhone(c.phone)} · ${esc(c.email)}</p>
    ${visits.map((a) => {
      const s = serviceOf(a.serviceId);
      return `<div class="visit"><div class="visit__top"><span>${fmtDate(a.date)}</span><span class="tag ${a.status}">${STATUS[a.status]}</span></div>
        <span>${esc(a.pet)} · ${esc(s ? s.name : '—')}</span><span class="muted">${esc(a.doctor)}${s ? ' · ' + money(s.price) : ''}</span></div>`;
    }).join('') || '<p class="muted">Посещений пока не было.</p>'}
    <div class="row" style="margin-top:16px"><button class="btn btn--line" data-close>Закрыть</button></div>`;
  $('#dlg').showModal();
}

/* --- Настройки --- */
function renderSettings() {
  const st = db.settings;
  $('#view').innerHTML = `
    <form class="panel form" id="set-form" novalidate>
      <label>Имя администратора <input name="admin" value="${esc(st.admin)}"></label>
      <label>Телефон клиники <input name="phone" value="${esc(fmtPhone(st.phone))}" placeholder="+375 (17) 123-45-67"></label>
      <label>Адрес <input name="address" value="${esc(st.address)}"></label>
      <p class="err"></p>
      <div class="row"><button class="btn">Сохранить</button><button type="button" class="link danger" id="reset">Сбросить демо-данные</button></div>
    </form>`;
  $('#set-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements, phone = f.phone.value.replace(/[^\d+]/g, '');
    const err = f.admin.value.trim().length < 2 ? 'Введите имя администратора'
      : !/^\+375\d{9}$/.test(phone) ? 'Телефон в формате +375 (17) 123-45-67' : '';
    const box = e.target.querySelector('.err');
    if (err) return (box.textContent = err);
    db.settings = { admin: f.admin.value.trim(), phone, address: f.address.value.trim() };
    save(); renderSidebar();
    box.className = 'ok'; box.textContent = 'Сохранено';
  });
  $('#reset').addEventListener('click', () => {
    if (confirm('Вернуть демо-данные? Все изменения будут потеряны.')) { db = seed(); save(); renderSidebar(); go('services'); }
  });
}

/* ===== СОБЫТИЯ ===== */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-view]');
  if (!t) return;
  if (t.dataset.view) return go(t.dataset.view);
  if (t.hasAttribute('data-close')) return $('#dlg').close();
  const id = Number(t.dataset.id);
  switch (t.dataset.act) {
    case 'edit': serviceForm(serviceOf(id)); break;
    case 'toggle': { const s = serviceOf(id); s.hidden = !s.hidden; save(); renderServices(); break; }
    case 'history': showHistory(id); break;
    case 'del-appt':
      if (confirm('Удалить запись?')) { db.appointments = db.appointments.filter((a) => a.id !== id); save(); renderAppointments(); }
      break;
  }
});
$('#add').addEventListener('click', () => serviceForm(null));
$('#dlg').addEventListener('click', (e) => { if (e.target === $('#dlg')) $('#dlg').close(); });   // клик по фону закрывает окно

document.addEventListener('change', (e) => {
  if (e.target.id === 'appt-filter') { apptFilter = e.target.value; renderAppointments(); }
  if (e.target.dataset.status) {
    db.appointments.find((a) => a.id === Number(e.target.dataset.status)).status = e.target.value;
    save();
  }
});

renderSidebar();
go('services');
