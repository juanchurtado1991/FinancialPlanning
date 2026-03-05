'use client';
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { calcRetiros, fmt, fmtPct, fmtNum } from '@/lib/calculations';
import { ParamInput } from './Acumulacion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DEFAULTS = {
  fondoTotal: 220000, invertidoElsal: 100000, reqMensualEur: 800,
  tasaCambio: 1.2, tasaElsal: 8, fondoExt: 60000, tasaExt: 4,
  inflacion: 3, anios: 40,
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

  // Expose calc result to parent (for Saldo del Fondo)
  useEffect(() => { onCalcReady?.(r); }, [r.reqAnualUSD, r.tasaPond, r.rInflacion, onCalcReady]);

  const chartData = {
    labels: ['Escenario Actual'],
    datasets: [
      { label: 'Requerimiento',  data: [r.reqAnualUSD],  backgroundColor: 'rgba(248,113,113,0.75)', borderWidth: 0, borderRadius: 5 },
      { label: 'Solo ELSAL',     data: [r.ingresoElsal], backgroundColor: 'rgba(52,211,153,0.75)',  borderWidth: 0, borderRadius: 5 },
      { label: 'Solo Extranjero',data: [r.ingresoExt],   backgroundColor: 'rgba(251,191,36,0.75)',  borderWidth: 0, borderRadius: 5 },
      { label: 'Mixto',          data: [r.ingresoMixto], backgroundColor: 'rgba(91,141,238,0.75)',  borderWidth: 0, borderRadius: 5 },
    ],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
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

  function signDiff(diff) {
    const cls = diff >= 0 ? 'cell-positive' : 'cell-negative';
    return <strong className={cls}>{(diff >= 0 ? '+' : '') + fmt(diff)}</strong>;
  }

  function downloadCSV() {
    const header = ['Año','Efectivo Req ($)','Tasa Ponderada','Monto a Invertir'];
    const csvRows = r.rows.map(row => [row.anio, Math.round(row.retiro), (row.tasaPond * 100).toFixed(4), Math.round(row.montoInv)]);
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
          <ParamInput label="Monto Total del Fondo"          hint="Disponible para invertir"   prefix="$" value={p.fondoTotal}      onChange={v => update('fondoTotal', v)}      step="1000" />
          <ParamInput label="Monto ya invertido en ELSAL"    hint="Inversión local actual"      prefix="$" value={p.invertidoElsal}  onChange={v => update('invertidoElsal', v)}  step="1000" />
          <ParamInput label="Requerimiento Mensual"          hint="Efectivo mensual en euros"   prefix="€" value={p.reqMensualEur}   onChange={v => update('reqMensualEur', v)}   step="50" />
          <ParamInput label="Tasa de Cambio €→$"             hint="1 euro = X dólares"          suffix="$/€" value={p.tasaCambio}   onChange={v => update('tasaCambio', v)}      step="0.05" min="0.5" max="5" />
          <ParamInput label="Tasa ELSAL (anual)"             hint="Rendimiento inversiones locales" suffix="%" value={p.tasaElsal}  onChange={v => update('tasaElsal', v)}       step="0.5" min="0" max="30" />
          <ParamInput label="Fondo Ext. ($)" hint="Invertido en el extranjero" prefix="$"
            value={p.fondoExt} onChange={v => update('fondoExt', v)} step="5000" />
          <ParamInput label="Tasa Ext. (%)" hint="Rendimiento extranjero" suffix="%"
            value={p.tasaExt} onChange={v => update('tasaExt', v)} step="0.5" min="0" />
          <ParamInput label="Inflación (%)" hint="Tasa de inflación anual" suffix="%"
            value={p.inflacion} onChange={v => update('inflacion', v)} step="0.5" min="0" />
          <div className="divider" />
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={downloadCSV}>
            ⬇️ Descargar Excel / CSV
          </button>
        </div>

        {/* Right: results + chart */}
        <div className="retiros-right">
          <div className="scenarios-grid">
            <div className="scenario-card glass-card scenario-elsal">
              <div className="scenario-icon">🇸🇻</div>
              <h4>Solo ELSAL</h4>
              <div className="scenario-stat"><span>Ingreso Anual</span><strong>{fmt(r.ingresoElsal)}</strong></div>
              <div className="scenario-stat"><span>vs Requerimiento</span>{signDiff(r.ingresoElsal - r.reqAnualUSD)}</div>
            </div>
            <div className="scenario-card glass-card scenario-ext">
              <div className="scenario-icon">🌍</div>
              <h4>Solo Extranjero</h4>
              <div className="scenario-stat"><span>Ingreso Anual</span><strong>{fmt(r.ingresoExt)}</strong></div>
              <div className="scenario-stat"><span>vs Requerimiento</span>{signDiff(r.ingresoExt - r.reqAnualUSD)}</div>
            </div>
            <div className="scenario-card glass-card scenario-mixto">
              <div className="scenario-icon">⚖️</div>
              <h4>Mixto</h4>
              <div className="scenario-stat"><span>Ingreso Anual</span><strong>{fmt(r.ingresoMixto)}</strong></div>
              <div className="scenario-stat"><span>vs Requerimiento</span>{signDiff(r.ingresoMixto - r.reqAnualUSD)}</div>
            </div>
          </div>

          <div className="metrics-row">
            <div className="metric-card glass-card"><span className="metric-label">Requerimiento Anual</span><span className="metric-value">{fmt(r.reqAnualUSD)}</span></div>
            <div className="metric-card glass-card"><span className="metric-label">Tasa Ponderada Mixta</span><span className="metric-value">{fmtPct(r.tasaPond)}</span></div>
            <div className="metric-card glass-card"><span className="metric-label">Fondo Disp. ELSAL</span><span className="metric-value">{fmt(r.fondoElsalDisp)}</span></div>
          </div>

          <div className="chart-panel glass-card">
            <div className="chart-title">Ingresos vs Requerimiento</div>
            <div className="chart-container" style={{ height: 200 }}>
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
                <th>Año</th><th>Efectivo Req. ($)</th><th>Tasa Ponderada</th><th>Monto a Invertir</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map(row => (
                <tr key={row.anio}>
                  <td>Año {row.anio}</td>
                  <td>{fmt(row.retiro)}</td>
                  <td>{fmtPct(row.tasaPond)}</td>
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
