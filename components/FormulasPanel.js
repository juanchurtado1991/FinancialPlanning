'use client';

export default function FormulasPanel({ open, onClose }) {
  return (
    <>
      <div className={`overlay${open ? ' active' : ''}`} onClick={onClose} />
      <aside className={`formula-panel${open ? ' open' : ''}`}>
        <div className="formula-panel-header">
          <h2>🧮 Fórmulas Utilizadas</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="formula-panel-body">

          <div className="formula-section">
            <h3>📈 Acumulación</h3>
            <FormulaCard
              title="Intereses Ganados"
              expr={<>I<sub>n</sub> = S<sub>inicial</sub> × r</>}
              desc="El interés se calcula sobre el saldo al inicio del período, antes de sumar la aportación del año."
            />
            <FormulaCard
              title="Saldo Final del Año"
              expr={<>S<sub>final</sub> = S<sub>inicial</sub> + Aportación + I<sub>n</sub></>}
              desc="El saldo al final es la suma del saldo inicial, la aportación anual y los intereses generados."
            />
            <FormulaCard
              title="Aportación Acumulada"
              expr={<>A<sub>acum</sub> = Σ Aportación<sub>i</sub> (i = 1..n)</>}
              desc="Suma total de dinero aportado desde el año 1 hasta el año n, excluyendo el monto inicial."
            />
          </div>

          <div className="formula-section">
            <h3>💸 Retiros</h3>
            <FormulaCard
              title="Requerimiento Anual (USD)"
              expr={<>R<sub>anual</sub> = Req<sub>mensual</sub> × 12</>}
              desc="El requerimiento mensual en dólares multiplicado por 12 da el total anual que necesitas retirar del fondo."
            />
            <FormulaCard
              title="Retiro con Inflación (año n)"
              expr={<>R<sub>n</sub> = R<sub>1</sub> × (1 + π)<sup>n-1</sup></>}
              desc="El retiro crece cada año según la tasa de inflación π, compuesto año a año."
            />
            <FormulaCard
              title="Ingreso Anual del Fondo"
              expr="Ingreso = Fondo × Tasa de Rendimiento"
              desc="El ingreso que genera el fondo con su tasa de rendimiento anual. Si el ingreso supera el requerimiento, el fondo crece; si no, consume capital."
            />
          </div>

          <div className="formula-section">
            <h3>📊 Saldo del Fondo</h3>
            <FormulaCard
              title="Ganancia del Período"
              expr={<>I<sub>n</sub> = S<sub>inicial,n</sub> × r</>}
              desc="La ganancia se calcula sobre el saldo inicial del año, usando la tasa de rendimiento esperada."
            />
            <FormulaCard
              title="Capital al Final"
              expr={<>S<sub>final,n</sub> = S<sub>inicial,n</sub> + I<sub>n</sub> − R<sub>n</sub></>}
              desc="Al saldo inicial se le suman los intereses y se restan los retiros del período."
            />
            <FormulaCard
              title="Valor Real (sin inflación)"
              expr={<>VR<sub>n</sub> = S<sub>final,n</sub> / (1 + π)<sup>n</sup></>}
              desc="El saldo deflactado a valor presente para reflejar el poder adquisitivo real libre de inflación."
            />
            <FormulaCard
              title="Años de Respaldo"
              expr={<>AR<sub>n</sub> = S<sub>final,n</sub> / R<sub>n</sub></>}
              desc="Cuántos años de retiros teóricamente quedan cubiertos con el saldo actual del fondo."
            />
            <FormulaCard
              title="Balance Anual"
              expr={<>BA<sub>n</sub> = I<sub>n</sub> − R<sub>n</sub></>}
              desc="Si es positivo, el fondo genera más de lo que sacas. Si es negativo, estás consumiendo tu capital original."
            />
          </div>

        </div>
      </aside>
    </>
  );
}

function FormulaCard({ title, expr, desc }) {
  return (
    <div className="formula-card">
      <div className="formula-title">{title}</div>
      <div className="formula-expr">{expr}</div>
      <div className="formula-desc">{desc}</div>
    </div>
  );
}
