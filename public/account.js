'use strict';

const $ = (sel) => document.querySelector(sel);

const SPECIES = { dog: 'Собака', cat: 'Кошка', rodent: 'Грызун', bird: 'Птица', other: 'Другое' };
const STATUS = { pending: 'Ожидает', confirmed: 'Подтверждена', completed: 'Проведён', cancelled: 'Отменена' };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const fmtDate = (d) => new Date(d).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
const fmtPrice = (n) => Number(n).toLocaleString('ru-RU') + ' BYN';

async function request(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');
  return data;
}

function switchTab(name) {
  document.querySelectorAll('.tabs__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === name);
  });
  $('#login-form').hidden = name !== 'login';
  $('#register-form').hidden = name !== 'register';
}

function bindAuthForm(form, url) {
  const msg = form.querySelector('.msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'msg is-info';
    msg.textContent = 'Подождите...';

    try {
      const data = await request(url, 'POST', Object.fromEntries(new FormData(form)));
      showCabinet(data.user);
    } catch (err) {
      msg.className = 'msg';
      msg.textContent = err.message;
    }
  });
}

function showCabinet(user) {
  $('#guest').hidden = true;
  $('#cabinet').hidden = false;
  $('#user-name').textContent = user.full_name;
  loadPets();
  loadServices();
  loadSlots();
  loadAppointments();
}

async function loadPets() {
  const list = $('#pets-list');
  const petSelect = $('#b-pet');
  try {
    const pets = await request('/api/me/pets');

        list.innerHTML = pets.map((p) => `
      <li class="pet">
        <span class="pet__ava">${esc(p.name.charAt(0).toUpperCase())}</span>
        <div><b>${esc(p.name)}</b><small>${SPECIES[p.species] || ''}</small></div>
        <button class="pet__del" type="button" data-del="${p.id}">Удалить</button> 
      </li>`).join('') || '<li class="empty">Питомцев пока нет. Добавьте первого.</li>';

    petSelect.innerHTML = pets.length
      ? pets.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')
      : '<option value="">Сначала добавьте питомца</option>';
  } catch (err) {
    list.innerHTML = `<li class="empty">${esc(err.message)}</li>`;
  }
}

async function loadSlots() {
  const select = $('#b-slot');
  const serviceId = $('#b-service').value;

  if (!serviceId) {
    select.innerHTML = '<option value="">Сначала выберите услугу</option>';
    select.disabled = true;
    return;
  }

  try {
    const slots = await request(`/api/slots?service_id=${serviceId}`);

    if ($('#b-service').value !== serviceId) return;

    if (slots.length === 0) {
      select.innerHTML = '<option value="">Свободного времени нет</option>';
      select.disabled = true;
      return;
    }

    select.innerHTML = '<option value="">Выберите время...</option>' +
      slots.map((s) => `<option value="${s.slot_id}">${fmtDate(s.starts_at)} — ${esc(s.doctor)}</option>`).join('');
    select.disabled = false;
  } catch (err) {
    const msg = $('#book-form .msg');
    msg.className = 'msg';
    msg.textContent = err.message;
  }
}

$('#book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = form.querySelector('.msg');
  const btn = form.querySelector('button[type="submit"]');

  const body = {
    pet_id: Number(form.elements.pet_id.value),
    service_id: Number(form.elements.service_id.value),
    slot_id: Number(form.elements.slot_id.value)
  };

  if (!body.pet_id || !body.service_id || !body.slot_id) {
    msg.className = 'msg';
    msg.textContent = 'Выберите питомца, услугу и время';
    return;
  }

  btn.disabled = true; // защита от двойного клика
  msg.className = 'msg is-info';
  msg.textContent = 'Подождите...';

  try {
    const data = await request('/api/me/appointments', 'POST', body);
    msg.className = 'msg is-ok';
    msg.textContent = data.message;
    loadAppointments();
    loadSlots();       
  } catch (err) {
    msg.className = 'msg';
    msg.textContent = err.message;
    loadSlots();
  } finally {
    btn.disabled = false;
  }
});

async function loadAppointments() {
  const box = $('#appointments-list');
  try {
    const list = await request('/api/me/appointments');
    box.innerHTML = list.map((a) => `
      <article class="visit">
        <div class="visit__top">
          <span>${fmtDate(a.starts_at)}</span>
          <span class="tag tag--${a.status}">${STATUS[a.status] || a.status}</span>
        </div>
        <p class="visit__meta">${esc(a.pet_name)} · ${esc(a.services || 'без услуг')}</p>
        <p class="visit__meta">${esc(a.doctor_name)} · <span class="visit__price">${fmtPrice(a.total)}</span></p>
      </article>`).join('') || '<p class="empty">Записей пока нет.</p>';
  } catch (err) {
    box.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

async function loadServices() {
  const select = $('#b-service');
  try {
    const services = await request('/api/services');
    select.innerHTML = '<option value="">Выберите услугу...</option>' +
      services.map((s) => `<option value="${s.id}">${esc(s.name)} — ${fmtPrice(s.price)}</option>`).join('');
  } catch (err) {
    $('#book-form .msg').textContent = err.message;
  }
}

document.querySelectorAll('.tabs__btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

bindAuthForm($('#login-form'), '/api/auth/login');
bindAuthForm($('#register-form'), '/api/auth/register');

$('#pet-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = form.querySelector('.msg');
  msg.textContent = '';

  try {
    await request('/api/me/pets', 'POST', Object.fromEntries(new FormData(form)));
    form.reset();
    loadPets();
  } catch (err) {
    msg.textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await request('/api/auth/logout', 'POST');
  window.location.reload();
});

$('#b-service').addEventListener('change', loadSlots);

$('#pets-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-del]');
  if (!btn) return;
  if (!confirm('Удалить питомца?')) return;

  const msg = $('#pet-form .msg');
  msg.textContent = '';
  btn.disabled = true;
  try {
    await request(`/api/me/pets/${btn.dataset.del}`, 'DELETE');
    loadPets();
  } catch (err) {
    btn.disabled = false;
    msg.textContent = err.message;
  }
});

async function init() {
  try {
    const { user } = await request('/api/auth/me');
    if (user) showCabinet(user);
    else $('#guest').hidden = false;
  } catch (err) {
    $('#guest').hidden = false;
  }
}

init();