// Übungen: anlegen, löschen (mit Kaskade + Bestätigung), auflisten.

import { state, activeExercises, activeWorkouts, exerciseById } from '../state.js';
import { save } from '../sync.js';
import { toast, escapeHtml } from '../utils.js';

export function addExercise() {
  const name = document.getElementById('ex-name').value.trim();
  const muscle = document.getElementById('ex-muscle').value;
  if (!name) {
    toast('Bitte einen Namen eingeben!');
    return;
  }
  if (activeExercises().find((e) => e.name.toLowerCase() === name.toLowerCase())) {
    toast('Übung existiert bereits.');
    return;
  }
  const now = Date.now();
  state.exercises.push({ id: now, name, muscle, updatedAt: now, deleted: false });
  save();
  renderExercises();
  document.getElementById('ex-name').value = '';
  toast('Übung hinzugefügt!');
}

export function deleteExercise(id) {
  const ex = exerciseById(id);
  if (!ex) return;
  // Kaskade: zugehörige Workouts werden mitgelöscht – vorher klar ansagen.
  const affected = activeWorkouts().filter((w) => w.exId === id);
  const msg = affected.length
    ? `„${ex.name}" und ${affected.length} ${
        affected.length === 1 ? 'zugehörigen Trainingseintrag' : 'zugehörige Trainingseinträge'
      } werden unwiderruflich gelöscht. Fortfahren?`
    : `„${ex.name}" wirklich löschen?`;
  if (!confirm(msg)) return;

  const now = Date.now();
  ex.deleted = true;
  ex.updatedAt = now;
  affected.forEach((w) => {
    w.deleted = true;
    w.updatedAt = now;
  });
  save();
  renderExercises();
  toast('Übung gelöscht.');
}

export function renderExercises() {
  const el = document.getElementById('exercise-list');
  const exs = activeExercises();
  if (!exs.length) {
    el.innerHTML = '<div class="empty">Noch keine Übungen erstellt.</div>';
    return;
  }
  const groups = {};
  exs.forEach((e) => {
    if (!groups[e.muscle]) groups[e.muscle] = [];
    groups[e.muscle].push(e);
  });
  el.innerHTML = Object.entries(groups)
    .map(
      ([muscle, list]) =>
        `<div class="muscle-section">
      <div class="muscle-label">${escapeHtml(muscle)}</div>
      <div>${list
        .map(
          (e) =>
            `<span class="exercise-chip">${escapeHtml(e.name)}<button class="btn-ghost" data-action="del-exercise" data-id="${e.id}" style="font-size:16px;">×</button></span>`
        )
        .join('')}</div>
    </div>`
    )
    .join('');
}
