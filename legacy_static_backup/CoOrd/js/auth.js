import { supabase, coordinatorProfile, coordinatorSession } from './supabase.js';

const page = location.pathname.split('/').pop();

async function guard() {
  if (!coordinatorSession) {
    if (page !== 'login.html') location.href = 'login.html';
    return;
  }
  if (!coordinatorProfile || coordinatorProfile.role !== 'COORDINATOR' || !coordinatorProfile.active) {
    await supabase.auth.signOut();
    location.href = 'login.html';
    return;
  }
  window.profile = coordinatorProfile;
  document.querySelector('#profile')?.replaceChildren(document.createTextNode(coordinatorProfile.name || coordinatorProfile.email));
}

window.storeDetails = window.storeDetails || ((type, id, value) => {
  window._details = window._details || new Map();
  window._details.set(`${type}:${id}`, value);
});
window.viewDetails = window.viewDetails || ((type, id, title) => {
  const value = window._details?.get(`${type}:${id}`);
  if (!value) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const format = value => {
    if (value === null || value === undefined || value === '') return '<span class="detail-empty">Not provided</span>';
    if (Array.isArray(value)) return value.map(item => `<div class="detail-item">${format(item)}</div>`).join('');
    if (typeof value === 'object') return `<table class="detail-table"><tbody>${Object.entries(value).map(([key, item]) => `<tr><th>${esc(key.replace(/_/g, ' '))}</th><td>${format(item)}</td></tr>`).join('')}</tbody></table>`;
    return esc(value);
  };
  const modal = document.createElement('div');
  modal.className = 'details-modal';
  const box = document.createElement('div');
  box.className = 'details-modal-card';
  const heading = document.createElement('h2');
  heading.textContent = title || 'Details';
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.onclick = () => modal.remove();
  const head = document.createElement('div');
  head.className = 'details-modal-head';
  head.append(heading, close);
  const body = document.createElement('div');
  body.innerHTML = format(value);
  box.append(head, body);
  modal.append(box);
  modal.onclick = event => { if (event.target === modal) modal.remove(); };
  document.body.append(modal);
});
window.openImagePreview = window.openImagePreview || (url => {
  const modal = document.createElement('div');
  modal.className = 'image-preview-modal';
  modal.innerHTML = `<div class="image-preview-card"><button type="button" class="image-preview-close">Close</button><img src="${String(url).replace(/"/g, '&quot;')}" alt="Payment proof"></div>`;
  modal.querySelector('button').onclick = () => modal.remove();
  modal.onclick = event => { if (event.target === modal) modal.remove(); };
  document.body.append(modal);
});

guard();
const coordinatorNav = document.querySelector('aside nav');
if (coordinatorNav) {
  coordinatorNav.id = 'coordinatorNav';
  const menuToggle = document.createElement('button');
  menuToggle.className = 'menu-toggle';
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-controls', 'coordinatorNav');
  menuToggle.textContent = 'Menu';
  coordinatorNav.before(menuToggle);
  menuToggle.addEventListener('click', () => {
    const isOpen = coordinatorNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.textContent = isOpen ? 'Close' : 'Menu';
  });
  coordinatorNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    coordinatorNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = 'Menu';
  }));
}
if (page === 'emails.html') import('./emails-special.js');
if (page === 'announcements.html' || page === 'emails.html') import('./recipient-filters.js');
document.querySelector('#loginForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const error = document.querySelector('#error');
  error.textContent = 'Signing in...';
  const { data, error: loginError } = await supabase.rpc('coordinator_login', {
    p_email: document.querySelector('#email').value.trim(),
    p_password: document.querySelector('#password').value
  });
  if (loginError) {
    error.textContent = loginError.message.replace(/^.*: /, '');
    return;
  }
  localStorage.setItem('coordinatorSession', JSON.stringify(data));
  location.href = 'dashboard.html';
});

document.querySelector('#logout')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'login.html';
});