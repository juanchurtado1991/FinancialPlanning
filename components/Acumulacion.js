'use client';
import { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { calcAcumulacion, fmt, fmtX, fmtNum } from '@/lib/calculations';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DEFAULTS = { montoInicial: 10000, aportAnual: 5000, tasa: 4, anios: 40 };

export default function Acumulacion({ params: extParams, onParamsChange, onCalcReady }) {
  const [p, setP] = useState({ ...DEFAULTS, ...(extParams || {}) });

  // Sync when external params are loaded (scenario load)
  useEffect(() => { if (extParams) setP({ ...DEFAULTS, ...extParams }); }, [extParams]);

  function update(key, val) {
    const next = { ...p, [key]: val === '' ? '' : Number(val) };
    setP(next);
    onParamsChange?.('acum', next);
  }

  const result = calcAcumulacion(p);
  const { rows } = result;

  // Notify parent whenever saldoFinal changes (feeds into Retiros fondoTotal)
  useEffect(() => { onCalcReady?.(result); }, [result.saldoFinal, onCalcReady]);
  const labels   = rows.map(r => `Año ${r.anio}`);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Saldo Final',
        data: rows.map(r => Math.round(r.saldoFinal)),
        borderColor: '#5b8dee', backgroundColor: 'rgba(91,141,238,0.12)',
        fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 6, borderWidth: 2.5,
      },
      {
        label: 'Aportación Acumulada',
        data: rows.map(r => Math.round(r.aportAcum)),
        borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.06)',
        fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 6, borderWidth: 2,
        borderDash: [6, 3],
      },
    ],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(15,22,41,0.95)',
        borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 10,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: $${fmtNum(Math.round(ctx.raw))}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { family: 'Inter' }, maxTicksLimit: 10 } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$' + fmtK(v) } },
    },
  };

  function downloadCSV() {
    const header = ['Año','Saldo Inicial','Aportación Anual','Intereses Ganados','Saldo Final','Aportación Acumulada'];
    const rowsCSV = rows.map(r => [r.anio, r.saldoInicial, r.aportAnual, r.intereses, r.saldoFinal, r.aportAcum].map(v => Math.round(v)));
    const csv = [header, ...rowsCSV].map(r => r.join(',')).join('\n');
    downloadFile(csv, 'acumulacion.csv');
  }

  return (
    <div className="content-section">
      <div className="params-and-charts">
        {/* Params */}
        <div className="params-panel glass-card">
          <div className="params-title">⚙️ Parámetros</div>
          <ParamInput label="Monto Inicial del Fondo" hint="Inversión de inicio" prefix="$"
            value={p.montoInicial} onChange={v => update('montoInicial', v)} step="1000" />
          <ParamInput label="Aportación Anual" hint="Dinero adicional por año" prefix="$"
            value={p.aportAnual} onChange={v => update('aportAnual', v)} step="500" />
          <ParamInput label="Tasa de Interés Anual" hint="Rendimiento promedio" suffix="%"
            value={p.tasa} onChange={v => update('tasa', v)} step="0.5" min="0" max="100" />
          <ParamInput label="Años a Simular" hint="Duración de la simulación" suffix="años"
            value={p.anios} onChange={v => update('anios', v)} step="1" min="1" max="60" />

          <div className="divider" />
          <div className="results-summary">
            <ResultItem label="Saldo Final"           value={fmt(result.saldoFinal)}      cls="green" />
            <ResultItem label="Total Aportado"        value={fmt(result.totalAportado)} />
            <ResultItem label="Ganancias por Interés" value={fmt(result.totalIntereses)}   cls="blue" />
            <ResultItem label="Multiplicador"         value={fmtX(result.multiplicador)}  cls="purple" />
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={downloadCSV}>
            ⬇️ Descargar Excel / CSV
          </button>
        </div>

        {/* Chart */}
        <div className="chart-panel glass-card">
          <div className="chart-title">Evolución del Fondo</div>
          <div className="chart-container">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-panel glass-card">
        <div className="table-header">
          <h3>📋 Tabla de Acumulación</h3>
          <button className="btn btn-ghost btn-sm" onClick={downloadCSV}>⬇️ CSV</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {['Año','Saldo Inicial','Aportación','Intereses Ganados','Saldo Final','Aport. Acumulada'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.anio}>
                  <td>Año {r.anio}</td>
                  <td>{fmt(r.saldoInicial)}</td>
                  <td>{fmt(r.aportAnual)}</td>
                  <td className="cell-positive">{fmt(r.intereses)}</td>
                  <td><strong>{fmt(r.saldoFinal)}</strong></td>
                  <td>{fmt(r.aportAcum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Shared mini-components ────────────────────────────────────────────────────
export function ParamInput({ label, hint, prefix, suffix, value, onChange, ...rest }) {
  return (
    <div className="param-group">
      <label className="param-label">
        {label}
        {hint && <span className="param-hint">{hint}</span>}
      </label>
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          className="param-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          {...rest}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export function ResultItem({ label, value, cls = '' }) {
  return (
    <div className="result-item">
      <span className="result-label">{label}</span>
      <span className={`result-value ${cls}`}>{value}</span>
    </div>
  );
}

function fmtK(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
