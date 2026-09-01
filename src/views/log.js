// Loggen: Workout mit mehreren Sätzen erfassen.

import { state, activeExercises, activeWorkouts } from '../state.js';
import { save } from '../sync.js';
import { localDS, toast, escapeHtml } from '../utils.js';

export function setTodayDate() {
  const d = document.getElementById('log-date');
  if (!d.value) d.value = localDS(new Date());
}

export function populateLogSelect() {
  document.getElementById('log-exercise').innerHTML =
    '<option value="">- Übung wählen -</option>' +
    activeExercises().map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  if (!state.sets.length) addSet();
}

export function addSet() {
  state.sets.push({ kg: '', reps: '' });
  renderSets();
}

export function removeSet(i) {
  state.sets.splice(i, 1);
  renderSets();
}

export function renderSets() {
  document.getElementById('sets-container').innerHTML = state.sets
    .map(
      (s, i) =>
        `<div class="set-grid">
      <div class="set-num">${i + 1}</div>
      <input type="number" min="0" step="0.5" value="${s.kg}" placeholder="kg" data-set-index="${i}" data-set-field="kg" />
      <input type="number" min="0" value="${s.reps}" placeholder="Reps" data-set-index="${i}" data-set-field="reps" />
      <button class="btn-ghost" data-action="del-set" data-index="${i}">×</button>
    </div>`
    )
    .join('');
}

export function saveWorkout() {
  const date = document.getElementById('log-date').value;
  const exId = parseInt(document.getElementById('log-exercise').value);
  if (!date || !exId) {
    toast('Datum und Übung wählen!');
    return;
  }
  const validSets = state.sets.filter(
    (s) => s.kg !== '' && s.reps !== '' && parseFloat(s.kg) >= 0 && parseInt(s.reps) > 0
  );
  if (!validSets.length) {
    toast('Mindestens einen gültigen Satz eingeben!');
    return;
  }
  const now = Date.now();
  state.workouts.push({
    id: now,
    date,
    exId,
    sets: validSets.map((s) => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps) })),
    updatedAt: now,
    deleted: false,
  });
  save();
  state.sets = [];
  renderSets();
  renderTodaySummary();
  toast('Workout gespeichert!');
}

export function renderTodaySummary() {
  const today = document.getElementById('log-date')?.value || localDS(new Date());
  const todayW = activeWorkouts().filter((w) => w.date === today);
  const el = document.getElementById('today-summary');
  if (!todayW.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const totalSets = todayW.reduce((a, w) => a + w.sets.length, 0);
  const totalVol = Math.round(todayW.reduce((a, w) => a + w.sets.reduce((b, s) => b + s.kg * s.reps, 0), 0));
  const maxWeight = Math.max(...todayW.flatMap((w) => w.sets.map((s) => s.kg)));
  document.getElementById('today-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-label">Sätze</div><div class="metric-val">${totalSets}</div></div>
    <div class="metric-card"><div class="metric-label">Volumen (kg)</div><div class="metric-val">${totalVol.toLocaleString('de')}</div></div>
    <div class="metric-card"><div class="metric-label">Max. Gewicht</div><div class="metric-val">${maxWeight} kg</div></div>
  `;
}
