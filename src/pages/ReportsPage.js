import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, StatCard, ProductTag, StatusBadge, Modal } from '../components/UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency,
  calcGallons, calcShiftBalance, calcSalesByProduct,
} from '../utils/helpers';
import { ISLANDS_CONFIG } from '../utils/constants';

const todayStr = new Date().toISOString().split('T')[0];
const SHIFT_TABS = ['Mañana', 'Tarde', 'Noche'];

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────
const ReportsPage = ({ filterWorker }) => {
  if (filterWorker) return <WorkerReportView filterWorker={filterWorker} />;
  return <AdminReportsPage />;
};

// ──────────────────────────────────────────────
// ADMIN: PÁGINA PRINCIPAL
// ──────────────────────────────────────────────
const AdminReportsPage = () => {
  const { shifts, prices } = useApp();
  const [date, setDate] = useState(todayStr);
  const [shiftTab, setShiftTab] = useState('Mañana');
  const [islandTab, setIslandTab] = useState('1');
  const [printModal, setPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState('resumen');
  const [printSections, setPrintSections] = useState({
    payments: true, credits: true, promotions: false, discounts: false, expenses: true,
  });
  const [showBell, setShowBell] = useState(false);

  // Turnos cerrados que no cuadran
  const unbalancedShifts = useMemo(() =>
    shifts.filter(s =>
      s.status === 'closed' &&
      Math.abs(calcShiftBalance(s, prices).difference) >= 0.01
    ),
    [shifts, prices]
  );

  const dayShifts = useMemo(() => shifts.filter(s => s.date === date), [shifts, date]);

  const currentShift = useMemo(() => {
    if (shiftTab === 'completo') return null;
    return dayShifts.find(s => s.shift === shiftTab && s.island === islandTab) || null;
  }, [dayShifts, shiftTab, islandTab]);

  const island = ISLANDS_CONFIG.find(i => i.id.toString() === islandTab);

  const handlePrint = () => {
    setPrintModal(false);
    setTimeout(() => window.print(), 80);
  };

  const colStyle = {
    height: 500, overflowY: 'auto', borderRadius: 16,
    background: 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)',
    border: '1px solid #2d3a4f', padding: 20, boxSizing: 'border-box',
  };

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="no-print flex-between mb-2">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Reportes</h2>
          <p className="text-muted">Selecciona fecha, turno e isla</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date" value={date}
            onChange={e => setDate(e.target.value)}
            className="input-field" style={{ width: 160 }}
          />
          <Btn onClick={() => setPrintModal(true)}>🖨️ Imprimir</Btn>

          {/* ── CAMPANA DE NOTIFICACIONES ── */}
          {unbalancedShifts.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowBell(v => !v)}
                style={{
                  position: 'relative', background: showBell ? '#450a0a' : '#1e293b',
                  border: '2px solid #ef4444', borderRadius: 10, cursor: 'pointer',
                  padding: '7px 11px', fontSize: 18, lineHeight: 1,
                  transition: 'background 0.15s',
                }}
                title="Turnos con diferencia"
              >
                🔔
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ef4444', color: '#fff', borderRadius: 10,
                  fontSize: 10, fontWeight: 900, minWidth: 18, height: 18,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {unbalancedShifts.length}
                </span>
              </button>

              {showBell && (
                <>
                  {/* Overlay para cerrar el panel */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                    onClick={() => setShowBell(false)}
                  />
                  {/* Panel */}
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: '#1e293b', border: '1px solid #ef4444',
                    borderRadius: 14, padding: 14, zIndex: 99,
                    minWidth: 300, maxWidth: 360,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5' }}>
                        {unbalancedShifts.length} turno{unbalancedShifts.length > 1 ? 's' : ''} con diferencia
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {unbalancedShifts.map(s => {
                        const diff = calcShiftBalance(s, prices).difference;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setDate(s.date);
                              setShiftTab(s.shift);
                              setIslandTab(s.island);
                              setShowBell(false);
                            }}
                            style={{
                              cursor: 'pointer', borderRadius: 10, padding: '10px 12px',
                              background: '#0f172a', border: '1px solid #334155',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              transition: 'border-color 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.worker}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                {s.date} · {s.shift} · Isla {s.island}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: '#ef4444' }}>
                                {diff < 0 ? '▼ FALTA' : '▲ SOBRA'}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
                                {formatCurrency(Math.abs(diff))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 10, textAlign: 'center' }}>
                      Toca un turno para ir directamente a él
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── TABS TURNO ── */}
      <div className="no-print tabs-container">
        {[...SHIFT_TABS, 'completo'].map(t => (
          <button key={t}
            className={`tab-btn ${shiftTab === t ? 'active' : ''}`}
            onClick={() => setShiftTab(t)}>
            {t === 'Mañana' ? '🌅 Mañana'
              : t === 'Tarde' ? '☀️ Tarde'
              : t === 'Noche' ? '🌙 Noche'
              : '📊 Día Completo'}
          </button>
        ))}
      </div>

      {/* ── TABS ISLA (solo turno específico) ── */}
      {shiftTab !== 'completo' && (
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {ISLANDS_CONFIG.map(isl => {
            const hasData = dayShifts.some(s => s.shift === shiftTab && s.island === isl.id.toString());
            const sel = islandTab === isl.id.toString();
            return (
              <button key={isl.id} onClick={() => setIslandTab(isl.id.toString())}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: sel ? '2px solid #6366f1' : '2px solid #2d3a4f',
                  background: sel ? 'rgba(99,102,241,0.15)' : '#1e293b',
                  color: sel ? '#a5b4fc' : '#94a3b8',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: hasData ? '#34d399' : '#334155', flexShrink: 0,
                }} />
                {isl.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── CONTENIDO (pantalla) ── */}
      <div className="no-print">
        {shiftTab !== 'completo' ? (
          currentShift ? (
            <ClosedShiftView shift={currentShift} island={island} prices={prices} colStyle={colStyle} />
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Sin datos</div>
                <p className="text-muted">
                  No hay turno de {shiftTab} en {island?.name} para el {date}
                </p>
              </div>
            </Card>
          )
        ) : (
          <DayCompleteView dayShifts={dayShifts} prices={prices} colStyle={colStyle} date={date} />
        )}
      </div>

      {/* ── ÁREA DE IMPRESIÓN (oculta en pantalla) ── */}
      <div id="report-print-area">
        {shiftTab !== 'completo' ? (
          currentShift ? (
            <PrintShiftReport
              shift={currentShift} island={island} prices={prices}
              date={date} mode={printMode} sections={printSections}
            />
          ) : (
            <p style={{ textAlign: 'center', padding: 40 }}>Sin datos para imprimir.</p>
          )
        ) : (
          <PrintDayReport
            dayShifts={dayShifts} prices={prices} date={date}
            mode={printMode} sections={printSections}
          />
        )}
      </div>

      {/* ── MODAL IMPRESIÓN ── */}
      {printModal && (
        <PrintModal
          printMode={printMode} setPrintMode={setPrintMode}
          printSections={printSections} setPrintSections={setPrintSections}
          onClose={() => setPrintModal(false)} onPrint={handlePrint}
        />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// VISTA: Turno individual (similar a LiveShiftView)
// ──────────────────────────────────────────────
const ClosedShiftView = ({ shift, island, prices, colStyle }) => {
  const { setVerifyTarget, setCurrentPage, verifiedReports } = useApp();
  const balance = useMemo(() => calcShiftBalance(shift, prices), [shift, prices]);
  const salesByProduct = useMemo(() => calcSalesByProduct(shift, prices), [shift, prices]);
  const cuadra = Math.abs(balance.difference) < 0.01;
  const isClosed = shift.status === 'closed';
  const existingVerif = verifiedReports.find(r => r.shiftId === shift.id);

  return (
    <div>
      {/* Banner */}
      <div style={{
        padding: '12px 20px', borderRadius: 14, marginBottom: 16,
        background: isClosed
          ? 'linear-gradient(135deg, rgba(5,150,105,0.12), rgba(16,185,129,0.08))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
        border: `1px solid ${isClosed ? 'rgba(5,150,105,0.4)' : 'rgba(245,158,11,0.4)'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>⛽</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{shift.worker}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {island?.name} · {shift.shift} · {shift.date}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge status={shift.status} />
          {isClosed && (
            <Btn
              variant="primary"
              className="btn-sm"
              onClick={() => {
                setVerifyTarget({ shift, editingId: existingVerif?.id || null });
                setCurrentPage('verify');
              }}
            >
              {existingVerif ? '✏️ Editar Verificación' : '🔍 Verificar Reporte'}
            </Btn>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-2">
        <StatCard label="Total Venta" value={formatCurrency(balance.totalSales)} color="#6366f1" />
        <StatCard label="Total Galones"
          value={formatGallons(Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0))}
          color="#8b5cf6" />
        <StatCard label="Entregas" value={formatCurrency(balance.totalDeliveries)} color="#059669" />
        <StatCard label="Diferencia" value={formatSignedCurrency(balance.difference)}
          color={cuadra ? '#059669' : '#ef4444'} />
      </div>

      {/* Columnas con scroll */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Izquierda: Contómetros */}
        <div style={colStyle}>
          <div className="card-header" style={{ marginBottom: 12 }}>⛽ Contómetros</div>
          {island?.faces.map(face => (
            <div key={face.id} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {face.label}
              </div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Producto</th><th>Inicio</th><th>Final</th><th>Gal.</th><th>S/</th></tr>
                </thead>
                <tbody>
                  {face.dispensers.map(d => {
                    const m = shift.meters[d.key] || { start: 0, end: null };
                    const gal = calcGallons(m.start, m.end);
                    const hasEnd = m.end !== null && m.end !== '' && m.end !== undefined;
                    return (
                      <tr key={d.key}>
                        <td>
                          <ProductTag product={d.product} />
                          {' '}<span style={{ fontSize: 11, color: '#64748b' }}>{d.label}</span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{parseFloat(m.start || 0).toFixed(3)}</td>
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

        {/* Derecha: Detalle con scroll */}
        <div style={colStyle}>
          {/* Ventas por producto */}
          <div style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 10 }}>📊 Ventas por Producto</div>
            {Object.keys(salesByProduct).length === 0
              ? <p className="text-muted" style={{ fontSize: 13 }}>Sin lecturas finales</p>
              : Object.entries(salesByProduct).map(([prod, data]) => (
                <div key={prod} className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
                  <ProductTag product={prod} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatGallons(data.gallons)}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#34d399' }}>{formatCurrency(data.amount)}</span>
                </div>
              ))
            }
            {island?.isGLP && (shift.gasCylinders || []).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' }}>Balones GLP</div>
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
              <span style={{ fontWeight: 900, fontSize: 16, color: '#6366f1' }}>{formatCurrency(balance.totalSales)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 16 }} />

          {/* Deducciones */}
          <div style={{ marginBottom: 16 }}>
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

          {/* Pagos detalle */}
          {(shift.payments || []).length > 0 && (<>
            <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
            <div className="card-header" style={{ marginBottom: 10 }}>💳 Detalle Pagos</div>
            <table className="data-table" style={{ width: '100%', marginBottom: 16 }}>
              <thead><tr><th>Método</th><th>Referencia</th><th>Factura</th><th>Monto</th></tr></thead>
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
          </>)}

          {/* Créditos detalle */}
          {(shift.credits || []).length > 0 && (<>
            <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
            <div className="card-header" style={{ marginBottom: 10 }}>📄 Detalle Créditos</div>
            <table className="data-table" style={{ width: '100%', marginBottom: 16 }}>
              <thead><tr><th>Prod.</th><th>Cliente</th><th>Vale</th><th>Gal.</th><th>Monto</th></tr></thead>
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
          </>)}

          {/* Gastos detalle */}
          {(shift.expenses || []).length > 0 && (<>
            <div style={{ borderTop: '1px solid #2d3a4f', marginBottom: 14 }} />
            <div className="card-header" style={{ marginBottom: 10 }}>🧾 Gastos</div>
            <table className="data-table" style={{ width: '100%', marginBottom: 16 }}>
              <thead><tr><th>Detalle</th><th>Monto S/</th></tr></thead>
              <tbody>
                {shift.expenses.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{e.detail || '—'}</td>
                    <td style={{ fontWeight: 700, fontSize: 12, color: '#ef4444' }}>{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>)}

          {/* Cuadre al fondo */}
          <div style={{ borderTop: '1px solid #2d3a4f', marginTop: 8, paddingTop: 14 }}>
            <div className={`cuadre-box ${cuadra ? 'cuadre-ok' : 'cuadre-error'}`} style={{ marginTop: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: cuadra ? '#6ee7b7' : '#fca5a5', marginBottom: 6 }}>
                  {cuadra ? '✅ CUADRE CORRECTO' : '⚠️ HAY DIFERENCIA'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Efectivo esperado: {formatCurrency(
                    balance.totalSales - balance.totalPayments - balance.totalCredits
                    - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses
                  )}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: cuadra ? '#34d399' : '#ef4444' }}>
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

// ──────────────────────────────────────────────
// VISTA: Día Completo
// ──────────────────────────────────────────────
const DayCompleteView = ({ dayShifts, prices, colStyle, date }) => {
  const { setVerifyTarget, setCurrentPage, verifiedReports } = useApp();
  const existingDayVerif = verifiedReports.find(r => r.type === 'day' && r.date === date);
  const closedShifts = dayShifts.filter(s => s.status === 'closed');

  const allBalances = useMemo(
    () => dayShifts.map(s => ({ shift: s, balance: calcShiftBalance(s, prices) })),
    [dayShifts, prices]
  );
  const totals = useMemo(() => allBalances.reduce((acc, { balance }) => ({
    sales: acc.sales + balance.totalSales,
    deliveries: acc.deliveries + balance.totalDeliveries,
    payments: acc.payments + balance.totalPayments,
    credits: acc.credits + balance.totalCredits,
    promos: acc.promos + balance.totalPromos,
    discounts: acc.discounts + balance.totalDiscounts,
    expenses: acc.expenses + balance.totalExpenses,
    difference: acc.difference + balance.difference,
  }), { sales: 0, deliveries: 0, payments: 0, credits: 0, promos: 0, discounts: 0, expenses: 0, difference: 0 }),
    [allBalances]);

  const productTotals = useMemo(() => {
    const result = {};
    dayShifts.forEach(s => {
      Object.values(s.meters).forEach(m => {
        const gal = calcGallons(m.start, m.end);
        if (!gal || !m.product) return;
        if (!result[m.product]) result[m.product] = { gallons: 0, amount: 0 };
        result[m.product].gallons += gal;
        result[m.product].amount += gal * (prices[m.product] || 0);
      });
    });
    return result;
  }, [dayShifts, prices]);

  const totalGallons = Object.values(productTotals).reduce((s, v) => s + v.gallons, 0);
  const cylinderTotal = dayShifts.reduce((sum, s) =>
    sum + (s.gasCylinders || []).reduce((s2, c) =>
      s2 + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0), 0), 0);

  const paymentsByMethod = useMemo(() => {
    const result = {};
    dayShifts.forEach(s => {
      (s.payments || []).forEach(p => {
        result[p.method] = (result[p.method] || 0) + (parseFloat(p.amount) || 0);
      });
    });
    return result;
  }, [dayShifts]);

  const dayOk = Math.abs(totals.difference) < 0.01;

  if (dayShifts.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Sin turnos registrados para este día</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid-4 mb-2">
        <StatCard label="Venta Total del Día" value={formatCurrency(totals.sales)} color="#6366f1" />
        <StatCard label="Galones Totales" value={formatGallons(totalGallons)} color="#8b5cf6" />
        <StatCard label="Total Entregas" value={formatCurrency(totals.deliveries)} color="#059669" />
        <StatCard label="Diferencia Total" value={formatSignedCurrency(totals.difference)}
          color={dayOk ? '#059669' : '#ef4444'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Izquierda: Productos + Pagos */}
        <div style={colStyle}>
          <div className="card-header" style={{ marginBottom: 10 }}>📊 Ventas por Producto — Día Completo</div>
          {Object.entries(productTotals).map(([prod, data]) => (
            <div key={prod} className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
              <ProductTag product={prod} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatGallons(data.gallons)}</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>{formatCurrency(data.amount)}</span>
            </div>
          ))}
          {cylinderTotal > 0 && (
            <div className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>🛢️ Balones GLP</span>
              <span style={{ color: '#64748b' }}>—</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(cylinderTotal)}</span>
            </div>
          )}
          <div className="flex-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
            <span style={{ fontWeight: 800 }}>TOTAL</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#6366f1' }}>{formatCurrency(totals.sales)}</span>
          </div>

          <div style={{ borderTop: '1px solid #2d3a4f', margin: '16px 0' }} />

          <div className="card-header" style={{ marginBottom: 10 }}>💳 Pagos por Método</div>
          {Object.keys(paymentsByMethod).length === 0
            ? <p className="text-muted" style={{ fontSize: 13 }}>Sin pagos electrónicos</p>
            : Object.entries(paymentsByMethod).map(([method, amount]) => (
              <div key={method} className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontWeight: 600 }}>{method}</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(amount)}</span>
              </div>
            ))
          }
          {Object.keys(paymentsByMethod).length > 0 && (
            <div className="flex-between" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #334155' }}>
              <span style={{ fontWeight: 700 }}>Total Pagos</span>
              <span style={{ fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(totals.payments)}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid #2d3a4f', margin: '16px 0' }} />

          <div className="card-header" style={{ marginBottom: 10 }}>📋 Resumen Deducciones</div>
          <DeducRow label="Total Créditos" value={totals.credits} color="#f59e0b" />
          <DeducRow label="Total Promociones" value={totals.promos} color="#f59e0b" />
          <DeducRow label="Total Descuentos" value={totals.discounts} color="#f59e0b" />
          <DeducRow label="Total Gastos" value={totals.expenses} color="#ef4444" />
          <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8 }}>
            <DeducRow label="Total Entregas" value={totals.deliveries} color="#34d399" plain />
          </div>
        </div>

        {/* Derecha: Cuadre por turno */}
        <div style={colStyle}>
          <div className="card-header" style={{ marginBottom: 12 }}>⚖️ Cuadre por Turno</div>
          <table className="data-table" style={{ width: '100%', marginBottom: 16 }}>
            <thead>
              <tr><th>Trabajador</th><th>Turno</th><th>Isla</th><th>Venta</th><th>Diferencia</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {allBalances.map(({ shift: s, balance }) => {
                const cuadra = Math.abs(balance.difference) < 0.01;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{s.worker}</td>
                    <td style={{ fontSize: 12 }}>{s.shift}</td>
                    <td style={{ fontSize: 12 }}>
                      {ISLANDS_CONFIG.find(i => i.id.toString() === s.island)?.name || `Isla ${s.island}`}
                    </td>
                    <td style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{formatCurrency(balance.totalSales)}</td>
                    <td style={{ fontSize: 12, fontWeight: 700, color: cuadra ? '#34d399' : '#ef4444' }}>
                      {formatSignedCurrency(balance.difference)}
                    </td>
                    <td>
                      {s.status === 'open'
                        ? <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>🟡 Abierto</span>
                        : cuadra
                          ? <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>✅ Cuadra</span>
                          : <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}>⚠️ No cuadra</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderTop: '1px solid #2d3a4f', paddingTop: 14 }}>
            <div className={`cuadre-box ${dayOk ? 'cuadre-ok' : 'cuadre-error'}`} style={{ marginTop: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: dayOk ? '#6ee7b7' : '#fca5a5', marginBottom: 6 }}>
                  {dayOk ? '✅ DÍA CUADRADO' : '⚠️ HAY DIFERENCIA EN EL DÍA'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  {dayShifts.length} turno{dayShifts.length !== 1 ? 's' : ''} registrados
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: dayOk ? '#34d399' : '#ef4444' }}>
                  {formatSignedCurrency(totals.difference)}
                </div>
              </div>
            </div>
          </div>

          {/* Botón verificar día */}
          {closedShifts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Btn
                variant="primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15, fontWeight: 800 }}
                onClick={() => {
                  setVerifyTarget({ shifts: closedShifts, date, editingId: existingDayVerif?.id || null });
                  setCurrentPage('verify');
                }}
              >
                {existingDayVerif ? '✏️ Editar Verificación del Día' : '🔍 Verificar Día Completo'}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// MODAL DE IMPRESIÓN
// ──────────────────────────────────────────────
const PrintModal = ({ printMode, setPrintMode, printSections, setPrintSections, onClose, onPrint }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
      <div className="modal-header">
        <div className="modal-title">🖨️ Opciones de Impresión</div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['resumen', '📋 Resumen'], ['detallado', '📑 Detallado']].map(([key, label]) => (
          <button key={key} onClick={() => setPrintMode(key)}
            style={{
              flex: 1, padding: 12, borderRadius: 10, fontFamily: 'inherit',
              border: printMode === key ? '2px solid #6366f1' : '2px solid #334155',
              background: printMode === key ? 'rgba(99,102,241,0.15)' : '#0f172a',
              color: printMode === key ? '#a5b4fc' : '#94a3b8',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
            {label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
        {printMode === 'resumen'
          ? 'Solo totales: ventas, galones y cuadre. Sin tablas de detalle.'
          : 'Elige qué secciones incluir:'}
      </p>

      {printMode === 'detallado' && (
        <div style={{ marginBottom: 16 }}>
          {[
            ['payments', '💳 Pagos electrónicos (Visa / Yape / Transferencia)'],
            ['credits', '📄 Créditos'],
            ['promotions', '🎁 Promociones'],
            ['discounts', '🔻 Descuentos'],
            ['expenses', '🧾 Gastos'],
          ].map(([key, label]) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0', borderBottom: '1px solid #1e293b',
              cursor: 'pointer', fontSize: 14, color: '#e2e8f0',
            }}>
              <input type="checkbox" checked={printSections[key]}
                onChange={e => setPrintSections(prev => ({ ...prev, [key]: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
              {label}
            </label>
          ))}
        </div>
      )}

      <Btn className="btn-full" style={{ padding: 14, fontSize: 15 }} onClick={onPrint}>
        🖨️ Imprimir
      </Btn>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// IMPRESIÓN: Reporte de un turno
// ──────────────────────────────────────────────
const PT = { padding: '3px 6px', border: '1px solid #ccc' }; // celda tabla print
const PTH = { ...PT, background: '#f0f0f0', fontWeight: 700 }; // cabecera

const PrintShiftReport = ({ shift, island, prices, date, mode, sections }) => {
  const balance = calcShiftBalance(shift, prices);
  const salesByProduct = calcSalesByProduct(shift, prices);
  const cuadra = Math.abs(balance.difference) < 0.01;
  const totalGallons = Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#111', fontSize: 10 }}>
      {/* Encabezado */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>⛽ GRIFO — Control de Ventas</div>
        <div style={{ fontSize: 11, color: '#555' }}>Reporte de Turno</div>
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginBottom: 8 }}>
        {[['Trabajador', shift.worker], ['Fecha', date], ['Turno', shift.shift], ['Isla', island?.name]].map(([k, v]) => (
          <div key={k}><strong>{k}:</strong> {v}</div>
        ))}
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
        {[
          ['Total Venta', formatCurrency(balance.totalSales)],
          ['Total Galones', formatGallons(totalGallons)],
          ['Entregas', formatCurrency(balance.totalDeliveries)],
          ['Diferencia', formatSignedCurrency(balance.difference)],
        ].map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #ccc', borderRadius: 5, padding: '5px 7px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contómetros + Cuadre en 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8, marginBottom: 8 }}>
        {/* Contómetros */}
        <div>
          {island?.faces.map(face => (
            <div key={face.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#555', marginBottom: 3, textTransform: 'uppercase' }}>
                {face.label}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <thead>
                  <tr>
                    {['Producto', 'Inicio', 'Final', 'Gal.', 'S/'].map(h => (
                      <th key={h} style={PTH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {face.dispensers.map(d => {
                    const m = shift.meters[d.key] || { start: 0, end: null };
                    const gal = calcGallons(m.start, m.end);
                    const hasEnd = m.end !== null && m.end !== '' && m.end !== undefined;
                    return (
                      <tr key={d.key}>
                        <td style={PT}>{d.product} {d.label}</td>
                        <td style={{ ...PT, textAlign: 'right' }}>{parseFloat(m.start || 0).toFixed(3)}</td>
                        <td style={{ ...PT, textAlign: 'right' }}>{hasEnd ? parseFloat(m.end).toFixed(3) : '—'}</td>
                        <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{gal > 0 ? gal.toFixed(3) : '—'}</td>
                        <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{gal > 0 ? formatCurrency(gal * (prices[d.product] || 0)) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Cuadre resumido */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>Ventas y Cuadre</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <tbody>
              {Object.entries(salesByProduct).map(([prod, data]) => (
                <tr key={prod}>
                  <td style={PT}>{prod}</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatGallons(data.gallons)}</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(data.amount)}</td>
                </tr>
              ))}
              {island?.isGLP && (shift.gasCylinders || []).length > 0 && (
                <tr>
                  <td style={PT} colSpan={2}>Balones GLP</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency((shift.gasCylinders || []).reduce((s, c) => s + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0), 0))}
                  </td>
                </tr>
              )}
              <tr style={{ background: '#f0f0f0' }}>
                <td colSpan={2} style={{ ...PT, fontWeight: 800 }}>TOTAL VENTA</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>{formatCurrency(balance.totalSales)}</td>
              </tr>
              {[
                ['- Pagos electr.', balance.totalPayments],
                ['- Créditos', balance.totalCredits],
                ['- Promos', balance.totalPromos],
                ['- Descuentos', balance.totalDiscounts],
                ['- Gastos', balance.totalExpenses],
              ].filter(([, v]) => v > 0).map(([label, value]) => (
                <tr key={label}>
                  <td colSpan={2} style={PT}>{label}</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatCurrency(value)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ ...PT, fontWeight: 700 }}>= Efect. esperado</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>
                  {formatCurrency(balance.totalSales - balance.totalPayments - balance.totalCredits - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={PT}>Entregas</td>
                <td style={{ ...PT, textAlign: 'right' }}>{formatCurrency(balance.totalDeliveries)}</td>
              </tr>
              {balance.totalAdvance > 0 && (
                <tr>
                  <td colSpan={2} style={PT}>Adelantos</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatCurrency(balance.totalAdvance)}</td>
                </tr>
              )}
              <tr style={{ background: cuadra ? '#e8f5e9' : '#ffebee' }}>
                <td colSpan={2} style={{ ...PT, fontWeight: 900 }}>DIFERENCIA</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>
                  {formatSignedCurrency(balance.difference)} {cuadra ? '✅' : '⚠️'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Secciones detalladas */}
      {mode === 'detallado' && sections.payments && (shift.payments || []).length > 0 && (
        <PrintDetailTable title="💳 PAGOS ELECTRÓNICOS"
          headers={['Método', 'Referencia', 'Factura', 'Monto']}
          rows={shift.payments.map(p => [p.method, p.reference || '—', p.invoice || '—', formatCurrency(p.amount)])} />
      )}
      {mode === 'detallado' && sections.credits && (shift.credits || []).length > 0 && (
        <PrintDetailTable title="📄 CRÉDITOS"
          headers={['Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
          rows={shift.credits.map(c => [c.product, c.client || '—', c.voucher || '—', formatGallons(parseFloat(c.gallons) || 0), formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))])} />
      )}
      {mode === 'detallado' && sections.promotions && (shift.promotions || []).length > 0 && (
        <PrintDetailTable title="🎁 PROMOCIONES"
          headers={['Producto', 'DNI/Placa', 'Galones']}
          rows={shift.promotions.map(p => [p.product, p.dniPlate || '—', formatGallons(parseFloat(p.gallons) || 0)])} />
      )}
      {mode === 'detallado' && sections.discounts && (shift.discounts || []).length > 0 && (
        <PrintDetailTable title="🔻 DESCUENTOS"
          headers={['Producto', 'Cliente', 'Galones', 'Precio', 'Monto']}
          rows={shift.discounts.map(d => [d.product, d.client || '—', formatGallons(parseFloat(d.gallons) || 0), formatCurrency(d.price), formatCurrency((parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0))])} />
      )}
      {mode === 'detallado' && sections.expenses && (shift.expenses || []).length > 0 && (
        <PrintDetailTable title="🧾 GASTOS"
          headers={['Detalle', 'Monto S/']}
          rows={shift.expenses.map(e => [e.detail || '—', formatCurrency(e.amount)])} />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// IMPRESIÓN: Reporte del día completo
// ──────────────────────────────────────────────
const PrintDayReport = ({ dayShifts, prices, date, mode, sections }) => {
  const allBalances = dayShifts.map(s => ({ shift: s, balance: calcShiftBalance(s, prices) }));
  const totals = allBalances.reduce((acc, { balance }) => ({
    sales: acc.sales + balance.totalSales,
    deliveries: acc.deliveries + balance.totalDeliveries,
    payments: acc.payments + balance.totalPayments,
    credits: acc.credits + balance.totalCredits,
    promos: acc.promos + balance.totalPromos,
    discounts: acc.discounts + balance.totalDiscounts,
    expenses: acc.expenses + balance.totalExpenses,
    difference: acc.difference + balance.difference,
  }), { sales: 0, deliveries: 0, payments: 0, credits: 0, promos: 0, discounts: 0, expenses: 0, difference: 0 });

  const productTotals = {};
  dayShifts.forEach(s => {
    Object.values(s.meters).forEach(m => {
      const gal = calcGallons(m.start, m.end);
      if (!gal || !m.product) return;
      if (!productTotals[m.product]) productTotals[m.product] = { gallons: 0, amount: 0 };
      productTotals[m.product].gallons += gal;
      productTotals[m.product].amount += gal * (prices[m.product] || 0);
    });
  });

  const paymentsByMethod = {};
  dayShifts.forEach(s => {
    (s.payments || []).forEach(p => {
      paymentsByMethod[p.method] = (paymentsByMethod[p.method] || 0) + (parseFloat(p.amount) || 0);
    });
  });

  const totalGallons = Object.values(productTotals).reduce((s, v) => s + v.gallons, 0);
  const dayOk = Math.abs(totals.difference) < 0.01;

  if (dayShifts.length === 0) {
    return <p style={{ textAlign: 'center', padding: 30 }}>Sin turnos para imprimir.</p>;
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#111', fontSize: 10 }}>
      {/* Encabezado */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>⛽ GRIFO — Control de Ventas</div>
        <div style={{ fontSize: 11, color: '#555' }}>Reporte del Día — {date}</div>
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
        {[
          ['Venta Total', formatCurrency(totals.sales)],
          ['Galones Totales', formatGallons(totalGallons)],
          ['Total Entregas', formatCurrency(totals.deliveries)],
          ['Diferencia Total', formatSignedCurrency(totals.difference)],
        ].map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #ccc', borderRadius: 5, padding: '5px 7px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tablas en 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {/* Ventas por producto */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Ventas por Producto</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr><th style={PTH}>Producto</th><th style={PTH}>Galones</th><th style={PTH}>S/</th></tr>
            </thead>
            <tbody>
              {Object.entries(productTotals).map(([prod, data]) => (
                <tr key={prod}>
                  <td style={PT}>{prod}</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatGallons(data.gallons)}</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(data.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ ...PT, fontWeight: 800 }}>TOTAL</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatGallons(totalGallons)}</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>{formatCurrency(totals.sales)}</td>
              </tr>
            </tbody>
          </table>

          {/* Pagos por método */}
          {Object.keys(paymentsByMethod).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Pagos por Método</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <tbody>
                  {Object.entries(paymentsByMethod).map(([method, amount]) => (
                    <tr key={method}>
                      <td style={PT}>{method}</td>
                      <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cuadre por turno */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Cuadre por Turno</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr>
                {['Trabajador', 'Turno', 'Isla', 'Venta', 'Diferencia', 'Estado'].map(h => (
                  <th key={h} style={PTH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allBalances.map(({ shift: s, balance }) => {
                const cuadra = Math.abs(balance.difference) < 0.01;
                return (
                  <tr key={s.id}>
                    <td style={PT}>{s.worker}</td>
                    <td style={PT}>{s.shift}</td>
                    <td style={PT}>{ISLANDS_CONFIG.find(i => i.id.toString() === s.island)?.name || `Isla ${s.island}`}</td>
                    <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(balance.totalSales)}</td>
                    <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatSignedCurrency(balance.difference)}</td>
                    <td style={{ ...PT, textAlign: 'center' }}>{s.status === 'open' ? '🟡' : cuadra ? '✅' : '⚠️'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totales del día */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Resumen del Día</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <tbody>
                {[
                  ['Total Créditos', formatCurrency(totals.credits)],
                  ['Total Gastos', formatCurrency(totals.expenses)],
                  ['Total Entregas', formatCurrency(totals.deliveries)],
                ].filter(([, v]) => v !== 'S/ 0.00').map(([k, v]) => (
                  <tr key={k}><td style={PT}>{k}</td><td style={{ ...PT, textAlign: 'right' }}>{v}</td></tr>
                ))}
                <tr style={{ background: dayOk ? '#e8f5e9' : '#ffebee' }}>
                  <td style={{ ...PT, fontWeight: 900 }}>DIFERENCIA TOTAL</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>
                    {formatSignedCurrency(totals.difference)} {dayOk ? '✅' : '⚠️'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Secciones detalladas (modo detallado) */}
      {mode === 'detallado' && sections.payments && (
        (() => {
          const allPayments = dayShifts.flatMap(s => (s.payments || []).map(p => ({ ...p, worker: s.worker, shift: s.shift })));
          return allPayments.length > 0 ? (
            <PrintDetailTable title="💳 PAGOS ELECTRÓNICOS — TODOS LOS TURNOS"
              headers={['Trabajador', 'Turno', 'Método', 'Referencia', 'Factura', 'Monto']}
              rows={allPayments.map(p => [p.worker, p.shift, p.method, p.reference || '—', p.invoice || '—', formatCurrency(p.amount)])} />
          ) : null;
        })()
      )}
      {mode === 'detallado' && sections.credits && (
        (() => {
          const allCredits = dayShifts.flatMap(s => (s.credits || []).map(c => ({ ...c, worker: s.worker, shift: s.shift })));
          return allCredits.length > 0 ? (
            <PrintDetailTable title="📄 CRÉDITOS — TODOS LOS TURNOS"
              headers={['Trabajador', 'Turno', 'Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
              rows={allCredits.map(c => [c.worker, c.shift, c.product, c.client || '—', c.voucher || '—', formatGallons(parseFloat(c.gallons) || 0), formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))])} />
          ) : null;
        })()
      )}
      {mode === 'detallado' && sections.expenses && (
        (() => {
          const allExp = dayShifts.flatMap(s => (s.expenses || []).map(e => ({ ...e, worker: s.worker, shift: s.shift })));
          return allExp.length > 0 ? (
            <PrintDetailTable title="🧾 GASTOS — TODOS LOS TURNOS"
              headers={['Trabajador', 'Turno', 'Detalle', 'Monto']}
              rows={allExp.map(e => [e.worker, e.shift, e.detail || '—', formatCurrency(e.amount)])} />
          ) : null;
        })()
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// HELPER: Tabla genérica para impresión
// ──────────────────────────────────────────────
const PrintDetailTable = ({ title, headers, rows }) => (
  <div style={{ marginTop: 7 }}>
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{title}</div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
      <thead>
        <tr>{headers.map(h => <th key={h} style={PTH}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j} style={PT}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ──────────────────────────────────────────────
// VISTA TRABAJADOR: Mis Reportes
// ──────────────────────────────────────────────
const WorkerReportView = ({ filterWorker }) => {
  const { shifts, prices } = useApp();
  const [dateFilter, setDateFilter] = useState('');
  const [selectedShift, setSelectedShift] = useState(null);

  const filtered = shifts
    .filter(s => s.worker === filterWorker && (!dateFilter || s.date === dateFilter))
    .slice().reverse();

  return (
    <div>
      <div className="flex-between mb-2">
        <h2 style={{ fontSize: 28, fontWeight: 800 }}>Mis Reportes</h2>
        <input type="date" value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="input-field" style={{ width: 180 }} />
      </div>
      <Card>
        <table className="data-table">
          <thead>
            <tr><th>Fecha</th><th>Turno</th><th>Isla</th><th>Total Venta</th><th>Cuadre</th><th>Estado</th><th>Ver</th></tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const bal = calcShiftBalance(s, prices);
              const cuadra = Math.abs(bal.difference) < 0.01;
              return (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.shift}</td>
                  <td>{ISLANDS_CONFIG.find(i => i.id.toString() === s.island)?.name || `Isla ${s.island}`}</td>
                  <td className="font-bold text-primary">{formatCurrency(bal.totalSales)}</td>
                  <td style={{ fontWeight: 700, color: s.status === 'closed' ? (cuadra ? '#34d399' : '#ef4444') : '#64748b' }}>
                    {s.status === 'closed'
                      ? (cuadra ? '✅ Cuadra' : `⚠️ ${formatSignedCurrency(bal.difference)}`)
                      : 'En curso'}
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <Btn variant="ghost" className="btn-sm" onClick={() => setSelectedShift(s)}>Ver</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-muted" style={{ textAlign: 'center', padding: 30 }}>No hay turnos registrados</p>
        )}
      </Card>

      <Modal open={!!selectedShift} onClose={() => setSelectedShift(null)} title="Detalle de Turno">
        {selectedShift && <WorkerShiftDetail shift={selectedShift} prices={prices} />}
      </Modal>
    </div>
  );
};

const WorkerShiftDetail = ({ shift, prices }) => {
  const balance = calcShiftBalance(shift, prices);
  const cuadra = Math.abs(balance.difference) < 0.01;
  const island = ISLANDS_CONFIG.find(i => i.id.toString() === shift.island);
  return (
    <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
      <div className="grid-2 mb-2">
        <div><strong>Trabajador:</strong> {shift.worker}</div>
        <div><strong>Fecha:</strong> {shift.date}</div>
        <div><strong>Turno:</strong> {shift.shift}</div>
        <div><strong>Isla:</strong> {island?.name || `Isla ${shift.island}`}</div>
      </div>
      {Object.entries(calcSalesByProduct(shift, prices)).map(([prod, data]) => (
        <div key={prod} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
          <ProductTag product={prod} />
          <span>{formatGallons(data.gallons)}</span>
          <span className="font-bold">{formatCurrency(data.amount)}</span>
        </div>
      ))}
      <div className="flex-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
        <strong>Total Venta</strong>
        <strong style={{ color: '#6366f1', fontSize: 16 }}>{formatCurrency(balance.totalSales)}</strong>
      </div>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        {balance.totalPayments > 0 && <div><strong>Pagos elect.:</strong> {formatCurrency(balance.totalPayments)}</div>}
        {balance.totalCredits > 0 && <div><strong>Créditos:</strong> {formatCurrency(balance.totalCredits)}</div>}
        {balance.totalExpenses > 0 && <div><strong>Gastos:</strong> {formatCurrency(balance.totalExpenses)}</div>}
        <div><strong>Entregas:</strong> {formatCurrency(balance.totalDeliveries)}</div>
      </div>
      <div style={{
        marginTop: 14, padding: 12, borderRadius: 10,
        background: cuadra ? '#064e3b' : '#450a0a',
        border: `1px solid ${cuadra ? '#065f46' : '#7f1d1d'}`,
      }}>
        <div className="flex-between">
          <strong style={{ color: cuadra ? '#6ee7b7' : '#fca5a5' }}>
            {cuadra ? '✅ CUADRE CORRECTO' : '⚠️ HAY DIFERENCIA'}
          </strong>
          <strong style={{ fontSize: 18, color: cuadra ? '#34d399' : '#ef4444' }}>
            {formatSignedCurrency(balance.difference)}
          </strong>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// HELPER: Fila de deducción
// ──────────────────────────────────────────────
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

export default ReportsPage;
