'use client';
import { isConfigured } from '@/lib/supabase';

const NAV_ITEMS = [
  { id: 'intro',      icon: '📖', label: 'Introducción' },
  { id: 'acumulacion',icon: '📈', label: 'Acumulación' },
  { id: 'retiros',    icon: '💸', label: 'Retiros' },
  { id: 'saldo',      icon: '📊', label: 'Saldo del Fondo' },
];

export default function Sidebar({ activeSection, onNavigate, onSave, onLoad, onClose, onClearLocal, className = '' }) {
  return (
    <nav className={`sidebar${className ? ' ' + className : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">💰</div>
        <div>
          <div className="brand-title">FinSim</div>
          <div className="brand-sub">Simulador Financiero</div>
        </div>
      </div>

      <ul className="nav-menu">
        {NAV_ITEMS.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => { onNavigate(item.id); onClose?.(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-sm" onClick={onSave}>
          💾 Guardar en la Nube
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onLoad}>
          📂 Cargar Escenario
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, opacity: 0.6 }}
          onClick={() => {
            if (confirm('¿Borrar datos guardados localmente y resetear valores?')) onClearLocal?.();
          }}>
          🔄 Resetear valores
        </button>
        {!isConfigured() && (
          <p style={{ fontSize: 11, color: 'var(--red)', padding: '6px 4px', lineHeight: 1.4 }}>
            ⚠️ Supabase no configurado — revisa <code>.env.local</code>
          </p>
        )}
      </div>
    </nav>
  );
}
