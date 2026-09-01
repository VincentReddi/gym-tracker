// Dashboard: Heatmap, Monatskennzahlen, Fortschritts-Chart, letzte Sessions.

import { state, activeWorkouts, activeExercises, exerciseById } from '../state.js';
import { localDS, deDate, escapeHtml } from '../utils.js';

let dashChartInstance = null;

export function renderDashboard() {
  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const workouts = activeWorkouts();
  const mw = workouts.filter((w) => w.date.startsWith(thisMonth));
  document.getElementById('dash-month-title').textContent = now.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
  document.getElementById('dash-total-sessions').textContent = new Set(mw.map((w) => w.date)).size;
  document.getElementById('dash-total-vol').textContent = Math.round(
    mw.reduce((a, w) => a + w.sets.reduce((b, s) => b + s.kg * s.reps, 0), 0)
  ).toLocaleString('de');
  document.getElementById('dash-total-ex').textContent = new Set(mw.map((w) => w.exId)).size;
  renderHeatmap();
  populateDashChartSelect();
  renderDashChart();
  renderLastSessions();
}

export function renderHeatmap() {
  const workouts = activeWorkouts();
  const sel = document.getElementById('heatmap-range');
  const WEEKS = sel ? parseInt(sel.value) : 26;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDS = localDS(today);
  const countMap = {};
  workouts.forEach((w) => {
    countMap[w.date] = (countMap[w.date] || 0) + 1;
  });

  const start = new Date(today);
  const dow = start.getDay();
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  const cols = [];
  const monthLabels = [];
  let cur = new Date(start);
  let lastMonth = -1;
  const cellW = 16;

  for (let w = 0; w < WEEKS; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const ds = localDS(cur);
      const isFuture = ds > todayDS;
      const count = countMap[ds] || 0;
      const label = cur.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      cells.push({ ds, count: isFuture ? -1 : count, label });
      if (d === 0 && cur.getMonth() !== lastMonth && !isFuture) {
        lastMonth = cur.getMonth();
        monthLabels.push({ col: w, label: cur.toLocaleDateString('de-DE', { month: 'short' }) });
      }
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(cells);
  }

  let mhtml = '';
  let lastCol = 0;
  monthLabels.forEach((m) => {
    if (m.col > lastCol) mhtml += `<div style="width:${(m.col - lastCol) * cellW}px;flex-shrink:0;"></div>`;
    mhtml += `<div class="hm-month-lbl" style="width:${cellW}px;flex-shrink:0;">${m.label}</div>`;
    lastCol = m.col + 1;
  });
  const mr = document.getElementById('heatmap-month-row');
  mr.innerHTML = mhtml;
  mr.style.display = 'flex';

  document.getElementById('heatmap-day-labels').innerHTML = ['Mo', '', 'Mi', '', 'Fr', '', 'So']
    .map((l) => `<div class="hm-day-lbl">${l}</div>`)
    .join('');

  const tipMap = {};
  const grid = document.getElementById('heatmap-grid');
  grid.innerHTML = cols
    .map(
      (cells) =>
        `<div class="heatmap-col">${cells
          .map((c) => {
            if (c.count === -1) return `<div class="heatmap-cell" style="opacity:0.15;"></div>`;
            let tipHtml;
            if (c.count === 0) {
              tipHtml = `<strong>${c.label}</strong>Kein Training`;
            } else {
              const lines = workouts
                .filter((w) => w.date === c.ds)
                .map((w) => {
                  const ex = exerciseById(w.exId);
                  return `${ex ? escapeHtml(ex.name) : '?'} - ${Math.max(...w.sets.map((s) => s.kg))} kg`;
                });
              tipHtml = `<strong>${c.label}</strong>${lines.join('<br>')}`;
            }
            tipMap[c.ds] = tipHtml;
            return `<div class="heatmap-cell" data-active="${c.count > 0 ? 1 : 0}" data-ds="${c.ds}"></div>`;
          })
          .join('')}</div>`
    )
    .join('');

  const tip = document.getElementById('hm-tooltip');
  grid.querySelectorAll('.heatmap-cell[data-ds]').forEach((cell) => {
    cell.addEventListener('mouseenter', () => {
      tip.innerHTML = tipMap[cell.dataset.ds] || '';
      tip.style.display = 'block';
    });
    cell.addEventListener('mousemove', (e) => {
      tip.style.left = e.clientX + 14 + 'px';
      tip.style.top = e.clientY - tip.offsetHeight - 10 + 'px';
    });
    cell.addEventListener('mouseleave', () => {
      tip.style.display = 'none';
    });
  });
}

export function populateDashChartSelect() {
  const sel = document.getElementById('dash-chart-exercise');
  const used = [...new Set(activeWorkouts().map((w) => w.exId))];
  const exs = activeExercises().filter((e) => used.includes(e.id));
  const prev = sel.value;
  sel.innerHTML =
    '<option value="">Übung wählen</option>' +
    exs.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  if (prev) sel.value = prev;
  else if (exs.length) sel.value = exs[0].id;
}

export function setDashMode(mode) {
  state.dashChartMode = mode;
  document.getElementById('dash-btn-weight').classList.toggle('active', mode === 'weight');
  document.getElementById('dash-btn-volume').classList.toggle('active', mode === 'volume');
  renderDashChart();
}

export function renderDashChart() {
  const exId = parseInt(document.getElementById('dash-chart-exercise').value);
  const ctx = document.getElementById('dashChart').getContext('2d');
  if (dashChartInstance) {
    dashChartInstance.destroy();
    dashChartInstance = null;
  }
  if (!exId) return;
  const data = activeWorkouts()
    .filter((w) => w.exId === exId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return;
  const values =
    state.dashChartMode === 'weight'
      ? data.map((w) => Math.max(...w.sets.map((s) => s.kg)))
      : data.map((w) => Math.round(w.sets.reduce((a, s) => a + s.kg * s.reps, 0)));
  dashChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((w) => deDate(w.date)),
      datasets: [
        {
          data: values,
          borderColor: '#c8ff00',
          backgroundColor: 'rgba(200,255,0,0.06)',
          pointBackgroundColor: '#c8ff00',
          pointBorderColor: '#0d0d0d',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: chartOptions(),
  });
}

function renderLastSessions() {
  const el = document.getElementById('dash-last-sessions');
  const workouts = activeWorkouts();
  if (!workouts.length) {
    el.innerHTML = '<div class="empty">Noch kein Training geloggt.</div>';
    return;
  }
  const lastPerEx = {};
  workouts.forEach((w) => {
    if (!lastPerEx[w.exId] || w.date > lastPerEx[w.exId].date) lastPerEx[w.exId] = w;
  });
  el.innerHTML = Object.values(lastPerEx)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((w) => {
      const ex = exerciseById(w.exId);
      const maxKg = Math.max(...w.sets.map((s) => s.kg));
      const daysAgo = Math.round((new Date() - new Date(w.date)) / 86400000);
      const agoStr = daysAgo === 0 ? 'Heute' : daysAgo === 1 ? 'Gestern' : `vor ${daysAgo} Tagen`;
      return `<div class="last-session-card">
      <div>
        <div class="ls-name">${ex ? escapeHtml(ex.name) : 'Gelöschte Übung'} <span class="tag" style="margin-left:4px;">${ex ? escapeHtml(ex.muscle) : ''}</span></div>
        <div class="ls-sets">${w.sets.map((s, i) => `<span style="color:var(--text3);margin-right:6px;">S${i + 1}</span>${s.kg} kg × ${s.reps} Reps`).join('<br>')}</div>
      </div>
      <div class="ls-right">
        <div class="ls-date">${agoStr}</div>
        <div class="ls-max">${maxKg} kg</div>
        <div class="ls-maxlabel">Max</div>
      </div>
    </div>`;
    })
    .join('');
}

/** Gemeinsame Chart.js-Optionen für die Linien-Charts (Dashboard + Fortschritt). */
export function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f1f1f',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#888',
        bodyColor: '#f0f0f0',
        padding: 10,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555', font: { size: 11 } } },
    },
  };
}
