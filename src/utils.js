// Kleine, seiteneffektfreie Helfer.

/** Date -> lokaler ISO-Datumsstring (YYYY-MM-DD), ohne UTC-Verschiebung. */
export function localDS(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** ISO-Datum -> deutsches Format TT.MM.JJJJ. */
export function deDate(ds) {
  const [y, m, d] = ds.split('-');
  return `${d}.${m}.${y}`;
}

/** Erster Buchstabe groß. */
export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** HTML-escapen, damit Nutzereingaben (z.B. Übungsnamen) das Markup nicht zerlegen. */
export function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Kurze Toast-Meldung unten rechts. */
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
  }, 2200);
}
