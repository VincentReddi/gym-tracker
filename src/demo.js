// Demo-Modus: vorbefüllte Daten für die Live-Demo.
// Läuft rein im Speicher — es wird NICHTS in localStorage/Gist geschrieben,
// d.h. Änderungen sind nach dem Neuladen wieder weg (siehe Guards in sync.js/coach.js).

import { state } from './state.js';
import { localDS } from './utils.js';

const DEMO_EXERCISES = [
  { id: 1, name: 'Bankdrücken', muscle: 'Brust' },
  { id: 2, name: 'Kniebeuge', muscle: 'Beine' },
  { id: 3, name: 'Klimmzüge', muscle: 'Rücken' },
  { id: 4, name: 'Schulterdrücken', muscle: 'Schultern' },
  { id: 5, name: 'Kreuzheben', muscle: 'Rücken' },
  { id: 6, name: 'Bizeps-Curls', muscle: 'Bizeps' },
];

// Gewichts-Progression – immer in 2,5-kg-Schritten (runde Werte).
// Bankdrücken landet über die Wochen sauber bei 75 kg.
const PLAN = {
  1: { start: 60, step: 2.5, every: 4 },
  2: { start: 80, step: 5, every: 4 },
  3: { start: 5, step: 2.5, every: 6 },
  4: { start: 35, step: 2.5, every: 4 },
  5: { start: 90, step: 5, every: 4 },
  6: { start: 12.5, step: 2.5, every: 5 },
};

// Deterministischer Pseudo-Zufall (mulberry32) – natürliche, aber immer gleiche Verteilung.
function makeRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightFor(exId, weekIdx) {
  const p = PLAN[exId];
  return p.start + p.step * Math.floor(weekIdx / p.every);
}

export function loadDemoData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mon = new Date(today);
  mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));

  const rand = makeRng(20260101);
  let wid = 1;
  const workouts = [];
  const addW = (date, exId, weekIdx) => {
    const kg = weightFor(exId, weekIdx);
    workouts.push({
      id: wid,
      date: localDS(date),
      exId,
      sets: [{ kg, reps: 8 }, { kg, reps: 6 }, { kg, reps: 8 }],
      updatedAt: wid,
      deleted: false,
    });
    wid++;
  };

  // 25 Wochen zurück bis letzte Woche: natürlich verstreut (2–4 Tage, selten 1).
  for (let w = 25; w >= 1; w--) {
    const ws = new Date(mon);
    ws.setDate(ws.getDate() - w * 7);
    const idx = 25 - w;
    const roll = rand();
    const n = roll < 0.1 ? 1 : roll < 0.28 ? 2 : 3 + Math.floor(rand() * 2);
    const offsets = shuffle([0, 1, 2, 3, 4, 5, 6], rand).slice(0, n);
    offsets.forEach((off) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + off);
      const exs = shuffle([1, 2, 3, 4, 5, 6], rand).slice(0, 1 + Math.floor(rand() * 2));
      exs.forEach((exId) => addW(d, exId, idx));
    });
  }

  // Diese Woche: feste, saubere Sessions (Bankdrücken = 75/75/75).
  const day = (off) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + off);
    return d;
  };
  [
    [0, [1, 4]],
    [1, [2, 5]],
    [3, [3, 6]],
  ].forEach(([off, exs]) => {
    if (day(off) > today) return;
    exs.forEach((exId) => addW(day(off), exId, 25));
  });

  state.exercises = DEMO_EXERCISES.map((e) => ({ ...e, updatedAt: e.id, deleted: false }));
  state.workouts = workouts;

  // Passende, konsistente KI-Analyse für den Coach (ohne echten API-Aufruf).
  const s = localDS(mon);
  const e = localDS(today);
  const tw = workouts.filter((x) => x.date >= s && x.date <= e);
  const vol = Math.round(tw.reduce((a, x) => a + x.sets.reduce((b, y) => b + y.kg * y.reps, 0), 0));
  const days = new Set(tw.map((x) => x.date)).size;
  state.demoAnalysis =
    `${days} Trainings diese Woche, rund ${vol.toLocaleString('de')} kg Gesamtvolumen — richtig stark!\n\n` +
    `Fortschritte:\nBankdrücken steht bei sauberen 75 kg, und deine Grundübungen ziehen konstant nach oben. ` +
    `Über die letzten Wochen ein klarer Aufwärtstrend.\n\n` +
    `Balance:\nPush, Pull und Beine sind gut verteilt. Achte darauf, die Rücken-Einheiten hochzuhalten.\n\n` +
    `Tipp für nächste Woche:\nHalte deine Routine und leg beim Bankdrücken einen kleinen Satz drauf.\n\n` +
    `Weiter so — du bleibst richtig gut dran!`;
}
