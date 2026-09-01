// Verlauf: alle Trainingseinträge, filterbar nach Übung, einzeln löschbar.

import { state, activeWorkouts, activeExercises, exerciseById } from '../state.js';
import { save } from '../sync.js';
import { deDate, toast, escapeHtml } from '../utils.js';

export function populateFilterSelect() {
  const used = [...new Set(activeWorkouts().map((w) => w.exId))];
  document.getElementById('filter-exercise').innerHTML =
    '<option value="">Alle Übungen</option>' +
    activeExercises()
      .filter((e) => used.includes(e.id))
      .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
      .join('');
}

export function renderHistory() {
  const filter = document.getElementById('filter-exercise').value;
  let data = [...activeWorkouts()].sort((a, b) => b.date.localeCompare(a.date));
  if (filter) data = data.filter((w) => w.exId === parseInt(filter));
  const el = document.getElementById('history-list');
  if (!data.length) {
    el.innerHTML = '<div class="empty">Noch kein Training geloggt.</div>';
    return;
  }
  el.innerHTML = data
    .map((w) => {
      const ex = exerciseById(w.exId);
      const vol = Math.round(w.sets.reduce((a, s) => a + s.kg * s.reps, 0));
      const maxKg = Math.max(...w.sets.map((s) => s.kg));
      return `<div class="log-row">
      <div>
        <div class="log-name">${ex ? escapeHtml(ex.name) : 'Gelöschte Übung'}</div>
        <div class="log-sets">${w.sets.map((s) => s.kg + 'kg x ' + s.reps).join(' | ')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
        <div style="text-align:right;font-size:12px;color:var(--text2);">
          <div class="log-date">${deDate(w.date)}</div>
          <div>Vol: ${vol.toLocaleString('de')} kg | Max: ${maxKg} kg</div>
        </div>
        <button class="btn-ghost" data-action="del-workout" data-id="${w.id}" title="Löschen">×</button>
      </div>
    </div>`;
    })
    .join('');
}

export function deleteWorkout(id) {
  if (!confirm('Eintrag löschen?')) return;
  const w = state.workouts.find((x) => x.id === id);
  if (w) {
    w.deleted = true;
    w.updatedAt = Date.now();
  }
  save();
  renderHistory();
  toast('Eintrag gelöscht!');
}
