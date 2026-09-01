// Login / Aktivierung / Logout.
//
// Sicherheit (ehrlich eingeordnet): Dies ist eine statische Seite ohne Server,
// ein clientseitiges Login lässt sich technisch immer umgehen. Was die Daten
// tatsächlich schützt, ist der GitHub-Token. Deshalb liegen hier KEINE
// Klartext-Passwörter mehr, sondern nur SHA-256-Hashes – so leakt der
// Quelltext die Passwörter nicht mehr. Für echten Schutz bräuchte es ein Backend.
//
// Hash-Schema:  sha256("gymtracker:" + user + ":" + passwort)
// Aktivierung:  sha256("gymtracker:activation:" + user + ":" + code)

import { state, KEYS, loadLocalForUser } from './state.js';
import { cancelPendingSync } from './sync.js';
import { cap } from './utils.js';

const USERS = {
  vincent: {
    hash: '9751dfe99ce5739dab320609b9d0b4ec303490f98ec0c26af06d07d7a6b59c83',
    file: 'gym_tracker_data.json',
  },
  sophia: {
    hash: 'd35d622569fe98849239b66fc09b7546194c716153911bc127e619166c786309',
    file: 'gym_tracker_sophia.json',
  },
  celina: {
    hash: 'a3ee9c7d98d1543bc7552a00797050aef462fd8d72fcfa38e005a466c73a94d0',
    file: 'gym_tracker_celina.json',
  },
  wolfgang: {
    hash: '962e19c01a5bc41d3ed4a901825046c2219b58eb040c35d492f0cea4541b8cc6',
    file: 'gym_tracker_wolfgang2.json',
  },
};

const ACTIVATION = {
  wolfgang: '5a65f9d78e0abf8d85036fa44a716251b6b3459d54c05ecd8a521b6c08a1b0b3',
};

let pendingUser = null;
let onLoggedIn = null; // Callback(user) – wird nach erfolgreichem Login gefeuert

export function initAuth(cb) {
  onLoggedIn = cb;
}

/** SHA-256 als Hex-String über die UTF-8-Bytes (Web Crypto, benötigt HTTPS/localhost). */
export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function needsActivation(user) {
  if (!ACTIVATION[user]) return false;
  return localStorage.getItem(KEYS.activated(user)) !== 'yes';
}

// --- Login-Screen UI ---
export function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-pw').value = '';
  document.getElementById('login-token').value = '';
  // Token-Feld nur zeigen, solange noch kein Token gespeichert ist.
  document.getElementById('token-field-wrap').style.display = localStorage.getItem(KEYS.token)
    ? 'none'
    : 'block';
}

export function hideLogin() {
  document.getElementById('login-screen').style.display = 'none';
}

export function resetGistId() {
  const user = document.getElementById('login-user').value;
  localStorage.removeItem(KEYS.gist(user));
  alert('Gist ID für ' + user + ' zurückgesetzt. Beim nächsten Speichern wird ein neuer erstellt.');
}

// --- Aktivierungs-Screen UI ---
export function showActivation(user) {
  pendingUser = user;
  document.getElementById('activation-input').value = '';
  document.getElementById('activation-error').style.display = 'none';
  document.getElementById('activation-ok').style.display = 'none';
  document.getElementById('activation-screen').style.display = 'flex';
}

export async function checkActivation() {
  const raw = document.getElementById('activation-input').value.trim().toUpperCase().replace(/-/g, '');
  const hash = await sha256Hex('gymtracker:activation:' + pendingUser + ':' + raw);
  if (hash !== ACTIVATION[pendingUser]) {
    document.getElementById('activation-error').style.display = 'block';
    document.getElementById('activation-ok').style.display = 'none';
    return;
  }
  localStorage.setItem(KEYS.activated(pendingUser), 'yes');
  document.getElementById('activation-error').style.display = 'none';
  document.getElementById('activation-ok').style.display = 'block';
  setTimeout(() => {
    document.getElementById('activation-screen').style.display = 'none';
    finishLogin(pendingUser);
  }, 900);
}

// --- Login-Ablauf ---
export async function doLogin() {
  const user = document.getElementById('login-user').value;
  const pw = document.getElementById('login-pw').value;
  const tokenInput = document.getElementById('login-token').value.trim();
  const hash = await sha256Hex('gymtracker:' + user + ':' + pw);
  if (hash !== USERS[user].hash) {
    document.getElementById('login-error').style.display = 'block';
    return;
  }
  if (tokenInput) {
    localStorage.setItem(KEYS.token, tokenInput);
    state.token = tokenInput;
  }
  if (needsActivation(user)) {
    hideLogin();
    showActivation(user);
    return;
  }
  finishLogin(user);
}

export function finishLogin(user) {
  state.currentUser = user;
  localStorage.setItem(KEYS.currentUser, user);
  state.gistFilename = USERS[user].file;
  state.gistId = localStorage.getItem(KEYS.gist(user)) || null;
  document.getElementById('header-user').textContent = cap(user);
  hideLogin();
  loadLocalForUser(user);
  if (onLoggedIn) onLoggedIn(user);
}

export function doLogout() {
  cancelPendingSync();
  state.currentUser = null;
  localStorage.removeItem(KEYS.currentUser);
  state.exercises = [];
  state.workouts = [];
  showLogin();
}

/**
 * Startzustand herstellen: nicht eingeloggt -> Login; Aktivierung nötig ->
 * Aktivierung; sonst Session fortsetzen (kein erneutes Passwort nötig).
 */
export function bootSession() {
  const user = localStorage.getItem(KEYS.currentUser);
  if (!user) {
    showLogin();
    return;
  }
  if (needsActivation(user)) {
    showActivation(user);
    return;
  }
  finishLogin(user);
}
