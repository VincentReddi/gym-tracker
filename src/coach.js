// KI-Coach: Wochenanalyse. Frontend-Teil.
// Die eigentliche KI läuft über den Cloudflare Worker (siehe worker/README.md),
// damit der API-Key nie in den Browser gelangt.

import { activeWorkouts, exerciseById, state } from './state.js';
import { localDS, deDate, escapeHtml } from './utils.js';

// >>> Nach dem Deploy des Workers hier die URL eintragen: <<<
export const AI_ENDPOINT = 'https://sunny-coyote-9490.vincentreddi.deno.net'; // Deno-Deploy-Proxy

// --- Zeit-/Wochen-Helfer (Woche = Montag..Sonntag) ---
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sonntag
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}
export function weekKey(date = new Date()) {
  return localDS(mondayOf(date));
}
export function isSunday(date = new Date()) {
  return date.getDay() === 0;
}
export function weekWorkouts(date = new Date()) {
  const start = mondayOf(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const s = localDS(start);
  const e = localDS(end);
  return activeWorkouts().filter((w) => w.date >= s && w.date < e);
}
export function weekTrainingDays(date = new Date()) {
  return new Set(weekWorkouts(date).map((w) => w.date)).size;
}
export function canAnalyze(date = new Date()) {
  return isSunday(date) && weekTrainingDays(date) >= 2;
}

// --- Datenaufbereitung für die KI (kompakt, strukturiert) ---
export function buildSummary(date = new Date()) {
  const wk = weekWorkouts(date);
  const byEx = {};
  for (const w of wk) {
    const ex = exerciseById(w.exId);
    const name = ex ? ex.name : 'Unbekannt';
    const muscle = ex ? ex.muscle : '—';
    const vol = w.sets.reduce((a, s) => a + s.kg * s.reps, 0);
    const max = Math.max(...w.sets.map((s) => s.kg));
    if (!byEx[name]) {
      byEx[name] = { muskelgruppe: muscle, sessions: 0, volumen: 0, maxGewicht: 0, tage: [] };
    }
    byEx[name].sessions++;
    byEx[name].volumen += vol;
    byEx[name].maxGewicht = Math.max(byEx[name].maxGewicht, max);
    if (!byEx[name].tage.includes(deDate(w.date))) byEx[name].tage.push(deDate(w.date));
  }

  const muskelgruppen = {};
  for (const v of Object.values(byEx)) {
    muskelgruppen[v.muskelgruppe] = (muskelgruppen[v.muskelgruppe] || 0) + v.sessions;
  }

  const total = (list) =>
    Math.round(list.reduce((a, w) => a + w.sets.reduce((b, s) => b + s.kg * s.reps, 0), 0));

  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 7);

  return {
    trainingstage: weekTrainingDays(date),
    gesamtvolumen_kg: total(wk),
    vorwoche_volumen_kg: total(weekWorkouts(prevDate)),
    muskelgruppen_sessions: muskelgruppen,
    uebungen: Object.entries(byEx).map(([name, v]) => ({
      name,
      muskelgruppe: v.muskelgruppe,
      sessions: v.sessions,
      volumen_kg: Math.round(v.volumen),
      max_gewicht_kg: v.maxGewicht,
      tage: v.tage,
    })),
  };
}

// --- Cache pro Nutzer + Woche (lokal; spart Kosten, keine Doppel-Generierung) ---
function cacheKey(date = new Date()) {
  return `gym_analysis_${state.currentUser}_${weekKey(date)}`;
}
export function getCachedAnalysis(date = new Date()) {
  try {
    return localStorage.getItem(cacheKey(date));
  } catch (e) {
    return null;
  }
}
function setCachedAnalysis(text, date = new Date()) {
  try {
    localStorage.setItem(cacheKey(date), text);
  } catch (e) {
    /* Speicher voll / privat – ignorieren */
  }
}

export async function requestAnalysis(date = new Date()) {
  if (!AI_ENDPOINT) throw new Error('not-configured');
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ summary: buildSummary(date) }),
  });
  if (!res.ok) throw new Error('request-failed');
  const data = await res.json();
  if (!data.text) throw new Error('empty');
  setCachedAnalysis(data.text, date);
  return data.text;
}

// --- Statusmodell ---
function coachStatus() {
  const days = weekTrainingDays();
  const cached = getCachedAnalysis();
  if (cached) return { kind: 'ready', days, cached };
  if (!isSunday()) return { kind: 'wait-sunday', days };
  if (days < 2) return { kind: 'need-more', days };
  return { kind: 'can-generate', days };
}

function analysisHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// --- Vollansicht (Coach-Tab) ---
export function renderCoach() {
  const el = document.getElementById('coach-content');
  if (!el) return;
  const st = coachStatus();

  if (st.kind === 'ready') {
    el.innerHTML = `
      <div class="coach-analysis">${analysisHtml(st.cached)}</div>
      <div class="coach-meta">Analyse der Woche ab ${weekKey()}</div>
      <button class="btn" data-action="coach-generate" style="margin-top:14px;">Neu analysieren</button>`;
    return;
  }
  if (st.kind === 'can-generate') {
    el.innerHTML = AI_ENDPOINT
      ? `<div class="empty" style="padding:1.5rem 0 1rem;">Starke Woche mit ${st.days} Trainings! 💪<br>Hol dir deine persönliche KI-Analyse.</div>
         <button class="btn btn-primary" data-action="coach-generate">🤖 Wochen-Analyse erstellen</button>`
      : notConfiguredHtml();
    return;
  }
  if (st.kind === 'need-more') {
    el.innerHTML = `<div class="empty">Diese Woche erst ${st.days} Training${st.days === 1 ? '' : 's'}.<br>Ab <strong>2 Trainings</strong> gibt's Sonntags deine KI-Analyse.</div>`;
    return;
  }
  // wait-sunday
  el.innerHTML = `<div class="empty">🤖 Deine KI-Wochenanalyse gibt's <strong>jeden Sonntag</strong>.<br>Diese Woche bisher: ${st.days} Training${st.days === 1 ? '' : 's'} (min. 2 nötig).</div>`;
}

function notConfiguredHtml() {
  return `<div class="empty">🤖 KI-Coach ist bereit — es fehlt nur noch der Worker-Endpoint.<br>
    <span style="font-size:12px;color:var(--text3);">Siehe <code>worker/README.md</code>, dann <code>AI_ENDPOINT</code> in <code>src/coach.js</code> setzen.</span></div>`;
}

export async function generateAnalysis() {
  const el = document.getElementById('coach-content');
  if (!el) return;
  if (!AI_ENDPOINT) {
    el.innerHTML = notConfiguredHtml();
    return;
  }
  el.innerHTML = '<div class="empty">Analysiere deine Woche… 🤖</div>';
  try {
    await requestAnalysis();
  } catch (e) {
    el.innerHTML = `<div class="coach-error">Analyse konnte nicht geladen werden. Versuch es gleich nochmal.</div>
      <button class="btn" data-action="coach-generate" style="margin-top:12px;">Erneut versuchen</button>`;
    return;
  }
  renderCoach();
  renderCoachCard();
}

// --- Featured-Karte auf dem Dashboard ---
export function renderCoachCard() {
  const el = document.getElementById('coach-card');
  if (!el) return;
  const st = coachStatus();
  let inner;

  if (st.kind === 'ready') {
    const preview = st.cached.replace(/\s+/g, ' ').slice(0, 90);
    inner = `<div class="coach-card-title">✨ Deine Wochen-Analyse ist da</div>
      <div class="coach-card-sub">${escapeHtml(preview)}…</div>
      <button class="btn btn-primary coach-card-btn" data-tab="coach">Ansehen</button>`;
  } else if (st.kind === 'can-generate') {
    inner = `<div class="coach-card-title">🤖 KI-Coach bereit</div>
      <div class="coach-card-sub">${st.days} Trainings diese Woche — hol dir deine persönliche Analyse.</div>
      <button class="btn btn-primary coach-card-btn" data-tab="coach">Jetzt erstellen</button>`;
  } else {
    const need = Math.max(0, 2 - st.days);
    inner = `<div class="coach-card-title">🤖 KI-Coach</div>
      <div class="coach-card-sub">${
        st.kind === 'need-more' || st.kind === 'wait-sunday'
          ? `Sonntags gibt's deine Wochenanalyse${need > 0 ? ` — noch ${need} Training${need === 1 ? '' : 's'}` : ''}.`
          : "Sonntags gibt's deine Wochenanalyse."
      }</div>
      <button class="btn coach-card-btn" data-tab="coach">Mehr</button>`;
  }
  el.innerHTML = inner;
}
