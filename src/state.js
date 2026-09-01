// Zentraler App-Zustand + localStorage-Persistenz + Merge-Logik.
//
// Datenmodell (mit `updatedAt` und Soft-Delete/Tombstone für konfliktfreien Sync):
//   Übung:   { id, name, muscle, updatedAt, deleted }
//   Workout: { id, date, exId, sets:[{kg,reps}], updatedAt, deleted }
//
// Gelöscht wird nie hart aus dem Array entfernt, sondern als Tombstone markiert
// (deleted:true, updatedAt:jetzt). So bleibt eine Löschung geräteübergreifend
// bestehen und kann nicht durch einen älteren Sync "wiederauferstehen".

export const KEYS = {
  currentUser: 'gym_current_user',
  token: 'gym_token',
  exercises: 'gym_exercises',
  workouts: 'gym_workouts',
  cacheUser: 'gym_cache_user', // Besitzer des lokalen Caches (verhindert Nutzer-Vermischung)
  gist: (u) => 'gym_gist_' + u,
  activated: (u) => 'gym_activated_' + u,
};

export const state = {
  exercises: [],
  workouts: [],
  sets: [], // Entwurf im "Loggen"-Tab
  currentUser: null,
  token: localStorage.getItem(KEYS.token) || '',
  gistId: null,
  gistFilename: 'gym_tracker_data.json',
  chartMode: 'weight',
  dashChartMode: 'weight',
};

// --- Normalisierung / Rückwärtskompatibilität ---
// Alte Datensätze haben weder `updatedAt` noch `deleted`. Als Startwert für
// `updatedAt` nehmen wir die vorhandene `id` (ist ein Date.now()-Zeitstempel).
function normEx(e) {
  return {
    id: e.id,
    name: e.name,
    muscle: e.muscle,
    updatedAt: e.updatedAt ?? e.id ?? Date.now(),
    deleted: e.deleted ?? false,
  };
}
function normWo(w) {
  return {
    id: w.id,
    date: w.date,
    exId: w.exId,
    sets: w.sets || [],
    updatedAt: w.updatedAt ?? w.id ?? Date.now(),
    deleted: w.deleted ?? false,
  };
}

// --- Selektoren (blenden Tombstones aus) ---
export const activeExercises = () => state.exercises.filter((e) => !e.deleted);
export const activeWorkouts = () => state.workouts.filter((w) => !w.deleted);
// Namensauflösung: auch gelöschte Übungen finden (für alte Verlaufseinträge).
export const exerciseById = (id) => state.exercises.find((e) => e.id === id);

// --- Persistenz ---
export function persistLocal() {
  localStorage.setItem(KEYS.exercises, JSON.stringify(state.exercises));
  localStorage.setItem(KEYS.workouts, JSON.stringify(state.workouts));
  localStorage.setItem(KEYS.cacheUser, state.currentUser || '');
}

/**
 * Lädt den lokalen Cache – aber nur, wenn er diesem Nutzer gehört.
 * Bei einem anderen Nutzer (geteilter Browser) starten wir leer und holen
 * frisch aus dem Gist, statt fremde Daten anzuzeigen.
 */
export function loadLocalForUser(user) {
  const owner = localStorage.getItem(KEYS.cacheUser);
  if (owner && owner === user) {
    state.exercises = JSON.parse(localStorage.getItem(KEYS.exercises) || '[]').map(normEx);
    state.workouts = JSON.parse(localStorage.getItem(KEYS.workouts) || '[]').map(normWo);
  } else {
    state.exercises = [];
    state.workouts = [];
  }
}

// --- Merge (letzter Schreibzugriff pro Datensatz gewinnt) ---
function mergeById(localArr, remoteArr) {
  const map = new Map();
  for (const r of localArr) map.set(r.id, r);
  for (const r of remoteArr) {
    const cur = map.get(r.id);
    if (!cur || (r.updatedAt || 0) >= (cur.updatedAt || 0)) map.set(r.id, r);
  }
  return [...map.values()];
}

/** Führt entfernte Daten in den lokalen Zustand: pro Datensatz gewinnt das jüngste `updatedAt`. */
export function mergeInto(remoteExercises, remoteWorkouts) {
  state.exercises = mergeById(state.exercises.map(normEx), (remoteExercises || []).map(normEx));
  state.workouts = mergeById(state.workouts.map(normWo), (remoteWorkouts || []).map(normWo));
}
