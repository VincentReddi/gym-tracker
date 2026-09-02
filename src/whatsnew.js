// "Was ist neu"-Screen – zeigt nach einem Update einmalig kompakt die Neuerungen.
// Merkt sich die zuletzt gesehene Version in localStorage, damit er nur einmal erscheint.

const APP_VERSION = '2.1';
const SEEN_KEY = 'gym_seen_version';

const NOTES = [
  {
    icon: '🏋️',
    text: 'Beim Loggen werden die Werte deines letzten Trainings dieser Übung automatisch vorausgefüllt – nur noch anpassen und speichern.',
  },
  {
    icon: '🔄',
    text: 'Zuverlässigere Synchronisation: keine verlorenen Einträge mehr, wenn du an mehreren Geräten trainierst.',
  },
  {
    icon: '🗑️',
    text: 'Eine Übung zu löschen entfernt jetzt sauber auch ihre Trainingseinträge – mit Sicherheitsabfrage.',
  },
  {
    icon: '🔒',
    text: 'Sichereres Login. Deine Anmeldung bleibt bestehen – du musst nichts neu einrichten.',
  },
];

export function maybeShowWhatsNew() {
  if (localStorage.getItem(SEEN_KEY) === APP_VERSION) return;
  const list = document.getElementById('whatsnew-list');
  if (!list) return;
  list.innerHTML = NOTES.map(
    (n) =>
      `<li style="display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:20px;line-height:1.3;">${n.icon}</span>
        <span style="font-size:14px;color:var(--text);line-height:1.5;">${n.text}</span>
      </li>`
  ).join('');
  document.getElementById('whatsnew-screen').style.display = 'flex';
}

export function dismissWhatsNew() {
  localStorage.setItem(SEEN_KEY, APP_VERSION);
  const el = document.getElementById('whatsnew-screen');
  if (el) el.style.display = 'none';
}
