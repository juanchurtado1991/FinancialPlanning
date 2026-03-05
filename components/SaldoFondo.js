'use client';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { calcSaldo, fmt, fmtPct, fmtYrs, fmtNum } from '@/lib/calculations';
import { ParamInput } from './Acumulacion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function SaldoFondo({ retCalc, retParams, params: extParams, onParamsChange }) {
  const [anios, setAnios] = useState(extParams?.saldo?.anios || 40);

  useEffect(() => {
    if (extParams?.saldo?.anios) setAnios(extParams.saldo.anios);
  }, [extParams]);

  function updateAnios(v) {
    const val = parseInt(v) || 40;
    setAnios(val);
    onParamsChange?.('saldo', { anios: val });
  }

  const fondoTotal   = retParams?.fondoTotal   ?? 220000;
  const tasaPond     = retCalc?.tasaPond        ?? 0.069;
  const rInflacion   = retCalc?.rInflacion      ?? 0.03;
  const reqAnualUSD  = retCalc?.reqAnualUSD     ?? 11520;

  const { rows, superavit, agotIdx, maxSaldo, maxAnio } = calcSaldo({
    fondoTotal, tasaPond, rInflacion, reqAnualUSD, anios,
  });

  const chartData = {
    labels: rows.map(r => `Año ${r.anio}`),
    datasets: [
      {
        label: 'Saldo Final',
        data: rows.map(r => Math.round(r.saldoFinal)),
        borderColor: '#5b8dee', backgroundColor: 'rgba(91,141,238,0.12)',
        fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5, yAxisID: 'y',
      },
      {
        label: 'Poder Adquisitivo',
        data: rows.map(r => Math.round(r.poderAdq)),
        borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.06)',
        fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2, borderDash: [5, 3], yAxisID: 'y',
      },
      {
        label: 'Ingresos − Retiros',
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
    const header = ['Año','Saldo Inicial','Intereses','Retiros','Saldo Final','Poder Adquisitivo','Delta','Cobertura (años)'];
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
          <div className="params-title">⚙️ Supuestos</div>
          <p className="params-note">Los parámetros vienen de <strong>Retiros</strong>. Modifícalos allí para actualizar.</p>

          <div className="divider" />
          <div className="saldo-summary-params">
            <SParam label="Saldo Inicial"      value={fmt(fondoTotal)} />
            <SParam label="Tasa Ponderada"     value={fmtPct(tasaPond)} />
            <SParam label="Retiro Año 1"       value={fmt(reqAnualUSD)} />
            <SParam label="Inflación"          value={fmtPct(rInflacion)} />
          </div>

          <div className="divider" />
          <div className="saldo-kpis">
            <div className="kpi-card kpi-green">
              <span className="kpi-label">Años con superávit</span>
              <span className="kpi-value">{superavit}</span>
            </div>
            <div className="kpi-card kpi-red">
              <span className="kpi-label">Año de agotamiento</span>
              <span className="kpi-value">{agotIdx >= 0 ? `Año ${agotIdx + 1}` : 'No aplica'}</span>
            </div>
            <div className="kpi-card kpi-blue">
              <span className="kpi-label">Saldo máximo</span>
              <span className="kpi-value" style={{ fontSize: 15 }}>{fmt(maxSaldo)}</span>
            </div>
            <div className="kpi-card kpi-yellow">
              <span className="kpi-label">Año de máximo</span>
              <span className="kpi-value">Año {maxAnio}</span>
            </div>
          </div>

          <div className="divider" />
          <ParamInput label="Años a simular" suffix="años" value={anios} onChange={updateAnios} min="1" max="60" step="1" />
          <div className="divider" />
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={downloadCSV}>
            ⬇️ Descargar Excel / CSV
          </button>
        </div>

        {/* Chart */}
        <div className="chart-panel glass-card">
          <div className="chart-title">Evolución del Saldo del Fondo</div>
          <div className="chart-container">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-panel glass-card">
        <div className="table-header">
          <h3>📋 Saldo del Fondo — Año a Año</h3>
          <button className="btn btn-ghost btn-sm" onClick={downloadCSV}>⬇️ CSV</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {['Año','Saldo Inicial','Intereses','Retiros','Saldo Final','Poder Adquis.','Ingr − Ret','Cobertura'].map(h => (
                  <th key={h}>{h}</th>
                ))}
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
                    <td>{fmt(r.saldoInicial)}</td>
                    <td className="cell-positive">{fmt(r.intereses)}</td>
                    <td>{fmt(r.retiro)}</td>
                    <td><strong>{fmt(r.saldoFinal)}</strong></td>
                    <td>{fmt(r.poderAdq)}</td>
                    <td className={deltaCls}>{(r.delta >= 0 ? '+' : '') + fmt(r.delta)}</td>
                    <td className={cobCls}>{fmtYrs(r.cobertura)}</td>
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
