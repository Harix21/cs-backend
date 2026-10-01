(() => {
  const state = new Map();
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  }
  function formatValue(value) {
    if (value === null || value === undefined || value === '') return '<span class="detail-empty">Not provided</span>';
    if (Array.isArray(value)) return value.length ? `<div class="detail-list">${value.map(item => `<div class="detail-item">${formatValue(item)}</div>`).join('')}</div>` : '<span class="detail-empty">None</span>';
    if (typeof value === 'object') return `<table class="detail-table"><tbody>${Object.entries(value).map(([key, item]) => `<tr><th>${esc(key.replace(/_/g, ' '))}</th><td>${formatValue(item)}</td></tr>`).join('')}</tbody></table>`;
    return esc(value);
  }
  window.storeDetails = (type, id, value) => state.set(`${type}:${id}`, value);
  window.viewDetails = (type, id, title) => {
    const value = state.get(`${type}:${id}`);
    if (!value) return;
    let modal = document.getElementById('detailsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'detailsModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:100';
      modal.innerHTML = '<div class="details-modal-card"><div class="details-modal-head"><h2 id="detailsTitle"></h2><button id="detailsClose" type="button">Close</button></div><div id="detailsBody"></div></div>';
      document.body.appendChild(modal);
      document.getElementById('detailsClose').onclick = () => modal.remove();
      modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    }
    document.getElementById('detailsTitle').textContent = title || 'Details';
    document.getElementById('detailsBody').innerHTML = formatValue(value);
  };
  window.openImagePreview = url => {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `<div class="image-preview-card"><button type="button" class="image-preview-close">Close</button><img src="${esc(url)}" alt="Payment proof"></div>`;
    modal.querySelector('button').onclick = () => modal.remove();
    modal.onclick = event => { if (event.target === modal) modal.remove(); };
    document.body.append(modal);
  };
})();
