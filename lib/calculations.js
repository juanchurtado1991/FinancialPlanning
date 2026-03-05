// =====================================================
// lib/calculations.js — Financial calculation engine
// Pure functions, no React dependencies
// =====================================================

/**
 * ACUMULACIÓN
 * Intereses_n   = Saldo_inicial × Tasa
 * Saldo_final   = Saldo_inicial + Aportación + Intereses_n
 */
export function calcAcumulacion({ montoInicial = 10000, aportAnual = 5000, tasa = 4, anios = 40 } = {}) {
  const rate = (Number(tasa) || 4) / 100;
  const years = Math.max(1, Math.min(100, Math.round(Number(anios) || 40)));
  const rows = [];
  let saldoInicial = montoInicial;
  let totalIntereses = 0;

  for (let yr = 1; yr <= years; yr++) {
    const intereses  = saldoInicial * rate;
    const saldoFinal = saldoInicial + aportAnual + intereses;
    totalIntereses  += intereses;
    rows.push({
      anio: yr,
      saldoInicial,
      aportAnual,
      intereses,
      saldoFinal,
      aportAcum: yr * aportAnual,
    });
    saldoInicial = saldoFinal;
  }

  const last = rows[rows.length - 1];
  if (!last) return { rows: [], totalAportado: 0, totalIntereses: 0, saldoFinal: 0, multiplicador: 0 };
  return {
    rows,
    totalAportado:  (Number(montoInicial) || 0) + years * (Number(aportAnual) || 0),
    totalIntereses,
    saldoFinal:     last.saldoFinal,
    multiplicador:  montoInicial > 0 ? last.saldoFinal / montoInicial : 0,
  };
}

/**
 * RETIROS
 * Req_anual_USD = Req_mensual_USD × 12
 * Retiro_n      = Req₁ × (1 + inflación)^(n-1)
 * Tasa          = tasaRendimiento / 100
 * Ingreso_anual = fondoTotal × Tasa
 */
export function calcRetiros({ fondoTotal = 220000, reqMensualUSD = 1000,
                               tasaRendimiento = 6, inflacion = 3, anios = 40 } = {}) {
  const tasa       = (Number(tasaRendimiento) || 6) / 100;
  const rInflacion = (Number(inflacion) || 3) / 100;
  const years      = Math.max(1, Math.min(100, Math.round(Number(anios) || 40)));

  const reqAnualUSD  = (Number(reqMensualUSD) || 0) * 12;
  const ingresoAnual = fondoTotal * tasa;
  const tasaPond     = tasa; // single-fund rate, kept as "tasaPond" for compatibility with SaldoFondo

  const rows = Array.from({ length: years }, (_, i) => {
    const yr     = i + 1;
    const retiro = reqAnualUSD * Math.pow(1 + rInflacion, yr - 1);
    // Capital needed so that interest alone covers this withdrawal
    const montoInv = tasa > 0 ? retiro / tasa : 0;
    return { anio: yr, retiro, tasaPond, montoInv };
  });

  return {
    reqAnualUSD, ingresoAnual,
    tasaPond, rInflacion,
    rows,
  };
}

/**
 * SALDO DEL FONDO
 * Intereses_n    = Saldo_inicial_n × Tasa_ponderada
 * Saldo_final_n  = Saldo_inicial_n + Intereses_n − Retiro_n
 * Poder_adquis   = Saldo_final / (1 + π)^n
 * Cobertura      = Saldo_final / Retiro_n
 */
export function calcSaldo({ fondoTotal = 220000, tasaPond = 0.069, rInflacion = 0.03, reqAnualUSD = 11520, anios = 40 } = {}) {
  const years = Math.max(1, Math.min(100, Math.round(Number(anios) || 40)));
  const rows  = [];
  let saldoInicial = fondoTotal;

  for (let yr = 1; yr <= years; yr++) {
    const intereses  = saldoInicial * tasaPond;
    const retiro     = reqAnualUSD * Math.pow(1 + rInflacion, yr - 1);
    const saldoFinal = saldoInicial + intereses - retiro;
    const poderAdq   = saldoFinal / Math.pow(1 + rInflacion, yr);
    const delta      = intereses - retiro;
    const cobertura  = retiro > 0 ? saldoFinal / retiro : 0;
    rows.push({ anio: yr, saldoInicial, intereses, retiro, saldoFinal, poderAdq, delta, cobertura });
    saldoInicial = Math.max(0, saldoFinal); // stop at 0 — fund can't go negative
  }

  const superavit   = rows.filter(r => r.delta >= 0).length;
  const agotIdx     = rows.findIndex(r => r.saldoFinal <= 0);
  const saldos      = rows.map(r => r.saldoFinal);
  const maxSaldo    = saldos.length > 0 ? Math.max(...saldos) : 0;
  const maxAnio     = rows.findIndex(r => r.saldoFinal === maxSaldo) + 1;

  return { rows, superavit, agotIdx, maxSaldo, maxAnio };
}

// =====================================================
// FORMATTING HELPERS (shared across components)
// =====================================================
export const fmt    = (n) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  return '$' + fmtNum(Math.round(n));
};
export const fmtPct = (n) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  return (n * 100).toFixed(2) + '%';
};
export const fmtX   = (n) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  return fmtNum(n, 2) + '×';
};
export const fmtYrs = (n) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  return fmtNum(n, 1) + ' años';
};

export function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}
