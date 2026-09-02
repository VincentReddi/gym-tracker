// Einstiegspunkt: verdrahtet alle Events (kein Inline-onclick mehr),
// steuert die Tab-Navigation und startet die Session.

import { state } from './state.js';
import { initSync, syncNow } from './sync.js';
import { initAuth, bootSession, doLogin, doLogout, checkActivation, resetGistId } from './auth.js';
import { renderDashboard, renderHeatmap, setDashMode, renderDashChart } from './views/dashboard.js';
import { addExercise, deleteExercise, renderExercises } from './views/exercises.js';
import {
  setTodayDate,
  populateLogSelect,
  onLogExerciseChange,
  addSet,
  removeSet,
  saveWorkout,
  renderTodaySummary,
} from './views/log.js';
import { populateFilterSelect, renderHistory, deleteWorkout } from './views/history.js';
import { populateChartSelect, setChartMode, renderChart } from './views/progress.js';
import { maybeShowWhatsNew, dismissWhatsNew } from './whatsnew.js';

let currentTab = 'dashboard';

function renderTab(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'exercises') renderExercises();
  else if (name === 'log') {
    setTodayDate();
    populateLogSelect();
    renderTodaySummary();
  } else if (name === 'history') {
    populateFilterSelect();
    renderHistory();
  } else if (name === 'progress') {
    populateChartSelect();
    renderChart();
  }
}

function switchTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  renderTab(name);
}

// Nach einem Remote-Merge den sichtbaren Tab auffrischen – außer beim
// "Loggen"-Tab, um eine laufende Eingabe nicht zu überschreiben.
function refreshAfterSync() {
  if (currentTab !== 'log') renderTab(currentTab);
}

// Nach erfolgreichem Login: Dashboard zeigen und im Hintergrund synchronisieren.
function afterLogin() {
  switchTab('dashboard');
  syncNow();
  maybeShowWhatsNew();
}

function wireEvents() {
  // --- Header / Navigation ---
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
  });

  // --- Dashboard ---
  document.getElementById('heatmap-range').addEventListener('change', renderHeatmap);
  document.getElementById('dash-btn-weight').addEventListener('click', () => setDashMode('weight'));
  document.getElementById('dash-btn-volume').addEventListener('click', () => setDashMode('volume'));
  document.getElementById('dash-chart-exercise').addEventListener('change', renderDashChart);

  // --- Übungen ---
  document.getElementById('btn-add-exercise').addEventListener('click', addExercise);
  document.getElementById('ex-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addExercise();
  });
  document.getElementById('exercise-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="del-exercise"]');
    if (btn) deleteExercise(parseInt(btn.dataset.id));
  });

  // --- Loggen ---
  document.getElementById('log-exercise').addEventListener('change', onLogExerciseChange);
  document.getElementById('btn-add-set').addEventListener('click', addSet);
  document.getElementById('btn-save-workout').addEventListener('click', saveWorkout);
  document.getElementById('log-date').addEventListener('change', renderTodaySummary);
  const setsC = document.getElementById('sets-container');
  setsC.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.setField !== undefined && t.dataset.setIndex !== undefined) {
      const idx = parseInt(t.dataset.setIndex);
      if (state.sets[idx]) state.sets[idx][t.dataset.setField] = t.value;
    }
  });
  setsC.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="del-set"]');
    if (btn) removeSet(parseInt(btn.dataset.index));
  });

  // --- Verlauf ---
  document.getElementById('filter-exercise').addEventListener('change', renderHistory);
  document.getElementById('history-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="del-workout"]');
    if (btn) deleteWorkout(parseInt(btn.dataset.id));
  });

  // --- Fortschritt ---
  document.getElementById('chart-exercise').addEventListener('change', renderChart);
  document.getElementById('btn-weight').addEventListener('click', () => setChartMode('weight'));
  document.getElementById('btn-volume').addEventListener('click', () => setChartMode('volume'));

  // --- Login ---
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-pw').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('btn-reset-gist').addEventListener('click', resetGistId);

  // --- Aktivierung ---
  document.getElementById('btn-activate').addEventListener('click', checkActivation);
  document.getElementById('activation-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkActivation();
  });

  // --- Was ist neu ---
  document.getElementById('btn-whatsnew-close').addEventListener('click', dismissWhatsNew);
}

function boot() {
  initSync(refreshAfterSync);
  initAuth(afterLogin);
  wireEvents();
  bootSession();
}

// `type="module"`-Skripte laufen deferred – das DOM steht hier bereits.
boot();
