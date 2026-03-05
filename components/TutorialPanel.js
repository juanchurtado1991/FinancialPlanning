'use client';

export default function TutorialPanel({ open, onClose }) {
  return (
    <>
      <div className={`overlay${open ? ' active' : ''}`} onClick={onClose} />
      <aside className={`formula-panel${open ? ' open' : ''}`}>
        <div className="formula-panel-header">
          <h2>📚 Tutorial</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="formula-panel-body">

          {/* Intro */}
          <div className="tutorial-intro">
            <p>
              Este simulador te ayuda a <strong>planificar tu fondo de inversión</strong>: cuánto crecerá
              mientras ahorras, cuánto puedes retirar cada mes, y por cuántos años te durará el dinero.
            </p>
          </div>

          {/* Step 1 */}
          <TutStep
            num="1" icon="📈" title="Acumulación — Haz crecer tu fondo"
            color="blue"
            steps={[
              'Ve a la sección "Acumulación" en el menú izquierdo.',
              'Ajusta el Monto Inicial: cuánto dinero tienes hoy para invertir.',
              'Ajusta la Aportación Anual: cuánto agregarás cada año.',
              'Cambia la Tasa de Interés según el rendimiento que esperas.',
              'El gráfico y la tabla se actualizan automáticamente.',
              'El Multiplicador te dice cuántas veces crecerá tu dinero.',
            ]}
            tip="Empieza con 30–40 años para ver el poder del interés compuesto."
          />

          {/* Step 2 */}
          <TutStep
            num="2" icon="💸" title="Retiros — Cuánto puedes retirar"
            color="green"
            steps={[
              'Ve a "Retiros". Aquí defines cuánto necesitas vivir cada mes.',
              'Ingresa tu Requerimiento Mensual en euros (o tu moneda).',
              'Ajusta la Tasa de Cambio si tus gastos son en otra moneda.',
              'Compara 3 escenarios: invertir todo en ELSAL, todo en el extranjero, o mixto.',
              'El escenario Mixto suele ser el más equilibrado.',
              'La tabla de inflación muestra cómo cambia lo que necesitas año a año.',
            ]}
            tip={'Si el "vs Requerimiento" aparece en rojo, el ingreso no cubre los gastos. Ajusta los parámetros.'}
          />

          {/* Step 3 */}
          <TutStep
            num="3" icon="📊" title="Saldo del Fondo — ¿Cuánto tiempo dura?"
            color="purple"
            steps={[
              'Ve a "Saldo del Fondo". Usa los resultados de Retiros automáticamente.',
              'Verás año a año cómo evoluciona tu fondo mientras retiras.',
              'Las filas en verde = el fondo genera más de lo que retiras (superávit).',
              'Las filas en rojo = se consume capital (déficit).',
              '"Año de agotamiento" indica cuándo se acabaría el dinero.',
              'Si el fondo se agota pronto, regresa a Retiros y baja los gastos.',
            ]}
            tip={'Idealmente quieres que el fondo nunca se agote ("No aplica" en agotamiento).'}
          />

          {/* Cloud */}
          <TutStep
            num="4" icon="☁️" title="Guardar y cargar escenarios"
            color="yellow"
            steps={[
              'Tus cambios se guardan automáticamente en este navegador (localStorage).',
              'Si recargas la página, tus valores se restauran solos.',
              'Para guardar en la nube: haz clic en "💾 Guardar en la Nube" en el sidebar.',
              'Ingresa un nombre y tu email — se guarda en Supabase.',
              'Para recuperar desde otro dispositivo: "📂 Cargar Escenario" y busca con tu email.',
              'Para resetear todo a los valores iniciales: "🔄 Resetear valores".',
            ]}
            tip="Guarda varios escenarios para comparar estrategias: conservador, moderado, agresivo."
          />

          {/* Tips */}
          <div className="tutorial-tips">
            <div className="tutorial-tips-title">💡 Tips rápidos</div>
            <ul>
              <li><kbd>Alt+F</kbd> abre el panel de Fórmulas</li>
              <li>Todos los campos azules son editables</li>
              <li>Los resultados se recalculan en tiempo real</li>
              <li>Usa ⬇️ CSV para exportar cualquier tabla a Excel</li>
              <li>En móvil, toca ☰ para abrir el menú</li>
            </ul>
          </div>

        </div>
      </aside>
    </>
  );
}

// ─── Tutorial Step ────────────────────────────────────────────────────────────
function TutStep({ num, icon, title, color, steps, tip }) {
  const colorMap = {
    blue:   { bg: 'rgba(91,141,238,0.08)',  border: 'rgba(91,141,238,0.2)',  num: '#5b8dee' },
    green:  { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  num: '#34d399' },
    purple: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', num: '#a78bfa' },
    yellow: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  num: '#fbbf24' },
  };
  const c = colorMap[color];

  return (
    <div className="tut-step" style={{ background: c.bg, borderColor: c.border }}>
      <div className="tut-step-header">
        <span className="tut-num" style={{ color: c.num, borderColor: c.border }}>
          {num}
        </span>
        <span className="tut-step-icon">{icon}</span>
        <span className="tut-step-title">{title}</span>
      </div>
      <ol className="tut-list">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      {tip && (
        <div className="tut-tip">
          <span>💡</span> {tip}
        </div>
      )}
    </div>
  );
}
