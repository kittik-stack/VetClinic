'use strict';

const $ = (sel) => document.querySelector(sel);

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
 
const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#dfe6f3"/><text x="50%" y="52%" font-size="96" text-anchor="middle">🐾</text></svg>'
);
const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const avatarHtml = (letters) => `
  <div class="doctor__ph"><span class="doctor__avatar" aria-hidden="true">${letters}</span></div>`;

async function getServices() {
  try{
    const res = await fetch('/api/services');
    if(!res.ok){ throw new Error(`Ошибка http: ${res.status}`);}

    const services = await res.json();
    return services;
  }catch(error){
    console.error('Не удалось загрузить услуги:', error);
    return [];
  }
}

async function getDoctors() {
  try{
    const res = await fetch('/api/specialists');
    if(!res.ok){ throw new Error(`Ошибка http: ${res.status}`);}

    const doctors = await res.json();
    return doctors;
  }catch(error){
    console.error('Не удалось загрузить врачей:', error);
    return [];
  }
}
 
const reviews = [
  { id: 1, author: 'Екатерина, хозяйка корги', rating: 5, text: 'Врачи очень внимательные. Пёс совсем не нервничал, всё объяснили простым языком.' },
  { id: 2, author: 'Андрей, владелец кота Бориса', rating: 5, text: 'Записались онлайн, приняли без очереди. Диагноз поставили быстро, лечение помогло.' },
  { id: 3, author: 'Ольга, хозяйка шпица', rating: 4, text: 'Чисто, уютно, адекватные цены. Теперь наблюдаемся только здесь.' }
];

function attachImageFallback() {
  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
    }, { once: true });
  });
}
 
function renderServices(services) {
  const list = $(`#services-list`);
  if(!list) return;

  if (services.length === 0) {
    list.innerHTML = '<p>Услуги временно недоступны.</p>';
    return;
  }

  list.innerHTML = services.map((s) => `
    <article class="card">
      <h3 class="card__title">${s.name}</h3>
      <p class="card__text">${s.description || ""}</p>
      <p class="card__price">${Number(s.price)} BYN</p>
    </article>`).join('');
}
 
function renderDoctors(doctors) {
  const list = $('#doctors-list');
  if (!list) return;

  if (doctors.length === 0) {
    list.innerHTML = '<p>Информация о врачах временно недоступна.</p>';
    return;
  }

  list.innerHTML = doctors.map((d) => `
    <article class="card">
      ${d.photo_url
        ? `<img class="doctor__photo" src="${d.photo_url}" alt="${d.full_name}"
                data-initials="${initials(d.full_name)}" loading="lazy">`
        : avatarHtml(initials(d.full_name))}
      <p class="doctor__role">${d.specialization}</p>
      <h3 class="card__title">${d.full_name}</h3>
    </article>`).join('');

    list.querySelectorAll('.doctor__photo').forEach((img) => {
    img.addEventListener('error', () => {
      img.outerHTML = avatarHtml(img.dataset.initials);
    }, { once: true });
  });
}
 
function renderReviews() {
  $('#reviews-list').innerHTML = reviews.map((r) => `
    <article class="card">
      <div class="review__stars" aria-label="Оценка ${r.rating} из 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="card__text">${r.text}</p>
      <p class="review__author">${r.author}</p>
    </article>`).join('');
}
 
function fillSelects(services, doctors) {
  $('#service').insertAdjacentHTML('beforeend',
    services.map((s) => `<option value="${s.id}">${s.name}</option>`).join(''));
  $('#doctor').insertAdjacentHTML('beforeend',
    doctors.map((d) => `<option value="${d.id}">${d.full_name} — ${d.specialization}</option>`).join(''));
}
 
async function checkAuth() {
  const authNav = $('#auth-nav');
  if (!authNav) return;

  try {
    const res = await fetch('/api/auth/me');
    const { user } = await res.json();
    if (!user) return;

    authNav.innerHTML = `
      <a href="account.html" class="nav__user">${esc(user.full_name)}</a>
      <button id="logout-btn-main" class="btn btn--outline">Выйти</button>`;

    $('#logout-btn-main').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    });
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
  }
}

function initBurger() {
  const burger = $('#burger');
  const nav = $('#nav');
 
  const toggle = (open) => {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
 
  burger.addEventListener('click', () => toggle(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
}
 
function initSmoothScroll() {
  const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 72;
 
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}
 
function initForm() {
  const form = $('#booking-form');
  const status = $('#form-status');
  const dateInput = $('#date');
 
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const todayStr = today.toISOString().split('T')[0];
  dateInput.min = todayStr;
 
  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Введите имя (минимум 2 символа)' : ''),
    phone: (v) => (/^\+375\d{9}$/.test(v.replace(/[^\d+]/g, '')) ? '' : 'Телефон в формате +375 (29) 123-45-67'),
    pet: (v) => (v ? '' : 'Выберите питомца'),
    service: (v) => (v ? '' : 'Выберите услугу'),
    doctor: (v) => (v ? '' : 'Выберите врача'),
    date: (v) => (!v ? 'Укажите дату' : v < todayStr ? 'Дата не может быть в прошлом' : '')
  };
 
  function validateField(name) {
    const input = form.elements[name];
    const message = rules[name](input.value);
    const field = input.closest('.field');
    field.classList.toggle('has-error', Boolean(message));
    field.querySelector('.error').textContent = message;
    return !message;
  }
 
  Object.keys(rules).forEach((name) => {
    form.elements[name].addEventListener('input', () => validateField(name));
    form.elements[name].addEventListener('change', () => validateField(name));
  });
 
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const allValid = Object.keys(rules).map(validateField).every(Boolean);
 
    status.className = 'form__status';
    if (!allValid) {
      status.textContent = 'Пожалуйста, исправьте ошибки в форме.';
      status.classList.add('is-error');
      return;
    }
 
    const name = form.elements.name.value.trim();
    status.textContent = `Спасибо, ${name}! Мы получили заявку и скоро перезвоним.`;
    status.classList.add('is-success');
    form.reset();
  });
}
 
document.addEventListener('DOMContentLoaded', async () => {
  renderReviews();
  initBurger();
  initSmoothScroll();
  initForm();
  attachImageFallback();
  checkAuth();

  const [servicesData, doctorsData] = await Promise.all([getServices(), getDoctors()]);
  renderServices(servicesData);
  renderDoctors(doctorsData);
  fillSelects(servicesData, doctorsData);
});