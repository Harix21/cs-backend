(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || document.querySelector('#adminMenuToggle')) return;
  const button = document.createElement('button');
  button.id = 'adminMenuToggle';
  button.className = 'menu-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Toggle navigation menu');
  button.setAttribute('aria-expanded', 'false');
  button.textContent = 'Menu';
  document.body.append(button);
  button.addEventListener('click', () => {
    const open = sidebar.classList.toggle('menu-open');
    button.setAttribute('aria-expanded', String(open));
  });
})();
