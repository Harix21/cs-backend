(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  let button = document.querySelector('#adminMenuToggle');
  if (!button) {
    button = document.createElement('button');
    button.id = 'adminMenuToggle';
    button.className = 'menu-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', 'Toggle navigation menu');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Menu';
    document.body.append(button);
  }
  button.onclick = (e) => {
    e.stopPropagation();
    const open = sidebar.classList.toggle('menu-open');
    button.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('menu-open') && !sidebar.contains(e.target) && e.target !== button) {
      sidebar.classList.remove('menu-open');
      button.setAttribute('aria-expanded', 'false');
    }
  });
})();
