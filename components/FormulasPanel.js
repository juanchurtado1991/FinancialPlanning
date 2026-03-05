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
              expr={<>R<sub>USD</sub> = (Req<sub>mensual</sub> × 12) × TC</>}
              desc="El requerimiento en euros × 12 meses, convertido a dólares con la tasa de cambio."
            />
            <FormulaCard
              title="Retiro con Inflación (año n)"
              expr={<>R<sub>n</sub> = R<sub>1</sub> × (1 + π)<sup>n-1</sup></>}
              desc="El retiro crece cada año según la tasa de inflación π, compuesto año a año."
            />
            <FormulaCard
              title="Tasa Ponderada Mixta"
              expr={<>r<sub>pond</sub> = (ELSAL × r<sub>ELSAL</sub> + Ext × r<sub>Ext</sub>) / Fondo</>}
              desc="Media ponderada de las tasas según el peso relativo de cada inversión en el fondo total."
            />
            <FormulaCard
              title="Ingreso Anual (por escenario)"
              expr="Ingreso = Fondo × Tasa"
              desc="El ingreso que generaría el fondo si todo estuviera en ELSAL, en el extranjero, o mixto."
            />
          </div>

          <div className="formula-section">
            <h3>📊 Saldo del Fondo</h3>
            <FormulaCard
              title="Intereses del Período"
              expr={<>I<sub>n</sub> = S<sub>inicial,n</sub> × r<sub>pond</sub></>}
              desc="Los intereses se calculan sobre el saldo inicial del año, usando la tasa ponderada mixta."
            />
            <FormulaCard
              title="Saldo Final"
              expr={<>S<sub>final,n</sub> = S<sub>inicial,n</sub> + I<sub>n</sub> − R<sub>n</sub></>}
              desc="Al saldo inicial se le suman los intereses y se restan los retiros del período."
            />
            <FormulaCard
              title="Poder Adquisitivo"
              expr={<>PA<sub>n</sub> = S<sub>final,n</sub> / (1 + π)<sup>n</sup></>}
              desc="El saldo deflactado a valor presente para reflejar el poder adquisitivo real."
            />
            <FormulaCard
              title="Cobertura en Años"
              expr={<>C<sub>n</sub> = S<sub>final,n</sub> / R<sub>n</sub></>}
              desc="Cuántos años de retiro quedan cubiertos con el saldo actual del fondo."
            />
            <FormulaCard
              title="Ingresos − Retiros"
              expr={<>Δ<sub>n</sub> = I<sub>n</sub> − R<sub>n</sub></>}
              desc="Si es positivo, el fondo genera más de lo que se retira. Si es negativo, se consume capital."
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
