// Fortschritt: Chart pro Übung (Max-Gewicht oder Volumen) + Kennzahlen.

import { state, activeWorkouts, activeExercises } from '../state.js';
import { deDate, escapeHtml } from '../utils.js';
import { chartOptions } from './dashboard.js';

let chartInstance = null;

export function populateChartSelect() {
  const used = [...new Set(activeWorkouts().map((w) => w.exId))];
  const sel = document.getElementById('chart-exercise');
  const prev = sel.value;
  sel.innerHTML =
    '<option value="">Übung wählen</option>' +
    activeExercises()
      .filter((e) => used.includes(e.id))
      .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
      .join('');
  if (prev) sel.value = prev;
}

export function setChartMode(mode) {
  state.chartMode = mode;
  document.getElementById('btn-weight').classList.toggle('active', mode === 'weight');
  document.getElementById('btn-volume').classList.toggle('active', mode === 'volume');
  renderChart();
}

export function renderChart() {
  const exId = parseInt(document.getElementById('chart-exercise').value);
  const metricsEl = document.getElementById('chart-metrics');
  const ctx = document.getElementById('progressChart').getContext('2d');
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (!exId) {
    metricsEl.innerHTML = '';
    return;
  }
  const data = activeWorkouts()
    .filter((w) => w.exId === exId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) {
    metricsEl.innerHTML = '<div class="empty">Keine Daten für diese Übung.</div>';
    return;
  }
  const values =
    state.chartMode === 'weight'
      ? data.map((w) => Math.max(...w.sets.map((s) => s.kg)))
      : data.map((w) => Math.round(w.sets.reduce((a, s) => a + s.kg * s.reps, 0)));
  chartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((w) => deDate(w.date)),
      datasets: [
        {
          label: state.chartMode === 'weight' ? 'Max. Gewicht (kg)' : 'Volumen (kg)',
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
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const diff = values.length > 1 ? values[values.length - 1] - values[0] : 0;
  metricsEl.innerHTML = `
    <div class="metric-card"><div class="metric-label">Bestleistung</div><div class="metric-val">${max} kg</div></div>
    <div class="metric-card"><div class="metric-label">Durchschnitt</div><div class="metric-val">${avg} kg</div></div>
    <div class="metric-card"><div class="metric-label">Fortschritt</div><div class="metric-val ${diff >= 0 ? 'stat-positive' : 'stat-negative'}">${diff >= 0 ? '+' : ''}${diff} kg</div></div>
  `;
}
