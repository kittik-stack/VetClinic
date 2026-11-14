'use strict';

const $ = (sel) => document.querySelector(sel);
 
// SVG-заглушка, если фото не загрузилось
const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#dfe6f3"/><text x="50%" y="52%" font-size="96" text-anchor="middle">🐾</text></svg>'
);
 
/* ===== ДАННЫЕ (редактируйте только здесь) ===== */
// const services = [
//   { id: 1, title: 'Осмотр и консультация', text: 'Первичный и повторный приём, составление плана лечения.', price: 'от 45 BYN' },
//   { id: 2, title: 'Вакцинация', text: 'Комплексные прививки для собак и кошек, ветпаспорт.', price: 'от 60 BYN' },
//   { id: 3, title: 'Диагностика и анализы', text: 'УЗИ, рентген, лаборатория — результаты в день обращения.', price: 'от 55 BYN' },
//   { id: 4, title: 'Стоматология', text: 'Чистка зубов, лечение дёсен, удаление камня.', price: 'от 120 BYN' },
//   { id: 5, title: 'Хирургия', text: 'Плановые и экстренные операции под безопасным наркозом.', price: 'от 250 BYN' },
//   { id: 6, title: 'Бережный груминг', text: 'Мытьё, расчёсывание и стрижка животных любого характера.', price: 'от 70 BYN' }
// ];
 
async function getServices() {
  try{
    const res = await fetch('/api/services');
    if(!res.ok){ throw new Error(`Ошибка http: ${res.status}`);}

    const service = await res.json();
    return service;
  }catch(error){
    console.error('Не удалось загрузить услуги:', error);
    return [];
  }
}

const doctors = [
  { id: 1, name: 'Анна Смирнова', role: 'Терапевт, хирург', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80' },
  { id: 2, name: 'Иван Петров', role: 'Диагност (УЗИ)', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80' },
  { id: 3, name: 'Елена Смит', role: 'Стоматолог', photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80' }
];
 
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
 
/* ===== РЕНДЕР ===== */
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
      <p class="card__text">${s.description}</p>
      <p class="card__price">${s.price} BYN</p>
    </article>`).join('');
}
 
function renderDoctors() {
  $('#doctors-list').innerHTML = doctors.map((d) => `
    <article class="card">
      <img class="doctor__photo" src="${d.photo}" alt="${d.name}" loading="lazy">
      <p class="doctor__role">${d.role}</p>
      <h3 class="card__title">${d.name}</h3>
    </article>`).join('');
}
 
function renderReviews() {
  $('#reviews-list').innerHTML = reviews.map((r) => `
    <article class="card">
      <div class="review__stars" aria-label="Оценка ${r.rating} из 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="card__text">${r.text}</p>
      <p class="review__author">${r.author}</p>
    </article>`).join('');
}
 
function fillSelects(services) {
  $('#service').insertAdjacentHTML('beforeend',
    services.map((s) => `<option value="${s.name}">${s.name}</option>`).join(''));
  $('#doctor').insertAdjacentHTML('beforeend',
    doctors.map((d) => `<option value="${d.name}">${d.name} — ${d.role}</option>`).join(''));
}
 
/* ===== БУРГЕР-МЕНЮ ===== */
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
 
/* ===== ПЛАВНЫЙ СКРОЛЛ ===== */
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
 
/* ===== ФОРМА ===== */
function initForm() {
  const form = $('#booking-form');
  const status = $('#form-status');
  const dateInput = $('#date');
 
  // Минимальная дата — сегодня
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
 
/* ===== ЗАПУСК ===== */
document.addEventListener('DOMContentLoaded', async () => {
  const servicesData = await getServices();

  renderServices(servicesData);

  fillSelects(servicesData);

  renderDoctors();
  renderReviews();
  initBurger();
  initSmoothScroll();
  initForm();
  attachImageFallback();
});