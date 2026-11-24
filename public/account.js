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
  loadAppointments();
}

async function loadPets() {
  const list = $('#pets-list');
  try {
    const pets = await request('/api/me/pets');
    list.innerHTML = pets.map((p) => `
      <li class="pet">
        <span class="pet__ava">${esc(p.name.charAt(0).toUpperCase())}</span>
        <div><b>${esc(p.name)}</b><small>${SPECIES[p.species] || ''}</small></div>
      </li>`).join('') || '<li class="empty">Питомцев пока нет. Добавьте первого.</li>';
  } catch (err) {
    list.innerHTML = `<li class="empty">${esc(err.message)}</li>`;
  }
}

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