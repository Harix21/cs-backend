// Utility helper functions

export function formatCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateString;
  }
}

export function extractQrToken(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  try {
    const url = new URL(trimmed, window.location.origin);
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  } catch {
    const match = trimmed.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
    return match ? match[0] : trimmed;
  }
}

export function openGmailCompose({ to = '', bcc = [], subject = '', body = '' }) {
  const url = new URL('https://mail.google.com/mail/');
  url.searchParams.set('view', 'cm');
  url.searchParams.set('fs', '1');
  if (to) url.searchParams.set('to', to);
  if (bcc && bcc.length) {
    url.searchParams.set('bcc', Array.isArray(bcc) ? bcc.join(',') : bcc);
  }
  if (subject) url.searchParams.set('su', subject);
  if (body) url.searchParams.set('body', body);
  window.open(url.toString(), '_blank');
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}

export function downloadCsv(filename, rows) {
  if (!rows || !rows.length) {
    throw new Error('No data available to export.');
  }
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map((row) =>
      keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
