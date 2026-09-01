// Synchronisation mit GitHub Gists – mit Merge (kein last-write-wins-Datenverlust)
// und entprelltem Push (nicht mehr bei jeder Einzeländerung).

import { state, KEYS, persistLocal, mergeInto } from './state.js';

const DEBOUNCE_MS = 1500;
const GIST_API = 'https://api.github.com/gists';

let syncTimer = null;
let onSyncApplied = null; // Callback zum Neuzeichnen nach einem Remote-Merge

export function initSync(cb) {
  onSyncApplied = cb;
}

function authHeaders() {
  return { Authorization: `token ${state.token}` };
}

function timeStr() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function setSyncStatus(msg, color) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || 'var(--text3)';
}

/**
 * Schreibt sofort in den lokalen Cache und plant einen entprellten Full-Sync.
 * Lokal ist damit sofort persistent; die Netzwerk-Runde passiert gebündelt.
 */
export function save() {
  persistLocal();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncNow();
  }, DEBOUNCE_MS);
}

/** Bricht einen geplanten (entprellten) Sync ab – z.B. beim Logout. */
export function cancelPendingSync() {
  clearTimeout(syncTimer);
}

/** Voller Sync: erst pullen+mergen, dann den zusammengeführten Stand pushen. */
export async function syncNow() {
  if (!state.token) {
    setSyncStatus('Kein Token – nur lokal', 'var(--danger)');
    return;
  }
  const changed = await pull();
  await push();
  if (changed && onSyncApplied) onSyncApplied();
}

async function ensureGistId() {
  if (state.gistId) return;
  setSyncStatus('Suche Gist...', 'var(--text2)');
  try {
    const r = await fetch(`${GIST_API}?per_page=100`, { headers: authHeaders() });
    if (r.ok) {
      const list = await r.json();
      const found = list.find((g) => g.files && g.files[state.gistFilename]);
      if (found) {
        state.gistId = found.id;
        localStorage.setItem(KEYS.gist(state.currentUser), found.id);
      }
    }
  } catch (e) {
    /* offline / kein Netz – still ignorieren, lokal bleibt erhalten */
  }
}

/** Holt den Remote-Stand und merged ihn hinein. Gibt zurück, ob sich lokal etwas geändert hat. */
export async function pull() {
  if (!state.token) return false;
  await ensureGistId();
  if (!state.gistId) return false;
  setSyncStatus('Laden...', 'var(--text2)');
  try {
    const res = await fetch(`${GIST_API}/${state.gistId}`, { headers: authHeaders() });
    if (!res.ok) {
      setSyncStatus('Gist nicht gefunden', 'var(--danger)');
      return false;
    }
    const json = await res.json();
    const content = json.files[state.gistFilename]?.content;
    if (!content) return false;
    const data = JSON.parse(content);
    const before = JSON.stringify([state.exercises, state.workouts]);
    mergeInto(data.exercises || [], data.workouts || []);
    persistLocal();
    setSyncStatus('Geladen ' + timeStr(), 'var(--success)');
    return JSON.stringify([state.exercises, state.workouts]) !== before;
  } catch (e) {
    setSyncStatus('Fehler beim Laden', 'var(--danger)');
    return false;
  }
}

/** Schreibt den kompletten lokalen Stand (inkl. Tombstones) in den Gist. */
export async function push() {
  if (!state.token) return;
  setSyncStatus('Speichern...', 'var(--text2)');
  const data = JSON.stringify({ exercises: state.exercises, workouts: state.workouts }, null, 2);
  try {
    let res;
    if (state.gistId) {
      res = await fetch(`${GIST_API}/${state.gistId}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { [state.gistFilename]: { content: data } } }),
      });
    } else {
      res = await fetch(GIST_API, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Gym Tracker Data',
          public: false,
          files: { [state.gistFilename]: { content: data } },
        }),
      });
      const json = await res.json();
      state.gistId = json.id;
      localStorage.setItem(KEYS.gist(state.currentUser), state.gistId);
    }
    if (res.ok) setSyncStatus('Gespeichert ' + timeStr(), 'var(--success)');
    else setSyncStatus('Fehler beim Speichern', 'var(--danger)');
  } catch (e) {
    setSyncStatus('Netzwerkfehler', 'var(--danger)');
  }
}
