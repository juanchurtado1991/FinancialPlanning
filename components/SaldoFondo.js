import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { calcAcumulacion, calcRetiros, calcSaldo, fmt, fmtPct, fmtYrs, fmtNum } from '@/lib/calculations';
import { ParamInput } from './Acumulacion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function SaldoFondo({ acumParams, retParams, saldoParams, onParamsChange }) {
  const [anios, setAnios] = useState(saldoParams?.anios || 40);
  const [p, setP] = useState({ fondoTotal: 220000, reqMensualUSD: 1000, tasaRendimiento: 6, inflacion: 3, ...retParams });

  useEffect(() => {
    if (saldoParams?.anios) setAnios(saldoParams.anios);
  }, [saldoParams]);

  useEffect(() => {
    if (retParams) setP(prev => ({ ...prev, ...retParams }));
  }, [retParams]);

  function updateAnios(v) {
    const val = v === '' ? '' : parseInt(v);
    setAnios(val);
    onParamsChange?.('saldo', { anios: val || 40 });
  }

  function updateRet(key, val) {
    const next = { ...p, [key]: val === '' ? '' : Number(val) };
    setP(next);
    onParamsChange?.('ret', next);
  }

  // 1. First, calculate true Acumulacion to know the authentic starting fund
  const acumCalc = calcAcumulacion(acumParams);
  const fondoAcumulado = acumCalc.saldoFinal > 0 ? Math.round(acumCalc.saldoFinal) : null;
  const fondoTotal = fondoAcumulado ?? p.fondoTotal;

  // 2. Re-calculate Retiros with the fresh parameters
  const r = calcRetiros({ ...p, fondoTotal });
  const { tasaPond, rInflacion, reqAnualUSD } = r;

  // trueCalc calculates up to 100 years so KPIs reflect reality, not just the chart limit.
  const fullCalc = calcSaldo({
    fondoTotal, tasaPond, rInflacion, reqAnualUSD, anios: 100,
  });

  const { superavit, maxSaldo, maxAnio } = fullCalc;
  const agotIdx = fullCalc.agotIdx;
  
  // Cut the rows visually to what the user requested for the chart/table
  const visibleAnios = Math.min(100, Math.max(1, anios));
  const rows = fullCalc.rows.slice(0, visibleAnios);

  const aniosDura = agotIdx >= 0 ? agotIdx + 1 : null;
  const fondoDuraLabel = aniosDura === null ? '100+ años' : `${aniosDura} año${aniosDura === 1 ? '' : 's'}`;
  const fondoDuraColor = aniosDura === null || aniosDura > 30 ? '#34d399' : aniosDura > 10 ? '#fbbf24' : '#f87171';
  const fondoDuraIcon  = aniosDura === null || aniosDura > 30 ? '✅' : aniosDura > 10 ? '⚠️' : '🔴';

  // Used for chart lines
  const chartData = {
    labels: rows.map(r => `Año ${r.anio}`),
    datasets: [
      {
        label: 'Capital al Final',
        data: rows.map(r => Math.round(r.saldoFinal)),
        borderColor: '#5b8dee', backgroundColor: 'rgba(91,141,238,0.12)',
        fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5, yAxisID: 'y',
      },
      {
        label: 'Valor Real',
        data: rows.map(r => Math.round(r.poderAdq)),
        borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.06)',
        fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2, borderDash: [5, 3], yAxisID: 'y',
      },
      {
        label: 'Balance Anual',
        data: rows.map(r => Math.round(r.delta)),
        borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)',
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2, yAxisID: 'y1',
      },
    ],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(15,22,41,0.95)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: $${fmtNum(Math.round(ctx.raw))}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { maxTicksLimit: 10 } },
      y:  { type: 'linear', position: 'left',  grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$' + fmtK(v) } },
      y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false },           ticks: { callback: v => '$' + fmtK(v) } },
    },
  };

  function downloadCSV() {
    const header = ['Año','Capital al Iniciar','Ganancia','Lo que Sacas','Capital al Final','Valor Real','Balance Anual','Años de Respaldo'];
    const csvRows = rows.map(r => [r.anio, r.saldoInicial, r.intereses, r.retiro, r.saldoFinal, r.poderAdq, r.delta, r.cobertura].map(v => Math.round(v)));
    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'saldo_fondo.csv'; a.click();
  }

  return (
    <div className="content-section">
      <div className="params-and-charts">
        {/* Left: params + KPIs */}
        <div className="params-panel glass-card">
          <div className="params-title">⚙️ Supuestos Generales</div>
          <p className="params-note">Puedes editar los parámetros aquí mismo. También se actualizarán en la pestaña de <strong>Retiros</strong>.</p>

          <div className="divider" />
          <div className="saldo-summary-params">
            {fondoAcumulado > 0 && (
              <div style={{ fontSize: 11, color: 'var(--accent-light)', background: 'var(--accent-dim)', border: '1px solid rgba(91,141,238,0.25)', borderRadius: 6, padding: '5px 9px', lineHeight: 1.5, marginBottom: 6 }}>
                🔗 Saldo enlazado desde <strong>Acumulación</strong>
              </div>
            )}
            <ParamInput label="Monto del Fondo"       prefix="$" value={fondoTotal}      onChange={v => updateRet('fondoTotal', v)}      step="1000" />
            <ParamInput label="Requerimiento Mensual" prefix="$" value={p.reqMensualUSD} onChange={v => updateRet('reqMensualUSD', v)} step="50" />
            <ParamInput label="Tasa de Rendimiento"   suffix="%" value={p.tasaRendimiento} onChange={v => updateRet('tasaRendimiento', v)} step="0.5" />
            <ParamInput label="Inflación"             suffix="%" value={p.inflacion}     onChange={v => updateRet('inflacion', v)}     step="0.5" />
          </div>

          <div className="divider" />
          {/* Duration indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,0,0,0.18)', border: `1.5px solid ${fondoDuraColor}33`,
            borderLeft: `4px solid ${fondoDuraColor}`,
            borderRadius: 8, padding: '10px 14px', margin: '2px 0',
          }}>
            <span style={{ fontSize: 22 }}>{fondoDuraIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>El dinero te alcanzará para</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: fondoDuraColor, lineHeight: 1 }}>{fondoDuraLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Fondo: {fmt(fondoTotal)} · Retiro Año 1: {fmt(reqAnualUSD)}/año</div>
            </div>
          </div>

          <div className="divider" />
          <div className="saldo-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div className="kpi-card kpi-red" style={{ padding: '12px 6px', alignItems: 'center', textAlign: 'center' }}>
              <span className="kpi-label">Se Agota</span>
              <span className="kpi-value" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{agotIdx >= 0 ? `Año ${agotIdx + 1}` : 'Nunca'}</span>
            </div>
            <div className="kpi-card kpi-blue" style={{ padding: '12px 6px', alignItems: 'center', textAlign: 'center' }}>
              <span className="kpi-label">Pico Máx</span>
              <span className="kpi-value" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{fmtK(maxSaldo) ? '$'+fmtK(maxSaldo) : '$0'}</span>
            </div>
            <div className="kpi-card kpi-yellow" style={{ padding: '12px 6px', alignItems: 'center', textAlign: 'center' }}>
              <span className="kpi-label">Año Pico</span>
              <span className="kpi-value" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>Año {maxAnio}</span>
            </div>
          </div>

          <div className="divider" />
          <ParamInput label="Años a simular" hint="En la tabla y gráfica" suffix="años" value={anios} onChange={updateAnios} min="1" max="60" step="1" />
          <div className="divider" />
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={downloadCSV}>
            ⬇️ Descargar Excel / CSV
          </button>
        </div>

        {/* Chart */}
        <div className="chart-panel glass-card">
          <div className="chart-title">Evolución del Capital</div>
          <div className="chart-container">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-panel glass-card">
        <div className="table-header">
          <h3>📋 Evolución Año a Año</h3>
          <button className="btn btn-ghost btn-sm" onClick={downloadCSV}>⬇️ CSV</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Año</th>
                <th className="hide-mobile">Capital al Iniciar</th>
                <th className="hide-mobile">Ganancia</th>
                <th>Lo que Sacas</th>
                <th>Capital al Final</th>
                <th className="hide-mobile">Valor Real (sin inflac.)</th>
                <th className="hide-mobile">Balance Anual</th>
                <th className="hide-mobile">Años de Respaldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const rowCls = r.saldoFinal < 0 ? 'row-depleted row-negative' : r.delta < 0 ? 'row-negative' : 'row-positive';
                const deltaCls = r.delta >= 0 ? 'cell-positive' : 'cell-negative';
                const cobCls   = r.cobertura >= 1 ? 'cell-positive' : 'cell-negative';
                return (
                  <tr key={r.anio} className={rowCls}>
                    <td>Año {r.anio}</td>
                    <td className="hide-mobile">{fmt(r.saldoInicial)}</td>
                    <td className="cell-positive hide-mobile">{fmt(r.intereses)}</td>
                    <td>{fmt(r.retiro)}</td>
                    <td><strong>{fmt(r.saldoFinal)}</strong></td>
                    <td className="hide-mobile">{fmt(r.poderAdq)}</td>
                    <td className={`hide-mobile ${deltaCls}`}>{(r.delta >= 0 ? '+' : '') + fmt(r.delta)}</td>
                    <td className={`hide-mobile ${cobCls}`}>{fmtYrs(r.cobertura)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SParam({ label, value }) {
  return (
    <div className="sparam">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function fmtK(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}
