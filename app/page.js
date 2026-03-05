'use client';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import FormulasPanel from '@/components/FormulasPanel';
import TutorialPanel from '@/components/TutorialPanel';
import { SaveModal, LoadModal } from '@/components/ScenarioModals';
import Acumulacion from '@/components/Acumulacion';
import Retiros from '@/components/Retiros';
import SaldoFondo from '@/components/SaldoFondo';

const LS_KEY = 'finsim_params';

const DEFAULTS = {
  acum:  { montoInicial: 10000, aportAnual: 5000, tasa: 4, anios: 40 },
  ret:   { fondoTotal: 220000, invertidoElsal: 100000, reqMensualEur: 800,
           tasaCambio: 1.2, tasaElsal: 8, fondoExt: 60000,
           tasaExt: 4, inflacion: 3, anios: 40 },
  saldo: { anios: 40 },
};

function loadFromLS() {
  if (typeof window === 'undefined') return null; // SSR guard
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      acum:  { ...DEFAULTS.acum,  ...parsed.acum },
      ret:   { ...DEFAULTS.ret,   ...parsed.ret },
      saldo: { ...DEFAULTS.saldo, ...parsed.saldo },
    };
  } catch { return null; }
}

function saveToLS(params) {
  if (typeof window === 'undefined') return; // SSR guard
  try { localStorage.setItem(LS_KEY, JSON.stringify(params)); } catch {}
}

const SECTION_META = {
  intro:       { title: 'Introducción',     subtitle: 'Guía del simulador financiero' },
  acumulacion: { title: 'Acumulación',      subtitle: 'Simulación de crecimiento del fondo' },
  retiros:     { title: 'Retiros',          subtitle: 'Análisis de ingresos y requerimientos' },
  saldo:       { title: 'Saldo del Fondo',  subtitle: 'Evolución durante la fase de retiro' },
};

export default function HomePage() {
  const [section,        setSection]        = useState('intro');
  const [formulasOpen,   setFormulasOpen]   = useState(false);
  const [tutorialOpen,   setTutorialOpen]   = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [saveOpen,       setSaveOpen]       = useState(false);
  const [loadOpen,       setLoadOpen]       = useState(false);
  const [toast,          setToast]          = useState({ msg: '', type: '', visible: false });
  const [loadedParams,   setLoadedParams]   = useState(null);
  const [autoSaved,      setAutoSaved]      = useState(false); // shows ✓ indicator
  const [resetKey,       setResetKey]       = useState(0); // forces 100% component remount

  // Retiros calc result shared with SaldoFondo
  const [retCalc,        setRetCalc]        = useState(null);
  const [retParams,      setRetParams]      = useState({ fondoTotal: 220000 });
  // Acumulacion result — saldoFinal flows into Retiros fondoTotal
  const [acumSaldoFinal, setAcumSaldoFinal] = useState(null);

  // Master params ref — always start with DEFAULTS (SSR safe), LS restore happens in useEffect
  const allParams = useRef({ ...DEFAULTS });

  // On mount: restore from localStorage and inject into sections
  useEffect(() => {
    const saved = loadFromLS();
    if (saved) {
      allParams.current = saved;
      setLoadedParams(saved); // triggers section components to sync
      if (saved.ret) setRetParams(saved.ret);
    }
  }, []);

  // Debounce ref for localStorage writes
  const lsTimer = useRef(null);

  function handleParamsChange(sec, params) {
    allParams.current[sec] = params;
    if (sec === 'ret') setRetParams(params);
    // Debounced auto-save to localStorage (300ms)
    clearTimeout(lsTimer.current);
    lsTimer.current = setTimeout(() => {
      saveToLS(allParams.current);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1800); // hide indicator after 1.8s
    }, 300);
  }

  function showToast(msg, type = 'info') {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3200);
  }

  // Keyboard shortcut for formulas
  useEffect(() => {
    function onKey(e) {
      if (e.altKey && e.code === 'KeyF') setFormulasOpen(o => !o);
      if (e.altKey && e.code === 'KeyT') setTutorialOpen(o => !o);
      if (e.key === 'Escape') { setFormulasOpen(false); setTutorialOpen(false); setSidebarOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const meta = SECTION_META[section];

  return (
    <>
      <div className="app-shell">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <Sidebar
          activeSection={section}
          onNavigate={setSection}
          onSave={() => setSaveOpen(true)}
          onLoad={() => setLoadOpen(true)}
          onClose={() => setSidebarOpen(false)}
          onClearLocal={() => {
            try { localStorage.removeItem(LS_KEY); } catch {}
            allParams.current = { ...DEFAULTS };
            setLoadedParams(null);
            setAcumSaldoFinal(null);
            setRetCalc(null);
            setRetParams({ fondoTotal: 220000 });
            setResetKey(k => k + 1); // hard reset all components
            showToast('Datos locales borrados', 'info');
          }}
          className={sidebarOpen ? 'mobile-open' : ''}
        />

        {/* Main */}
        <main className="main-content">
          {/* Header */}
          <header className="page-header">
            <div className="header-left">
              <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menú">☰</button>
              <div>
                <div className="page-title">{meta.title}</div>
                <div className="page-subtitle">{meta.subtitle}</div>
              </div>
            </div>
            <div className="header-right">
              {autoSaved && (
                <span className="autosave-badge">✓ guardado</span>
              )}
              <button className="btn btn-ghost btn-sm header-btn" onClick={() => setTutorialOpen(true)}>
                <span>📚</span><span className="btn-label"> Tutorial</span>
              </button>
              <button className="btn btn-ghost btn-sm header-btn" onClick={() => setFormulasOpen(true)}>
                <span>🧮</span><span className="btn-label"> Fórmulas</span>
              </button>
              <span className="kbd-hint">Alt+F / Alt+T</span>
            </div>
          </header>

          {/* Sections */}
          {section === 'intro' && (
            <IntroSection 
              onNavigate={setSection} 
              onOpenTutorial={() => setTutorialOpen(true)} 
            />
          )}
          {section === 'acumulacion' && (
            <Acumulacion
              key={`acum-${resetKey}`}
              params={loadedParams?.acum}
              onParamsChange={handleParamsChange}
              onCalcReady={(r) => setAcumSaldoFinal(r.saldoFinal)}
            />
          )}
          {section === 'retiros' && (
            <Retiros
              key={`ret-${resetKey}`}
              params={loadedParams?.ret}
              onParamsChange={handleParamsChange}
              onCalcReady={setRetCalc}
              acumSaldoFinal={acumSaldoFinal}
            />
          )}
          {section === 'saldo' && (
            <SaldoFondo
              key={`saldo-${resetKey}`}
              retCalc={retCalc}
              retParams={retParams}
              params={loadedParams}
              onParamsChange={handleParamsChange}
            />
          )}
        </main>
      </div>

      {/* Formulas panel */}
      <FormulasPanel open={formulasOpen} onClose={() => setFormulasOpen(false)} />

      {/* Tutorial panel */}
      <TutorialPanel open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* Modals */}
      <SaveModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        getParams={() => allParams.current}
        showToast={showToast}
      />
      <LoadModal
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoad={(params) => { setLoadedParams(params); setSection('acumulacion'); }}
        showToast={showToast}
      />

      {/* Toast */}
      <div className={`toast${toast.visible ? ' visible' : ''} ${toast.type}`}>
        {toast.msg}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        Desarrollado con ❤️ por{' '}
        <a
          href="https://www.linkedin.com/in/juan-carlos-hurtado-giammattei-b06674b7/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Juan Hurtado
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        </a>
      </footer>
    </>
  );
}

// ─── Intro Section ────────────────────────────────────────────────────────────
function IntroSection({ onNavigate, onOpenTutorial }) {
  return (
    <div className="content-section">
      <div className="intro-hero glass-card">
        <div className="intro-icon">📊</div>
        <h2>Simulador de Fondo de Acumulación y Retiro</h2>
        <p>
          Esta herramienta te permite planificar financieramente el crecimiento y sostenibilidad de
          tu fondo de inversión, simulando escenarios de acumulación y retiro con parámetros personalizados.
        </p>
      </div>

      <div className="intro-cards">
        {[
          { id:'acumulacion', icon:'📈', title:'Acumulación',
            desc:'Simula el crecimiento del fondo con aportaciones anuales e interés compuesto.',
            formula:'S_final = S_inicial + Aportación + (S_inicial × r)' },
          { id:'retiros', icon:'💸', title:'Retiros',
            desc:'Analiza ingresos vs retiros considerando inflación, tasas de cambio y múltiples fuentes.',
            formula:'R_n = R₁ × (1 + π)^(n-1)' },
          { id:'saldo', icon:'📊', title:'Saldo del Fondo',
            desc:'Visualiza la evolución del fondo año a año y anticipa cuándo se agota.',
            formula:'S_final = S_inicial + Intereses − Retiros' },
        ].map(m => (
          <div key={m.id} className="intro-module glass-card">
            <div className="module-icon">{m.icon}</div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
            <div className="module-formula"><code>{m.formula}</code></div>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate(m.id)}>
              Ir a {m.title} →
            </button>
          </div>
        ))}
      </div>

      <div className="intro-tips glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>💡 ¿Primera vez aquí?</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Abre la guía rápida para aprender a usar el simulador paso a paso y entender todas sus funcionalidades.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onOpenTutorial} style={{ whiteSpace: 'nowrap' }}>
          📚 Ver Tutorial
        </button>
      </div>
    </div>
  );
}
