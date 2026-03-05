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
  ret:   { fondoTotal: 220000, reqMensualUSD: 1000,
           tasaRendimiento: 6, inflacion: 3, anios: 40 },
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
              params={allParams.current.acum}
              onParamsChange={handleParamsChange}
              onCalcReady={(r) => setAcumSaldoFinal(r.saldoFinal)}
            />
          )}
          {section === 'retiros' && (
            <Retiros
              key={`ret-${resetKey}`}
              params={allParams.current.ret}
              onParamsChange={handleParamsChange}
              onCalcReady={setRetCalc}
              acumSaldoFinal={acumSaldoFinal}
            />
          )}
          {section === 'saldo' && (
            <SaldoFondo
              key={`saldo-${resetKey}`}
              acumParams={allParams.current.acum}
              retParams={allParams.current.ret}
              saldoParams={allParams.current.saldo}
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

function IntroSection({ onNavigate, onOpenTutorial }) {
  return (
    <div className="content-section" style={{ gap: '28px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Hero Banner */}
      <div className="intro-hero glass-card" style={{ padding: 'clamp(30px, 5vw, 56px) 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background glow */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(91,141,238,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        
        <div className="intro-icon" style={{ fontSize: 'clamp(40px, 8vw, 56px)', marginBottom: '16px' }}>🔮</div>
        <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>
          Domina tu Futuro Financiero
        </h2>
        <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Este simulador te permite visualizar matemáticamente cómo crecerá tu patrimonio en la fase de <strong>Acumulación</strong> y cuánto tiempo te sostendrá en la fase de <strong>Retiros</strong>.
        </p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('acumulacion')} style={{ padding: '12px 24px', fontSize: '15px' }}>
            🚀 Iniciar Simulación
          </button>
          <button className="btn btn-ghost" onClick={onOpenTutorial} style={{ padding: '12px 24px', fontSize: '15px' }}>
            📚 Ver Guía Rápida
          </button>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="intro-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {[
          { id:'acumulacion', icon:'📈', title:'Paso 1: Acumulación',
            desc:'Proyecta el crecimiento de tus inversiones gracias al poder del interés compuesto y tus aportaciones anuales.',
            action: 'Calcular Crecimiento' },
          { id:'retiros', icon:'💸', title:'Paso 2: Retiros',
            desc:'Define el estilo de vida que deseas. Ajusta la inflación y descubre si tus rendimientos logran cubrir tus gastos.',
            action: 'Analizar Gastos' },
          { id:'saldo', icon:'📊', title:'Paso 3: Saldo del Fondo',
            desc:'Visualiza el horizonte de vida de tu dinero. Comprueba matemáticamente el año exacto en que tu cuenta podría llegar a cero.',
            action: 'Ver Pronóstico' },
        ].map(m => (
          <div key={m.id} className="intro-module glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
            <div className="module-icon" style={{ marginBottom: '12px' }}>{m.icon}</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{m.title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1, marginBottom: '20px' }}>{m.desc}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(m.id)} style={{ alignSelf: 'flex-start', border: '1px solid var(--accent-dim)', color: 'var(--accent-light)' }}>
              {m.action} →
            </button>
          </div>
        ))}
      </div>

      {/* Pro Tips Footer */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.15)' }}>
        <div style={{ fontSize: '28px' }}>💡</div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>Todo está conectado en tiempo real</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Los datos que ingreses en <strong>Acumulación</strong> viajan automáticamente a <strong>Saldo del Fondo</strong>. Además, todos tus datos se guardan por defecto en este dispositivo de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
}
