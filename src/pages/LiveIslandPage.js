import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, ProductTag } from '../components/UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency, calcGallons,
  calcShiftBalance, calcSalesByProduct,
} from '../utils/helpers';
import { ISLANDS_CONFIG } from '../utils/constants';

// ============================================
// PÁGINA: Vista en Vivo por Isla (Solo Admin)
// Muestra en tiempo real el turno activo de
// una isla seleccionada: contómetros, pagos,
// balones, gastos y cuadre al momento.
// Se actualiza automáticamente con cada cambio
// que el trabajador registra en su turno.
// ============================================

const LiveIslandPage = () => {
  const { shifts, prices } = useApp();
  const [selectedIsland, setSelectedIsland] = useState(ISLANDS_CONFIG[0].id.toString());

  const island = ISLANDS_CONFIG.find((i) => i.id.toString() === selectedIsland);

  // Turno abierto de la isla seleccionada
  const openShift = useMemo(
    () => shifts.find((s) => s.island === selectedIsland && s.status === 'open'),
    [shifts, selectedIsland]
  );

  return (
    <div>
      {/* Encabezado */}
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Vista en Vivo
          </h2>
          <p className="text-muted">
            Monitoreo en tiempo real del turno activo por isla
          </p>
        </div>
        {/* Indicador de vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: openShift ? '#34d399' : '#64748b',
            display: 'inline-block',
            boxShadow: openShift ? '0 0 0 3px rgba(52,211,153,0.3)' : 'none',
            animation: openShift ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: openShift ? '#34d399' : '#64748b',
          }}>
            {openShift ? 'Turno activo' : 'Sin turno activo'}
          </span>
        </div>
      </div>

      {/* Selector de isla */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ISLANDS_CONFIG.map((isl) => {
          const hasOpen = shifts.some((s) => s.island === isl.id.toString() && s.status === 'open');
          const isSelected = selectedIsland === isl.id.toString();
          return (
            <button
              key={isl.id}
              onClick={() => setSelectedIsland(isl.id.toString())}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: isSelected ? '2px solid #6366f1' : '2px solid #2d3a4f',
                background: isSelected ? 'rgba(99,102,241,0.15)' : '#1e293b',
                color: isSelected ? '#a5b4fc' : '#94a3b8',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: hasOpen ? '#34d399' : '#334155',
                display: 'inline-block',
                flexShrink: 0,
              }} />
              {isl.name}
            </button>
          );
        })}
      </div>

      {/* Sin turno activo */}
      {!openShift ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>😴</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {island?.name} — Sin turno activo
            </div>
            <p className="text-muted">
              Cuando un trabajador inicie turno en esta isla,
              verás todos los datos aquí en tiempo real.
            </p>
          </div>
        </Card>
      ) : (
        <LiveShiftView shift={openShift} island={island} prices={prices} />
      )}

      {/* Animación pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(52,211,153,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(52,211,153,0.1); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// SUB-COMPONENTE: Vista del turno activo
// ============================================
const LiveShiftView = ({ shift, island, prices }) => {
  const balance = useMemo(() => calcShiftBalance(shift, prices), [shift, prices]);
  const salesByProduct = useMemo(() => calcSalesByProduct(shift, prices), [shift, prices]);
  const cuadra = Math.abs(balance.difference) < 0.01;

  const colStyle = {
    height: 520,
    overflowY: 'auto',
    borderRadius: 16,
    background: 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)',
    border: '1px solid #2d3a4f',
    padding: 20,
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Info del turno */}
      <div style={{
        padding: '12px 20px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
        borderRadius: 14,
        border: '1px solid rgba(99,102,241,0.3)',
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 32 }}>⛽</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>
              {shift.worker}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {island?.name} · {shift.shift} · {shift.date}
            </div>
          </div>
        </div>
        <div style={{
          padding: '6px 16px', borderRadius: 20,
          background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b',
          color: '#fcd34d', fontSize: 12, fontWeight: 700,
        }}>
          🟡 EN CURSO
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid-4 mb-2">
        <StatCard
          label="Total Venta"
          value={formatCurrency(balance.totalSales)}
          color="#6366f1"
        />
        <StatCard
          label="Total Galones"
          value={formatGallons(
            Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0)
          )}
          color="#8b5cf6"
        />
        <StatCard
          label="Entregas"
          value={formatCurrency(balance.totalDeliveries)}
          color="#059669"
        />
        <StatCard
          label="Diferencia actual"
          value={formatSignedCurrency(balance.difference)}
          color={cuadra ? '#059669' : '#ef4444'}
        />
      </div>

      {/* ===== COLUMNAS CON SCROLL ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>

        {/* ---- IZQUIERDA: Contómetros ---- */}
        <div style={colStyle}>
          <div className="card-header" style={{ marginBottom: 12 }}>⛽ Contómetros</div>
          {island?.faces.map((face) => (
            <div key={face.id} style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 6,
              }}>
                {face.label}
              </div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Inicio</th>
                    <th>Final</th>
                    <th>Gal.</th>
                    <th>S/</th>
                  </tr>
                </thead>
                <tbody>
                  {face.dispensers.map((d) => {
                    const m = shift.meters[d.key] || { start: 0, end: null, product: d.product };
                    const gal = calcGallons(m.start, m.end);
                    const hasEnd = m.end !== null && m.end !== '' && m.end !== undefined;
                    return (
                      <tr key={d.key}>
                        <td>
                          <ProductTag product={d.product} />
                          {' '}
                          <span style={{ fontSize: 11, color: '#64748b' }}>{d.label}</span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>
                          {parseFloat(m.start || 0).toFixed(3)}
                        </td>
                        <td style={{ color: hasEnd ? '#34d399' : '#475569', fontSize: 12 }}>
                          {hasEnd ? parseFloat(m.end).toFixed(3) : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#6366f1', fontSize: 12 }}>
                          {gal > 0 ? gal.toFixed(3) : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399', fontSize: 12 }}>
                          {gal > 0 ? formatCurrency(gal * (prices[d.product] || 0)) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* ---- DERECHA: Todo el detalle con scroll ---- */}
        <div style={colStyle}>

          {/* Ventas por producto */}
          <div style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ marginBottom: 10 }}>📊 Ventas por Producto</div>
            {Object.keys(salesByProduct).length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                Sin lecturas finales aún
              </p>
            ) : (
              Object.entries(salesByProduct).map(([prod, data]) => (
                <div key={prod} className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
                  <ProductTag product={prod} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatGallons(data.gallons)}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#34d399' }}>
                    {formatCurrency(data.amount)}
                  </span>
                </div>
              ))
            )}

            {/* Balones GLP */}
            {island?.isGLP && (shift.gasCylinders || []).length > 0 && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', marginTop: 10, marginBottom: 6,
                }}>
                  Balones GLP
                </div>
                {shift.gasCylinders.map((c, i) => (
                  <div key={i} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 13 }}>Balón {c.size} kg × {parseFloat(c.count) || 0}</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}
                    </span>
                  </div>
                ))}
              </>
            )}

            <div className="flex-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>TOTAL VENTA</span>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#6366f1' }}>
                {formatCurrency(balance.totalSales)}
              </span>
            </div>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 16 }} />

          {/* Deducciones y entregas */}
          <div style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ marginBottom: 10 }}>📋 Deducciones y Entregas</div>
            <DeducRow label="Pagos electrónicos" value={balance.totalPayments} color="#f59e0b" />
            <DeducRow label="Créditos" value={balance.totalCredits} color="#f59e0b" />
            <DeducRow label="Promociones" value={balance.totalPromos} color="#f59e0b" />
            <DeducRow label="Descuentos" value={balance.totalDiscounts} color="#f59e0b" />
            <DeducRow label="Gastos" value={balance.totalExpenses} color="#ef4444" />
            <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8 }}>
              <DeducRow label="Entregas de dinero" value={balance.totalDeliveries} color="#34d399" plain />
              <DeducRow label="Pagos adelantados" value={balance.totalAdvance} color="#34d399" plain />
            </div>
          </div>

          {/* Pagos electrónicos detalle */}
          {(shift.payments || []).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
              <div className="card-header" style={{ marginBottom: 10 }}>💳 Detalle Pagos</div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Método</th><th>Referencia</th><th>Factura</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {shift.payments.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{p.method}</td>
                      <td style={{ fontSize: 12 }}>{p.reference || '—'}</td>
                      <td style={{ fontSize: 12 }}>{p.invoice || '—'}</td>
                      <td style={{ fontWeight: 700, fontSize: 12 }}>{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Créditos detalle */}
          {(shift.credits || []).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
              <div className="card-header" style={{ marginBottom: 10 }}>📄 Detalle Créditos</div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Prod.</th><th>Cliente</th><th>Vale</th><th>Gal.</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {shift.credits.map((c, i) => (
                    <tr key={i}>
                      <td><ProductTag product={c.product} /></td>
                      <td style={{ fontSize: 12 }}>{c.client || '—'}</td>
                      <td style={{ fontSize: 12 }}>{c.voucher || '—'}</td>
                      <td style={{ fontSize: 12 }}>{formatGallons(parseFloat(c.gallons) || 0)}</td>
                      <td style={{ fontWeight: 700, fontSize: 12 }}>
                        {formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Gastos detalle */}
          {(shift.expenses || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
              <div className="card-header" style={{ marginBottom: 10 }}>🧾 Detalle Gastos</div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Detalle</th><th>Monto S/</th></tr>
                </thead>
                <tbody>
                  {shift.expenses.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{e.detail || '—'}</td>
                      <td style={{ fontWeight: 700, fontSize: 12, color: '#ef4444' }}>
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cuadre al fondo de la columna derecha */}
          <div style={{ borderTop: '1px solid #2d3a4f', marginTop: 8, paddingTop: 14 }}>
            <div className={`cuadre-box ${cuadra ? 'cuadre-ok' : 'cuadre-error'}`}
              style={{ marginTop: 0 }}>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: cuadra ? '#6ee7b7' : '#fca5a5',
                  marginBottom: 6,
                }}>
                  {cuadra ? '✅ CUADRE CORRECTO' : '⚠️ HAY DIFERENCIA (en curso)'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Efectivo esperado: {formatCurrency(
                    balance.totalSales - balance.totalPayments
                    - balance.totalCredits - balance.totalPromos
                    - balance.totalDiscounts - balance.totalExpenses
                  )}
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 900,
                  color: cuadra ? '#34d399' : '#ef4444',
                }}>
                  {formatSignedCurrency(balance.difference)}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTE: Fila de deducción
// ============================================
const DeducRow = ({ label, value, color, plain }) => {
  if (!plain && value <= 0) return null;
  return (
    <div className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 14, color: value > 0 ? color : '#475569' }}>
        {value > 0 ? formatCurrency(value) : 'S/ 0.00'}
      </span>
    </div>
  );
};

export default LiveIslandPage;
