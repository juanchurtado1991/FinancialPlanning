'use client';
import { useState } from 'react';
import { saveScenario, loadScenarios, deleteScenario, isConfigured } from '@/lib/supabase';

// ─── Save Modal ───────────────────────────────────────────────────────────────
export function SaveModal({ open, onClose, getParams, showToast }) {
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [busy,  setBusy]  = useState(false);

  async function handleSave() {
    if (!isConfigured()) return showToast('Configura Supabase primero', 'error');
    if (!name.trim())  return showToast('Ingresa un nombre para el escenario', 'error');
    if (!email.trim()) return showToast('Ingresa tu email', 'error');
    setBusy(true);
    const { error } = await saveScenario(name.trim(), getParams(), email.trim());
    setBusy(false);
    if (error) { showToast('Error: ' + error, 'error'); return; }
    showToast('✅ Escenario guardado', 'success');
    setName(''); setEmail('');
    onClose();
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop active">
      <div className="modal glass-card">
        <div className="modal-header">
          <h3>💾 Guardar Escenario</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!isConfigured() && (
            <p style={{ color: 'var(--red)', fontSize: 13 }}>
              ⚠️ Supabase no está configurado. Agrega las variables en <code>.env.local</code>.
            </p>
          )}
          <div className="modal-field">
            <label>Nombre del Escenario</label>
            <div className="input-wrapper">
              <input className="param-input" value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Ej: Escenario Conservador 2026" />
            </div>
          </div>
          <div className="modal-field">
            <label>Tu Email</label>
            <div className="input-wrapper">
              <input type="email" className="param-input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={busy || !isConfigured()}>
            {busy ? 'Guardando...' : 'Guardar en la Nube'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Load Modal ───────────────────────────────────────────────────────────────
export function LoadModal({ open, onClose, onLoad, showToast }) {
  const [email,     setEmail]     = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [busy,      setBusy]      = useState(false);
  const [searched,  setSearched]  = useState(false);

  async function handleSearch() {
    if (!email.trim()) return showToast('Ingresa tu email', 'error');
    setBusy(true);
    const { data, error } = await loadScenarios(email.trim());
    setBusy(false);
    setSearched(true);
    if (error) { showToast('Error: ' + error, 'error'); return; }
    setScenarios(data);
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este escenario?')) return;
    const { error } = await deleteScenario(id);
    if (error) { showToast('Error al eliminar', 'error'); return; }
    setScenarios(s => s.filter(x => x.id !== id));
    showToast('Escenario eliminado', 'info');
  }

  function handleClose() {
    setEmail(''); setScenarios([]); setSearched(false);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop active">
      <div className="modal glass-card">
        <div className="modal-header">
          <h3>📂 Cargar Escenario</h3>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Tu Email</label>
            <div className="input-row">
              <div className="input-wrapper" style={{ flex: 1 }}>
                <input type="email" className="param-input" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="tu@email.com" />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={busy}>
                {busy ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
          <div className="scenarios-list">
            {searched && scenarios.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron escenarios.</p>
            )}
            {scenarios.map(s => (
              <div key={s.id} className="scenario-item">
                <div className="scenario-item-info">
                  <div className="scenario-item-name">📁 {s.name}</div>
                  <div className="scenario-item-date">
                    {new Date(s.updated_at).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' })}
                  </div>
                </div>
                <div className="scenario-item-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => { onLoad(s.params); onClose(); showToast(`✅ "${s.name}" cargado`, 'success'); }}>
                    Cargar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
