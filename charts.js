/* =====================================================
   charts.js — Chart.js chart builders
   ===================================================== */

const CHART_DEFAULTS = {
  font: { family: 'Inter, sans-serif', size: 12 },
  color: 'rgba(136,146,176,1)',
  grid: 'rgba(255,255,255,0.05)',
  accent: '#5b8dee',
  green: '#34d399',
  red: '#f87171',
  yellow: '#fbbf24',
  purple: '#a78bfa',
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.font.family = CHART_DEFAULTS.font.family;

let chartAcumulacion = null;
let chartRetiros = null;
let chartSaldo = null;

function destroyChart(c) { if (c) c.destroy(); }

/* ---------- Acumulación ---------- */
function renderChartAcumulacion(labels, saldoFinal, aportAcumulada, intereses) {
  destroyChart(chartAcumulacion);
  const ctx = document.getElementById('chart-acumulacion').getContext('2d');

  chartAcumulacion = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Saldo Final',
          data: saldoFinal,
          borderColor: CHART_DEFAULTS.accent,
          backgroundColor: 'rgba(91,141,238,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        },
        {
          label: 'Aportación Acumulada',
          data: aportAcumulada,
          borderColor: CHART_DEFAULTS.purple,
          backgroundColor: 'rgba(167,139,250,0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [6, 3],
        },
        {
          label: 'Intereses Acumulados',
          data: intereses,
          borderColor: CHART_DEFAULTS.green,
          backgroundColor: 'rgba(52,211,153,0.06)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: chartOptions('Año', '$'),
  });
  return chartAcumulacion;
}

/* ---------- Retiros (bar) ---------- */
function renderChartRetiros(labels, requerimiento, ingresoElsal, ingresoExt, ingresoMixto) {
  destroyChart(chartRetiros);
  const ctx = document.getElementById('chart-retiros').getContext('2d');

  chartRetiros = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Requerimiento',
          data: requerimiento,
          backgroundColor: 'rgba(248,113,113,0.7)',
          borderColor: CHART_DEFAULTS.red,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Solo ELSAL',
          data: ingresoElsal,
          backgroundColor: 'rgba(52,211,153,0.7)',
          borderColor: CHART_DEFAULTS.green,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Solo Extranjero',
          data: ingresoExt,
          backgroundColor: 'rgba(251,191,36,0.7)',
          borderColor: CHART_DEFAULTS.yellow,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Mixto',
          data: ingresoMixto,
          backgroundColor: 'rgba(91,141,238,0.7)',
          borderColor: CHART_DEFAULTS.accent,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartOptions('Escenario', '$'),
      scales: {
        x: { grid: { color: CHART_DEFAULTS.grid }, ticks: { font: CHART_DEFAULTS.font } },
        y: {
          grid: { color: CHART_DEFAULTS.grid },
          ticks: { callback: v => '$' + fmtK(v) },
        },
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` },
        },
      },
    },
  });
  return chartRetiros;
}

/* ---------- Saldo del Fondo (area + line) ---------- */
function renderChartSaldo(labels, saldoFinal, poderAdquisitivo, delta) {
  destroyChart(chartSaldo);
  const ctx = document.getElementById('chart-saldo').getContext('2d');

  chartSaldo = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Saldo Final',
          data: saldoFinal,
          borderColor: CHART_DEFAULTS.accent,
          backgroundColor: 'rgba(91,141,238,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2.5,
          yAxisID: 'y',
        },
        {
          label: 'Poder Adquisitivo',
          data: poderAdquisitivo,
          borderColor: CHART_DEFAULTS.purple,
          backgroundColor: 'rgba(167,139,250,0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [5, 3],
          yAxisID: 'y',
        },
        {
          label: 'Ingresos − Retiros',
          data: delta,
          borderColor: CHART_DEFAULTS.green,
          backgroundColor: ctx => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(52,211,153,0.25)');
            gradient.addColorStop(1, 'rgba(248,113,113,0.1)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      ...chartOptions('Año', '$'),
      scales: {
        x: { grid: { color: CHART_DEFAULTS.grid } },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: CHART_DEFAULTS.grid },
          ticks: { callback: v => '$' + fmtK(v) },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { callback: v => '$' + fmtK(v) },
        },
      },
    },
  });
  return chartSaldo;
}

/* ---------- Shared options ---------- */
function chartOptions(xLabel, prefix = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(15,22,41,0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${prefix}${formatNumber(Math.round(ctx.raw))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: CHART_DEFAULTS.grid },
        ticks: { font: CHART_DEFAULTS.font },
        title: { display: xLabel !== 'Año', text: xLabel },
      },
      y: {
        grid: { color: CHART_DEFAULTS.grid },
        ticks: { callback: v => prefix + fmtK(v) },
      },
    },
  };
}

function fmtK(v) {
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + 'k';
  return v.toFixed(0);
}
