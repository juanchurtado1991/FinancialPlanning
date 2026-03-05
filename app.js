/* =====================================================
   app.js — FinSim Main Application
   Financial calculations + UI logic
   ===================================================== */

'use strict';

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */
function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}
window.formatNumber = formatNumber;

function fmt(n) { return '$' + formatNumber(Math.round(n)); }
function fmtPct(n) { return (n * 100).toFixed(2) + '%'; }
function fmtX(n) { return formatNumber(n, 2) + '×'; }
function fmtYrs(n) { return formatNumber(n, 1) + ' años'; }
function fmtEur(n) { return '€' + formatNumber(Math.round(n)); }

function $ (id) { return document.getElementById(id); }
function numVal(id) { return parseFloat($(id).value) || 0; }

function showToast(msg, type = 'info') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} visible`;
  setTimeout(() => toast.classList.remove('visible'), 3200);
}

/* =====================================================
   NAVIGATION
   ===================================================== */
const SECTIONS = {
  intro:        { title: 'Introducción',     subtitle: 'Guía del simulador financiero' },
  acumulacion:  { title: 'Acumulación',      subtitle: 'Simulación de crecimiento del fondo' },
  retiros:      { title: 'Retiros',          subtitle: 'Análisis de ingresos y requerimientos' },
  saldo:        { title: 'Saldo del Fondo',  subtitle: 'Evolución durante la fase de retiro' },
};

function goToSection(id) {
  Object.keys(SECTIONS).forEach(k => {
    $(`section-${k}`).classList.toggle('active', k === id);
    $(`nav-${k}`).classList.toggle('active', k === id);
  });
  const meta = SECTIONS[id];
  $('section-title').textContent = meta.title;
  $('section-subtitle').textContent = meta.subtitle;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goToSection = goToSection;

/* =====================================================
   FORMULA PANEL
   ===================================================== */
function openFormulas() {
  $('formula-panel').classList.add('open');
  $('formula-overlay').classList.add('active');
}

function closeFormulas() {
  $('formula-panel').classList.remove('open');
  $('formula-overlay').classList.remove('active');
}

/* =====================================================
   ACUMULACIÓN CALCULATIONS
   =====================================================
   Fórmulas:
     Intereses_n     = Saldo_inicial_n × Tasa
     Saldo_final_n   = Saldo_inicial_n + Aportación + Intereses_n
     Saldo_inicial_{n+1} = Saldo_final_n
     Aport_acumulada_n   = n × Aportación   (sin monto inicial)
   ===================================================== */
function calcAcumulacion() {
  const montoInicial  = numVal('acum-monto-inicial');
  const aportAnual    = numVal('acum-aportacion-anual');
  const tasa          = numVal('acum-tasa') / 100;
  const anios         = Math.max(1, Math.min(60, Math.round(numVal('acum-anios'))));

  const rows = [];
  let saldoInicial = montoInicial;
  let aportAcum = 0;
  let totalIntereses = 0;

  for (let yr = 1; yr <= anios; yr++) {
    const intereses  = saldoInicial * tasa;
    const saldoFinal = saldoInicial + aportAnual + intereses;
    aportAcum += aportAnual;
    totalIntereses += intereses;
    rows.push({
      anio:        yr,
      saldoInicial,
      aportAnual,
      intereses,
      saldoFinal,
      aportAcum,
    });
    saldoInicial = saldoFinal;
  }

  return {
    rows,
    totalAportado:  montoInicial + rows.length * aportAnual,
    totalIntereses,
    saldoFinal:     rows[rows.length - 1].saldoFinal,
    multiplicador:  rows[rows.length - 1].saldoFinal / (montoInicial || 1),
  };
}

function renderAcumulacion() {
  const result = calcAcumulacion();
  const { rows } = result;

  // Summary KPIs
  $('acum-saldo-final-summary').textContent = fmt(result.saldoFinal);
  $('acum-total-aportado').textContent      = fmt(result.totalAportado);
  $('acum-ganancias-interes').textContent   = fmt(result.totalIntereses);
  $('acum-multiplicador').textContent       = fmtX(result.multiplicador);

  // Table
  const tbody = $('tbody-acumulacion');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>Año ${r.anio}</td>
      <td>${fmt(r.saldoInicial)}</td>
      <td>${fmt(r.aportAnual)}</td>
      <td class="cell-positive">${fmt(r.intereses)}</td>
      <td><strong>${fmt(r.saldoFinal)}</strong></td>
      <td>${fmt(r.aportAcum)}</td>
    </tr>
  `).join('');

  // Chart
  const labels        = rows.map(r => 'Año ' + r.anio);
  const saldoFinal    = rows.map(r => Math.round(r.saldoFinal));
  const aportAcum     = rows.map(r => Math.round(r.aportAcum));
  const interesAcum   = rows.map((_, i) => Math.round(rows.slice(0, i + 1).reduce((s, x) => s + x.intereses, 0)));
  renderChartAcumulacion(labels, saldoFinal, aportAcum, interesAcum);
}

/* =====================================================
   RETIROS CALCULATIONS
   =====================================================
   Fórmulas:
     Req_anual_USD   = (Req_mensual_EUR × 12) × TC
     Fondo_ELSAL_disp = Fondo_total − Fondo_ext
     Ingreso_ELSAL   = Fondo_ELSAL_disp × Tasa_ELSAL
     Ingreso_Ext     = Fondo_ext × Tasa_Ext
     Ingreso_Mixto   = Ingreso_ELSAL + Ingreso_Ext
     Tasa_pond       = (ELSAL×r_ELSAL + Ext×r_Ext) / Fondo_total
     Retiro_n        = Req_anual_USD × (1 + inflación)^(n-1)
   ===================================================== */
function calcRetiros() {
  const fondoTotal     = numVal('ret-fondo-total');
  const invertidoElsal = numVal('ret-invertido-elsal');
  const reqMensualEur  = numVal('ret-req-mensual-eur');
  const tasaCambio     = numVal('ret-tasa-cambio');
  const tasaElsal      = numVal('ret-tasa-elsal') / 100;
  const fondoExt       = numVal('ret-fondo-extranjero');
  const tasaExt        = numVal('ret-tasa-extranjero') / 100;
  const inflacion      = numVal('ret-inflacion') / 100;
  const anios          = Math.max(1, Math.min(60, Math.round(numVal('ret-anios'))));

  const reqAnualUSD    = reqMensualEur * 12 * tasaCambio;
  const fondoElsalDisp = fondoTotal - fondoExt;
  const faltaElsal     = Math.max(0, fondoElsalDisp - invertidoElsal);

  const ingresoElsal   = fondoTotal * tasaElsal;           // Solo ELSAL
  const ingresoExt     = fondoTotal * tasaExt;             // Solo extranjero
  const ingresoMixto   = (fondoElsalDisp * tasaElsal) + (fondoExt * tasaExt); // Mixto

  const tasaPond       = fondoTotal > 0
    ? (fondoElsalDisp * tasaElsal + fondoExt * tasaExt) / fondoTotal
    : 0;

  // Tabla por año
  let fondoInv = fondoTotal;
  const rows = [];
  for (let yr = 1; yr <= anios; yr++) {
    const retiro      = reqAnualUSD * Math.pow(1 + inflacion, yr - 1);
    const incremento  = yr === 1 ? 0 : retiro - reqAnualUSD * Math.pow(1 + inflacion, yr - 2);
    const montoInv    = fondoTotal + (yr - 1) * reqAnualUSD * inflacion;
    rows.push({ anio: yr, retiro, tasaPond, montoInv, incremento });
  }

  return {
    reqAnualUSD, fondoElsalDisp, faltaElsal,
    ingresoElsal, ingresoExt, ingresoMixto,
    tasaPond, inflacion,
    rows,
    // For saldo calc
    tasaElsal, tasaExt, fondoExt,
  };
}

function renderRetiros() {
  const r = calcRetiros();

  // Scenario cards
  $('ret-ingreso-elsal').textContent = fmt(r.ingresoElsal);
  styleSignDiff('ret-diff-elsal',  r.ingresoElsal - r.reqAnualUSD);
  $('ret-ingreso-ext').textContent   = fmt(r.ingresoExt);
  styleSignDiff('ret-diff-ext',    r.ingresoExt - r.reqAnualUSD);
  $('ret-ingreso-mixto').textContent = fmt(r.ingresoMixto);
  styleSignDiff('ret-diff-mixto',  r.ingresoMixto - r.reqAnualUSD);

  // Metrics
  $('ret-req-anual-usd').textContent     = fmt(r.reqAnualUSD);
  $('ret-tasa-ponderada').textContent    = fmtPct(r.tasaPond);
  $('ret-fondo-disp-elsal').textContent  = fmt(r.fondoElsalDisp);

  // Table
  const tbody = $('tbody-retiros');
  tbody.innerHTML = r.rows.map(row => `
    <tr>
      <td>Año ${row.anio}</td>
      <td>${fmt(row.retiro)}</td>
      <td class="cell-positive">+${fmt(row.incremento)}</td>
      <td>${fmtPct(row.tasaPond)}</td>
      <td>${fmt(row.montoInv)}</td>
      <td></td>
    </tr>
  `).join('');

  // Chart — compare scenarios (just first year as bar)
  const fondoTotal = numVal('ret-fondo-total');
  renderChartRetiros(
    ['Escenario Actual'],
    [r.reqAnualUSD],
    [r.ingresoElsal],
    [r.ingresoExt],
    [r.ingresoMixto],
  );

  // Trigger saldo render since params changed
  renderSaldo();
}

function styleSignDiff(elId, diff) {
  const el = $(elId);
  el.textContent = (diff >= 0 ? '+' : '') + fmt(diff);
  el.className = diff >= 0 ? 'cell-positive' : 'cell-negative';
}

/* =====================================================
   SALDO DEL FONDO CALCULATIONS
   =====================================================
   Fórmulas:
     Intereses_n       = Saldo_inicial_n × Tasa_ponderada
     Saldo_final_n     = Saldo_inicial_n + Intereses_n − Retiro_n
     Saldo_inicial_{n+1} = Saldo_final_n
     Poder_adquis_n    = Saldo_final_n / (1+π)^n
     Cobertura_n       = Saldo_final_n / Retiro_n
     Delta_n           = Intereses_n − Retiro_n
   ===================================================== */
function calcSaldo() {
  const retResult   = calcRetiros();
  const { tasaPond, inflacion, reqAnualUSD } = retResult;
  const fondoTotal  = numVal('ret-fondo-total');
  const anios       = Math.max(1, Math.min(60, Math.round(numVal('saldo-anios'))));

  let saldoInicial = fondoTotal;
  const rows = [];

  for (let yr = 1; yr <= anios; yr++) {
    const intereses  = saldoInicial * tasaPond;
    const retiro     = reqAnualUSD * Math.pow(1 + inflacion, yr - 1);
    const saldoFinal = saldoInicial + intereses - retiro;
    const poderAdq   = saldoFinal / Math.pow(1 + inflacion, yr);
    const delta      = intereses - retiro;
    const cobertura  = retiro > 0 ? saldoFinal / retiro : 0;

    rows.push({ anio: yr, saldoInicial, intereses, retiro, saldoFinal, poderAdq, delta, cobertura });
    saldoInicial = saldoFinal;
  }

  return {
    rows,
    tasaPond,
    inflacion,
    fondoTotal,
    retiro1: reqAnualUSD,
  };
}

function renderSaldo() {
  const result = calcSaldo();
  const { rows, tasaPond, inflacion, fondoTotal, retiro1 } = result;

  // Param summary
  $('saldo-param-inicial').textContent   = fmt(fondoTotal);
  $('saldo-param-tasa').textContent      = fmtPct(tasaPond);
  $('saldo-param-retiro1').textContent   = fmt(retiro1);
  $('saldo-param-inflacion').textContent = fmtPct(inflacion);

  // KPIs
  const superavit = rows.filter(r => r.delta >= 0).length;
  const agotIdx   = rows.findIndex(r => r.saldoFinal <= 0);
  const maxSaldo  = Math.max(...rows.map(r => r.saldoFinal));
  const maxAnio   = rows.findIndex(r => r.saldoFinal === maxSaldo) + 1;

  $('kpi-anios-superavit').textContent  = superavit + ' año' + (superavit !== 1 ? 's' : '');
  $('kpi-anio-agotamiento').textContent = agotIdx >= 0 ? 'Año ' + (agotIdx + 1) : 'No se agota';
  $('kpi-saldo-maximo').textContent     = fmt(maxSaldo);
  $('kpi-anio-maximo').textContent      = 'Año ' + maxAnio;

  // Table
  const tbody = $('tbody-saldo');
  tbody.innerHTML = rows.map(r => {
    const rowClass = r.saldoFinal < 0 ? 'row-depleted row-negative'
                   : r.delta < 0      ? 'row-negative'
                   : r.delta === 0    ? 'row-zero'
                   : 'row-positive';
    const deltaClass = r.delta >= 0 ? 'cell-positive' : 'cell-negative';
    const cobClass   = r.cobertura >= 1 ? 'cell-positive' : 'cell-negative';
    return `
    <tr class="${rowClass}">
      <td>Año ${r.anio}</td>
      <td>${fmt(r.saldoInicial)}</td>
      <td class="cell-positive">${fmt(r.intereses)}</td>
      <td>${fmt(r.retiro)}</td>
      <td><strong>${fmt(r.saldoFinal)}</strong></td>
      <td>${fmt(r.poderAdq)}</td>
      <td class="${deltaClass}">${r.delta >= 0 ? '+' : ''}${fmt(r.delta)}</td>
      <td class="${cobClass}">${fmtYrs(r.cobertura)}</td>
    </tr>
  `}).join('');

  // Chart
  const labels  = rows.map(r => 'Año ' + r.anio);
  renderChartSaldo(
    labels,
    rows.map(r => Math.round(r.saldoFinal)),
    rows.map(r => Math.round(r.poderAdq)),
    rows.map(r => Math.round(r.delta)),
  );
}

/* =====================================================
   CSV EXPORT
   ===================================================== */
function downloadCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  let csv = [];
  table.querySelectorAll('tr').forEach(row => {
    const cells = [...row.querySelectorAll('th, td')].map(c =>
      '"' + c.textContent.trim().replace(/"/g, '""') + '"'
    );
    csv.push(cells.join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/* =====================================================
   SUPABASE MODALS
   ===================================================== */
function openModal(backdropId) { $(backdropId).classList.add('active'); }
function closeModal(backdropId) { $(backdropId).classList.remove('active'); }

function collectParams() {
  return {
    acum: {
      montoInicial: numVal('acum-monto-inicial'),
      aportAnual:   numVal('acum-aportacion-anual'),
      tasa:         numVal('acum-tasa'),
      anios:        numVal('acum-anios'),
    },
    ret: {
      fondoTotal:      numVal('ret-fondo-total'),
      invertidoElsal:  numVal('ret-invertido-elsal'),
      reqMensualEur:   numVal('ret-req-mensual-eur'),
      tasaCambio:      numVal('ret-tasa-cambio'),
      tasaElsal:       numVal('ret-tasa-elsal'),
      fondoExt:        numVal('ret-fondo-extranjero'),
      tasaExt:         numVal('ret-tasa-extranjero'),
      inflacion:       numVal('ret-inflacion'),
      anios:           numVal('ret-anios'),
    },
    saldo: {
      anios: numVal('saldo-anios'),
    },
  };
}

function applyParams(params) {
  if (!params) return;
  const a = params.acum || {};
  const r = params.ret || {};
  const s = params.saldo || {};
  if (a.montoInicial !== undefined) $('acum-monto-inicial').value = a.montoInicial;
  if (a.aportAnual   !== undefined) $('acum-aportacion-anual').value = a.aportAnual;
  if (a.tasa         !== undefined) $('acum-tasa').value = a.tasa;
  if (a.anios        !== undefined) $('acum-anios').value = a.anios;

  if (r.fondoTotal      !== undefined) $('ret-fondo-total').value          = r.fondoTotal;
  if (r.invertidoElsal  !== undefined) $('ret-invertido-elsal').value       = r.invertidoElsal;
  if (r.reqMensualEur   !== undefined) $('ret-req-mensual-eur').value        = r.reqMensualEur;
  if (r.tasaCambio      !== undefined) $('ret-tasa-cambio').value            = r.tasaCambio;
  if (r.tasaElsal       !== undefined) $('ret-tasa-elsal').value             = r.tasaElsal;
  if (r.fondoExt        !== undefined) $('ret-fondo-extranjero').value       = r.fondoExt;
  if (r.tasaExt         !== undefined) $('ret-tasa-extranjero').value        = r.tasaExt;
  if (r.inflacion       !== undefined) $('ret-inflacion').value              = r.inflacion;
  if (r.anios           !== undefined) $('ret-anios').value                  = r.anios;

  if (s.anios !== undefined) $('saldo-anios').value = s.anios;

  renderAll();
}

function renderAll() {
  renderAcumulacion();
  renderRetiros();
  renderSaldo();
}

/* =====================================================
   EVENT WIRING
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => goToSection(item.dataset.section));
  });

  // Formula panel
  $('btn-formulas').addEventListener('click', openFormulas);
  $('btn-close-formulas').addEventListener('click', closeFormulas);
  $('formula-overlay').addEventListener('click', closeFormulas);
  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'f') openFormulas();
    if (e.key === 'Escape') closeFormulas();
  });

  // ---- Acumulación listeners ----
  ['acum-monto-inicial', 'acum-aportacion-anual', 'acum-tasa', 'acum-anios'].forEach(id => {
    $(id).addEventListener('input', renderAcumulacion);
  });

  // ---- Retiros listeners ----
  [
    'ret-fondo-total', 'ret-invertido-elsal', 'ret-req-mensual-eur',
    'ret-tasa-cambio', 'ret-tasa-elsal', 'ret-fondo-extranjero',
    'ret-tasa-extranjero', 'ret-inflacion', 'ret-anios',
  ].forEach(id => {
    $(id).addEventListener('input', renderRetiros);
  });

  // ---- Saldo listener ----
  $('saldo-anios').addEventListener('input', renderSaldo);

  // CSV export
  $('btn-export-acum').addEventListener('click',  () => downloadCSV('table-acumulacion', 'acumulacion.csv'));
  $('btn-export-ret').addEventListener('click',   () => downloadCSV('table-retiros', 'retiros.csv'));
  $('btn-export-saldo').addEventListener('click', () => downloadCSV('table-saldo', 'saldo_fondo.csv'));

  // ---- Supabase Config Modal ----
  $('btn-supabase-config').addEventListener('click', () => {
    const stored = loadStoredSupabaseConfig();
    if (stored) {
      $('sb-url').value = stored.url;
      $('sb-key').value = stored.key;
    }
    openModal('supabase-modal-backdrop');
  });
  $('btn-close-supabase-modal').addEventListener('click', () => closeModal('supabase-modal-backdrop'));
  $('btn-cancel-supabase').addEventListener('click', () => closeModal('supabase-modal-backdrop'));
  $('supabase-modal-backdrop').addEventListener('click', e => {
    if (e.target === $('supabase-modal-backdrop')) closeModal('supabase-modal-backdrop');
  });
  $('btn-save-supabase-config').addEventListener('click', () => {
    const url = $('sb-url').value.trim();
    const key = $('sb-key').value.trim();
    if (!url || !key) { showToast('Ingresa URL y Key de Supabase', 'error'); return; }
    const ok = initSupabase(url, key);
    if (ok) {
      showToast('✅ Supabase configurado correctamente', 'success');
      closeModal('supabase-modal-backdrop');
    } else {
      showToast('Error al inicializar Supabase. Verifica las credenciales.', 'error');
    }
  });

  // ---- Save Scenario Modal ----
  $('btn-save-scenario').addEventListener('click', () => {
    if (!isSupabaseConfigured()) {
      showToast('⚙️ Primero configura Supabase', 'error');
      return;
    }
    openModal('save-modal-backdrop');
  });
  $('btn-close-save-modal').addEventListener('click',  () => closeModal('save-modal-backdrop'));
  $('btn-cancel-save').addEventListener('click',        () => closeModal('save-modal-backdrop'));
  $('btn-confirm-save').addEventListener('click', async () => {
    const name  = $('scenario-name').value.trim();
    const email = $('scenario-email').value.trim();
    if (!name)  { showToast('Ingresa un nombre para el escenario', 'error'); return; }
    if (!email) { showToast('Ingresa tu email', 'error'); return; }
    const params = collectParams();
    showToast('Guardando...', 'info');
    const { error } = await saveScenario(name, params, email);
    if (error) {
      showToast('Error: ' + error, 'error');
    } else {
      showToast('✅ Escenario guardado', 'success');
      closeModal('save-modal-backdrop');
    }
  });

  // ---- Load Scenario Modal ----
  $('btn-load-scenario').addEventListener('click', () => {
    if (!isSupabaseConfigured()) {
      showToast('⚙️ Primero configura Supabase', 'error');
      return;
    }
    openModal('load-modal-backdrop');
  });
  $('btn-close-load-modal').addEventListener('click', () => closeModal('load-modal-backdrop'));
  $('btn-cancel-load').addEventListener('click',       () => closeModal('load-modal-backdrop'));
  $('load-modal-backdrop').addEventListener('click', e => {
    if (e.target === $('load-modal-backdrop')) closeModal('load-modal-backdrop');
  });

  $('btn-search-scenarios').addEventListener('click', async () => {
    const email = $('load-email').value.trim();
    if (!email) { showToast('Ingresa tu email', 'error'); return; }
    const list  = $('scenarios-list');
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Buscando...</p>';
    const { data, error } = await loadScenarios(email);
    if (error) {
      list.innerHTML = `<p style="color:var(--red);font-size:13px">Error: ${error}</p>`;
      return;
    }
    if (!data.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No se encontraron escenarios para este email.</p>';
      return;
    }
    list.innerHTML = data.map(s => {
      const date = new Date(s.updated_at).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' });
      return `
        <div class="scenario-item" data-id="${s.id}">
          <div class="scenario-item-info">
            <div class="scenario-item-name">📁 ${s.name}</div>
            <div class="scenario-item-date">${date}</div>
          </div>
          <div class="scenario-item-actions">
            <button class="btn btn-primary btn-sm btn-load-item" data-id="${s.id}">Cargar</button>
            <button class="btn btn-danger btn-sm btn-delete-item" data-id="${s.id}">🗑</button>
          </div>
        </div>
      `;
    }).join('');

    // Wire load buttons
    list.querySelectorAll('.btn-load-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const sc = data.find(s => s.id === btn.dataset.id);
        if (sc) {
          applyParams(sc.params);
          closeModal('load-modal-backdrop');
          showToast('✅ Escenario "' + sc.name + '" cargado', 'success');
        }
      });
    });

    // Wire delete buttons
    list.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este escenario?')) return;
        const { error } = await deleteScenario(btn.dataset.id);
        if (error) { showToast('Error al eliminar', 'error'); return; }
        btn.closest('.scenario-item').remove();
        showToast('Escenario eliminado', 'info');
      });
    });
  });

  // ---- Initial render ----
  loadStoredSupabaseConfig();
  renderAll();
});
