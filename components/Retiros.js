'use client';
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { calcRetiros, calcSaldo, fmt, fmtPct, fmtNum } from '@/lib/calculations';
import { ParamInput } from './Acumulacion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DEFAULTS = {
  fondoTotal: 220000, reqMensualUSD: 1000,
  tasaRendimiento: 6, inflacion: 3, anios: 40,
};

export default function Retiros({ params: extParams, onParamsChange, onCalcReady, acumSaldoFinal }) {
  const [p, setP] = useState({ ...DEFAULTS, ...(extParams || {}) });

  useEffect(() => { if (extParams) setP({ ...DEFAULTS, ...extParams }); }, [extParams]);

  // Auto-sync fondoTotal from Acumulacion result
  useEffect(() => {
    if (acumSaldoFinal && acumSaldoFinal > 0) {
      setP(prev => {
        const next = { ...prev, fondoTotal: Math.round(acumSaldoFinal) };
        onParamsChange?.('ret', next);
        return next;
      });
    }
  }, [acumSaldoFinal]);

  function update(key, val) {
    const next = { ...p, [key]: val === '' ? '' : Number(val) };
    setP(next);
    onParamsChange?.('ret', next);
  }

  const r = calcRetiros(p);

  // Calculate how many years the fund lasts
  const saldoCalc = calcSaldo({
    fondoTotal:  p.fondoTotal,
    tasaPond:    r.tasaPond,
    rInflacion:  r.rInflacion,
    reqAnualUSD: r.reqAnualUSD,
    anios:       100,
  });
  const aniosDura      = saldoCalc.agotIdx >= 0 ? saldoCalc.agotIdx + 1 : null;
  const fondoDuraLabel = aniosDura === null ? '100+ años' : `${aniosDura} año${aniosDura === 1 ? '' : 's'}`;
  const fondoDuraColor = aniosDura === null || aniosDura > 30 ? '#34d399' : aniosDura > 10 ? '#fbbf24' : '#f87171';
  const fondoDuraIcon  = aniosDura === null || aniosDura > 30 ? '✅' : aniosDura > 10 ? '⚠️' : '🔴';

  // Expose calc result to parent (for Saldo del Fondo)
  useEffect(() => { onCalcReady?.(r); }, [r.reqAnualUSD, r.tasaPond, r.rInflacion, onCalcReady]);

  const diff = r.ingresoAnual - r.reqAnualUSD;
  const diffPositive = diff >= 0;

  const chartData = {
    labels: ['Ingresos del Fondo', 'Requerimiento Anual'],
    datasets: [
      {
        label: 'USD / año',
        data: [r.ingresoAnual, r.reqAnualUSD],
        backgroundColor: [
          diffPositive ? 'rgba(52,211,153,0.75)' : 'rgba(91,141,238,0.75)',
          'rgba(248,113,113,0.75)',
        ],
        borderWidth: 0, borderRadius: 6,
      },
    ],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,22,41,0.95)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$' + fmtK(v) } },
    },
  };

  function downloadCSV() {
    const header = ['Año', 'Retiro Anual ($)', 'Monto a Invertir ($)'];
    const csvRows = r.rows.map(row => [row.anio, Math.round(row.retiro), Math.round(row.montoInv)]);
    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'retiros.csv'; a.click();
  }

  return (
    <div className="content-section">
      <div className="retiros-grid">
        {/* Left: params */}
        <div className="params-panel glass-card">
          <div className="params-title">⚙️ Parámetros del Fondo</div>
          {acumSaldoFinal > 0 && (
            <div style={{ fontSize: 11, color: 'var(--accent-light)', background: 'var(--accent-dim)',
              border: '1px solid rgba(91,141,238,0.25)', borderRadius: 6, padding: '5px 9px', lineHeight: 1.5 }}>
              🔗 Fondo Total enlazado con <strong>Acumulación</strong> ({fmt(acumSaldoFinal)})
            </div>
          )}
          <ParamInput label="Monto Total del Fondo"    hint="Capital disponible para invertir" prefix="$" value={p.fondoTotal}        onChange={v => update('fondoTotal', v)}        step="1000" />
          <ParamInput label="Requerimiento Mensual"    hint="Efectivo que necesitas al mes"    prefix="$" value={p.reqMensualUSD}      onChange={v => update('reqMensualUSD', v)}      step="50" />

          {/* Duration indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,0,0,0.18)', border: `1.5px solid ${fondoDuraColor}33`,
            borderLeft: `4px solid ${fondoDuraColor}`,
            borderRadius: 8, padding: '10px 14px', margin: '2px 0 6px',
          }}>
            <span style={{ fontSize: 22 }}>{fondoDuraIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Con este retiro mensual, el fondo dura</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: fondoDuraColor, lineHeight: 1 }}>{fondoDuraLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Fondo: {fmt(p.fondoTotal)} · Retiro año 1: {fmt(r.reqAnualUSD)}/año</div>
            </div>
          </div>

          <ParamInput label="Tasa de Rendimiento"      hint="% de retorno anual del fondo"    suffix="%" value={p.tasaRendimiento}    onChange={v => update('tasaRendimiento', v)}    step="0.5" min="0" max="30" />
          <ParamInput label="Inflación (%)"            hint="Tasa de inflación anual"         suffix="%" value={p.inflacion}           onChange={v => update('inflacion', v)}           step="0.5" min="0" />
          <div className="divider" />
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={downloadCSV}>
            ⬇️ Descargar Excel / CSV
          </button>
        </div>

        {/* Right: results + chart */}
        <div className="retiros-right">
          <div className="scenarios-grid">
            <div className="scenario-card glass-card scenario-mixto">
              <div className="scenario-icon">📋</div>
              <h4>Requerimiento Anual</h4>
              <div className="scenario-stat"><span>Necesidad Total</span><strong>{fmt(r.reqAnualUSD)}</strong></div>
            </div>
            <div className="scenario-card glass-card scenario-ext">
              <div className="scenario-icon">💰</div>
              <h4>Ingreso del Fondo</h4>
              <div className="scenario-stat"><span>Generado Anual</span><strong>{fmt(r.ingresoAnual)}</strong></div>
            </div>
            <div className="scenario-card glass-card scenario-elsal">
              <div className="scenario-icon">{diffPositive ? '✅' : '🔴'}</div>
              <h4>Superávit / Déficit</h4>
              <div className="scenario-stat"><span>Diferencia Anual</span><strong className={diffPositive ? 'cell-positive' : 'cell-negative'}>{(diff >= 0 ? '+' : '') + fmt(diff)}</strong></div>
            </div>
          </div>

          <div className="chart-panel glass-card">
            <div className="chart-title">Ingresos del Fondo vs Requerimiento Anual</div>
            <div className="chart-container" style={{ height: 220 }}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          </div>
        </div>
      </div>

      {/* Inflation table */}
      <div className="table-panel glass-card">
        <div className="table-header">
          <h3>📋 Requerimientos con Inflación</h3>
          <div className="ret-anios-wrap">
            <label>Años:</label>
            <div className="input-wrapper" style={{ width: 80 }}>
              <input type="number" className="param-input" value={p.anios}
                onChange={e => update('anios', e.target.value)} min="1" max="60" style={{ padding: '6px 8px', fontSize: 13 }} />
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={downloadCSV}>⬇️ CSV</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Año</th><th>Retiro Anual ($)</th><th className="hide-mobile">Tasa Rendimiento</th><th>Capital Necesario</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map(row => (
                <tr key={row.anio}>
                  <td>Año {row.anio}</td>
                  <td>{fmt(row.retiro)}</td>
                  <td className="hide-mobile">{fmtPct(row.tasaPond)}</td>
                  <td>{fmt(row.montoInv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function fmtK(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}
