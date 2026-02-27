import React, { useState, useMemo } from 'react';
import { Card, Btn, ProductTag } from '../UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency,
  calcShiftBalance, calcSalesByProduct,
} from '../../utils/helpers';
import { ISLANDS_CONFIG, PAYMENT_METHODS, PRODUCTS_LIST } from '../../utils/constants';
import { ALL_WIZARD_STEPS, ItemStep, WizardSidebar, SumRow } from './VerifyShared';

// ══════════════════════════════════════════════
// FORMULARIO: Turno individual (verificación paso a paso)
// ══════════════════════════════════════════════
const VerifyForm = ({
  verifyTarget, setVerifyTarget, setCurrentPage,
  addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
}) => {
  const { shift, editingId } = verifyTarget;
  const existing = editingId ? verifiedReports.find(r => r.id === editingId) : null;
  const island = ISLANDS_CONFIG.find(i => i.id.toString() === shift.island);
  const availableProducts = island?.isGLP ? PRODUCTS_LIST : PRODUCTS_LIST.filter(p => p !== 'GLP');

  const [items, setItems] = useState(() => ({
    payments:   (shift.payments   || []).map((p, i) => ({ ...p, _id: i, verified: existing?.items?.payments?.[i]?.verified   ?? null })),
    credits:    (shift.credits    || []).map((c, i) => ({ ...c, _id: i, verified: existing?.items?.credits?.[i]?.verified    ?? null })),
    promotions: (shift.promotions || []).map((p, i) => ({ ...p, _id: i, verified: existing?.items?.promotions?.[i]?.verified ?? null })),
    discounts:  (shift.discounts  || []).map((d, i) => ({ ...d, _id: i, verified: existing?.items?.discounts?.[i]?.verified  ?? null })),
  }));
  const [editedExpenses,   setEditedExpenses]   = useState(() => JSON.parse(JSON.stringify(shift.expenses   || [])));
  const [editedMeters,     setEditedMeters]     = useState(() => JSON.parse(JSON.stringify(shift.meters     || {})));
  const [editedDeliveries, setEditedDeliveries] = useState(() => JSON.parse(JSON.stringify(shift.deliveries || [])));
  const [cashReceived, setCashReceived] = useState(existing?.cashReceived?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [stepIdx, setStepIdx] = useState(0);

  const editedShift = useMemo(() => ({
    ...shift,
    payments:   items.payments.map(  ({ _id, verified, ...r }) => r),
    credits:    items.credits.map(   ({ _id, verified, ...r }) => r),
    promotions: items.promotions.map(({ _id, verified, ...r }) => r),
    discounts:  items.discounts.map( ({ _id, verified, ...r }) => r),
    expenses: editedExpenses, meters: editedMeters, deliveries: editedDeliveries,
  }), [shift, items, editedExpenses, editedMeters, editedDeliveries]);

  const hasEdits       = useMemo(() => JSON.stringify(editedShift) !== JSON.stringify(shift), [editedShift, shift]);
  const balance        = useMemo(() => calcShiftBalance(editedShift, prices), [editedShift, prices]);
  const salesByProduct = useMemo(() => calcSalesByProduct(editedShift, prices), [editedShift, prices]);

  const toggle = (section, id) =>
    setItems(prev => ({
      ...prev,
      [section]: prev[section].map(item =>
        item._id === id ? { ...item, verified: item.verified === null ? true : item.verified === true ? false : null } : item
      ),
    }));

  const toggleAll = (section) =>
    setItems(prev => ({ ...prev, [section]: prev[section].map(item => ({ ...item, verified: true })) }));

  const updateItemField = (section, id, field, val) =>
    setItems(prev => ({ ...prev, [section]: prev[section].map(item => item._id === id ? { ...item, [field]: val } : item) }));

  const verifiedPayAmt   = items.payments.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.amount)  || 0), 0);
  const verifiedCredAmt  = items.credits.filter(c => c.verified === true).reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);
  const verifiedPromoAmt = items.promotions.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0);
  const verifiedDiscAmt  = items.discounts.filter(d => d.verified === true).reduce((s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)), 0);
  const totalExpensesAmt = editedExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const runningCash      = balance.totalSales - verifiedPayAmt - verifiedCredAmt - verifiedPromoAmt - verifiedDiscAmt - totalExpensesAmt;
  const expectedCash     = balance.totalSales - balance.totalPayments - balance.totalCredits - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
  const cashNum          = parseFloat(cashReceived) || 0;
  const cashDiff         = cashNum - expectedCash;

  const totalGallons = useMemo(() => Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0), [salesByProduct]);
  const lentGallons  = useMemo(() => {
    const cred = items.credits.reduce((s, c) => s + (parseFloat(c.gallons) || 0), 0);
    return cred + items.promotions.reduce((s, p) => s + (parseFloat(p.gallons) || 0), 0);
  }, [items.credits, items.promotions]);

  const allItems     = [...items.payments, ...items.credits, ...items.promotions, ...items.discounts];
  const checkedItems = allItems.filter(i => i.verified !== null).length;
  const totalItems   = allItems.length;

  const activeSteps = useMemo(() => ALL_WIZARD_STEPS.filter(s => {
    if (s.id === 'payments')   return items.payments.length > 0;
    if (s.id === 'credits')    return items.credits.length > 0;
    if (s.id === 'promotions') return items.promotions.length > 0;
    if (s.id === 'discounts')  return items.discounts.length > 0;
    return true;
  }), []); // eslint-disable-line

  const currentStep = activeSteps[stepIdx] || activeSteps[0];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === activeSteps.length - 1;

  const handleSave = () => {
    if (hasEdits) updateShift(shift.id, () => editedShift);
    const report = {
      id: existing?.id || Date.now(), type: 'shift', shiftId: shift.id,
      date: editedShift.date, worker: editedShift.worker, island: editedShift.island,
      shift: editedShift.shift, verifiedAt: new Date().toISOString(),
      items, cashReceived: cashNum, notes, totalSales: balance.totalSales,
      totalGallons, lentGallons, collectedGallons: totalGallons - lentGallons,
      checkedItems, totalItems, corrected: hasEdits,
    };
    existing ? updateVerifiedReport(existing.id, () => report) : addVerifiedReport(report);
    setVerifyTarget(null);
    setCurrentPage('verified');
  };
  const handleCancel = () => { setVerifyTarget(null); setCurrentPage('reports'); };

  // Navegación compacta para el sidebar
  const navButtons = (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <Btn variant="ghost" style={{ flex: 1, padding: '10px 8px', fontSize: 13 }}
          onClick={isFirst ? handleCancel : () => setStepIdx(i => i - 1)}>
          {isFirst ? '← Salir' : '← Ant.'}
        </Btn>
        {isLast ? (
          <Btn variant="success" style={{ flex: 1, padding: '10px 6px', fontSize: 12, fontWeight: 800 }} onClick={handleSave}>
            ✅ {hasEdits ? 'Corregir' : 'Guardar'}
          </Btn>
        ) : (
          <Btn style={{ flex: 1, padding: '10px 8px', fontSize: 13 }} onClick={() => setStepIdx(i => i + 1)}>Sig. →</Btn>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#475569' }}>
        Paso {stepIdx + 1} / {activeSteps.length}
      </div>
    </div>
  );

  return (
    <div>
      {/* Cabecera */}
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {existing ? '✏️ Editar Verificación' : '🔍 Verificar Reporte'}
          </h2>
          <p className="text-muted">{shift.worker} · {island?.name} · {shift.shift} · {shift.date}</p>
        </div>
        <Btn variant="ghost" onClick={handleCancel}>← Cancelar</Btn>
      </div>

      {/* Indicador de pasos */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {activeSteps.map((step, i) => (
          <div key={step.id} onClick={() => setStepIdx(i)} style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
            transition: 'all 0.15s',
            background: i === stepIdx ? '#6366f1' : i < stepIdx ? 'rgba(52,211,153,0.12)' : '#1e293b',
            color:      i === stepIdx ? '#fff'    : i < stepIdx ? '#34d399'                : '#475569',
            border: `2px solid ${i === stepIdx ? '#818cf8' : i < stepIdx ? '#34d399' : 'transparent'}`,
          }}>
            <span>{i < stepIdx ? '✓' : step.icon}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Contenido + Sidebar */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Área de contenido con scroll propio */}
        <div style={{ flex: '1 1 400px', minWidth: 0, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>

          {/* Paso: Contómetros */}
          {currentStep.id === 'meters' && (
            <Card>
              <div className="card-header">⛽ Revisión de Contómetros</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Revisa que las lecturas finales coincidan con los contómetros físicos. Si hay un error, corrígelo aquí.
              </p>
              {island?.faces?.map(face => (
                <div key={face.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 10 }}>{face.label}</div>
                  {face.dispensers.map(d => {
                    const m = editedMeters[d.key] || { start: 0, end: null };
                    const gal = Math.max(0, parseFloat(m.end || 0) - parseFloat(m.start || 0));
                    return (
                      <div key={d.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 8, flexWrap: 'wrap' }}>
                        <ProductTag product={d.product} />
                        <span style={{ fontSize: 12, color: '#64748b', width: 56 }}>{d.label}</span>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>
                          Inicio: <strong style={{ color: '#e2e8f0' }}>{parseFloat(m.start || 0).toFixed(3)}</strong>
                        </span>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>Final:</span>
                        <input
                          className="input-field" type="number" step="0.001" style={{ width: 140, textAlign: 'right' }}
                          placeholder="Lectura final" value={m.end !== null && m.end !== '' ? m.end : ''}
                          onChange={ev => setEditedMeters(prev => ({ ...prev, [d.key]: { ...(prev[d.key] || { start: 0 }), end: ev.target.value } }))}
                        />
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatGallons(gal)}</div>
                          <div style={{ fontWeight: 800, color: '#34d399', fontSize: 15 }}>{formatCurrency(gal * (prices[d.product] || 0))}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 12, padding: '14px 20px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#a5b4fc' }}>TOTAL VENTA (contómetros)</span>
                <span style={{ fontWeight: 900, fontSize: 24, color: '#818cf8' }}>{formatCurrency(balance.totalSales)}</span>
              </div>
            </Card>
          )}

          {/* Paso: Pagos */}
          {currentStep.id === 'payments' && (
            <ItemStep
              title="💳 Pagos Electrónicos"
              description="Confirma cada pago. Los pagos ✅ se descuentan del efectivo. Puedes corregir el método o el monto si hay error."
              items={items.payments} headers={['Método', 'Referencia', 'Factura', 'Monto']}
              onToggle={id => toggle('payments', id)} verifiedAmt={verifiedPayAmt}
              onToggleAll={() => toggleAll('payments')}
              renderRow={p => [
                <select
                  className="input-field" style={{ width: 110, fontSize: 12 }}
                  value={p.method || ''}
                  onChange={ev => updateItemField('payments', p._id, 'method', ev.target.value)}
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>,
                <input className="input-field" style={{ width: 120 }} value={p.reference || ''} onChange={ev => updateItemField('payments', p._id, 'reference', ev.target.value)} />,
                <input className="input-field" style={{ width: 120 }} value={p.invoice || ''} onChange={ev => updateItemField('payments', p._id, 'invoice', ev.target.value)} />,
                <input className="input-field" type="number" step="0.01" style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
                  value={p.amount} onChange={ev => updateItemField('payments', p._id, 'amount', ev.target.value)} />,
              ]}
            />
          )}

          {/* Paso: Créditos */}
          {currentStep.id === 'credits' && (
            <ItemStep
              title="📋 Créditos"
              description="Verifica cada crédito. Los confirmados ✅ se descuentan del efectivo. Puedes corregir el producto o los galones si hay error."
              items={items.credits} headers={['Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
              onToggle={id => toggle('credits', id)} verifiedAmt={verifiedCredAmt}
              onToggleAll={() => toggleAll('credits')}
              renderRow={c => [
                <select
                  className="input-field" style={{ width: 90, fontSize: 12 }}
                  value={c.product || ''}
                  onChange={ev => updateItemField('credits', c._id, 'product', ev.target.value)}
                >
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>,
                <input className="input-field" style={{ width: 130 }} value={c.client || ''} onChange={ev => updateItemField('credits', c._id, 'client', ev.target.value)} />,
                <input className="input-field" style={{ width: 120 }} value={c.voucher || ''} onChange={ev => updateItemField('credits', c._id, 'voucher', ev.target.value)} />,
                <input className="input-field" type="number" step="0.001" style={{ width: 100, textAlign: 'right', fontWeight: 700 }}
                  value={c.gallons} onChange={ev => updateItemField('credits', c._id, 'gallons', ev.target.value)} />,
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}</span>,
              ]}
            />
          )}

          {/* Paso: Promociones */}
          {currentStep.id === 'promotions' && (
            <ItemStep
              title="🎁 Promociones"
              description="Verifica las promociones aplicadas. Las confirmadas ✅ se descuentan del efectivo."
              items={items.promotions} headers={['Producto', 'DNI / Placa', 'Galones', 'Monto']}
              onToggle={id => toggle('promotions', id)} verifiedAmt={verifiedPromoAmt}
              onToggleAll={() => toggleAll('promotions')}
              renderRow={p => [
                <ProductTag product={p.product} />,
                <input className="input-field" style={{ width: 120 }} value={p.dniPlate || ''} onChange={ev => updateItemField('promotions', p._id, 'dniPlate', ev.target.value)} />,
                <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={p.gallons} onChange={ev => updateItemField('promotions', p._id, 'gallons', ev.target.value)} />,
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency((parseFloat(p.gallons) || 0) * (prices[p.product] || 0))}</span>,
              ]}
            />
          )}

          {/* Paso: Descuentos */}
          {currentStep.id === 'discounts' && (
            <ItemStep
              title="🏷️ Descuentos"
              description="Verifica los descuentos aplicados. Los confirmados ✅ se descuentan del efectivo esperado."
              items={items.discounts} headers={['Producto', 'Cliente', 'Galones', 'Precio', 'Monto']}
              onToggle={id => toggle('discounts', id)} verifiedAmt={verifiedDiscAmt}
              onToggleAll={() => toggleAll('discounts')}
              renderRow={d => [
                <select
                  className="input-field" style={{ width: 90, fontSize: 12 }}
                  value={d.product || ''}
                  onChange={ev => updateItemField('discounts', d._id, 'product', ev.target.value)}
                >
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>,
                <input className="input-field" style={{ width: 130 }} value={d.client || ''} onChange={ev => updateItemField('discounts', d._id, 'client', ev.target.value)} />,
                <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={d.gallons} onChange={ev => updateItemField('discounts', d._id, 'gallons', ev.target.value)} />,
                <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={d.price} onChange={ev => updateItemField('discounts', d._id, 'price', ev.target.value)} />,
                <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)))}</span>,
              ]}
            />
          )}

          {/* Paso: Gastos */}
          {currentStep.id === 'expenses' && (
            <Card>
              <div className="card-header">🧾 Gastos del Turno</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Agrega o corrige los gastos. Se descuentan del efectivo a entregar.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>Lista de gastos</span>
                <Btn className="btn-sm" onClick={() => setEditedExpenses(prev => [...prev, { detail: '', amount: 0 }])}>+ Agregar gasto</Btn>
              </div>
              {editedExpenses.length === 0 && (
                <p style={{ fontSize: 13, color: '#475569', padding: '12px 0' }}>Sin gastos. Toca "+ Agregar gasto" para añadir uno.</p>
              )}
              {editedExpenses.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input className="input-field" style={{ flex: 1 }} placeholder="Detalle del gasto" value={e.detail}
                    onChange={ev => setEditedExpenses(prev => prev.map((x, j) => j === i ? { ...x, detail: ev.target.value } : x))} />
                  <input className="input-field" type="number" step="0.01" style={{ width: 120 }} placeholder="0.00" value={e.amount}
                    onChange={ev => setEditedExpenses(prev => prev.map((x, j) => j === i ? { ...x, amount: ev.target.value } : x))} />
                  <Btn variant="danger" className="btn-icon" onClick={() => setEditedExpenses(prev => prev.filter((_, j) => j !== i))}>🗑️</Btn>
                </div>
              ))}
              {editedExpenses.length > 0 && (
                <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginTop: 14 }}>
                  <div className="flex-between">
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Total gastos</span>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: 16 }}>{formatCurrency(totalExpensesAmt)}</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Paso: Resumen */}
          {currentStep.id === 'summary' && (
            <div>
              <Card style={{ marginBottom: 12 }}>
                <div className="card-header">⛽ Resumen de Ventas</div>
                {Object.entries(salesByProduct).map(([prod, data]) => (
                  <div key={prod} className="flex-between" style={{ padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
                    <ProductTag product={prod} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{formatGallons(data.gallons)}</span>
                    <span style={{ fontWeight: 700, color: '#34d399' }}>{formatCurrency(data.amount)}</span>
                  </div>
                ))}
                <div className="flex-between" style={{ marginTop: 10, paddingTop: 10, borderTop: '2px solid #334155' }}>
                  <span style={{ fontWeight: 800 }}>TOTAL VENTA</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: '#6366f1' }}>{formatCurrency(balance.totalSales)}</span>
                </div>
              </Card>

              <Card style={{ marginBottom: 12 }}>
                <div className="card-header">🧮 Desglose — Efectivo Esperado</div>
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                  <SumRow label="Total venta" value={formatCurrency(balance.totalSales)} />
                  {balance.totalPayments > 0  && <SumRow label={`− Pagos (${items.payments.length})`}    value={`−${formatCurrency(balance.totalPayments)}`} />}
                  {balance.totalCredits > 0   && <SumRow label={`− Créditos (${items.credits.length})`}  value={`−${formatCurrency(balance.totalCredits)}`} />}
                  {balance.totalPromos > 0    && <SumRow label={`− Promos (${items.promotions.length})`} value={`−${formatCurrency(balance.totalPromos)}`} />}
                  {balance.totalDiscounts > 0 && <SumRow label={`− Descuentos (${items.discounts.length})`} value={`−${formatCurrency(balance.totalDiscounts)}`} />}
                  {balance.totalExpenses > 0  && <SumRow label="− Gastos" value={`−${formatCurrency(balance.totalExpenses)}`} />}
                  <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 10 }}>
                    <div className="flex-between">
                      <span style={{ fontWeight: 800, fontSize: 15 }}>EFECTIVO ESPERADO</span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: '#6366f1' }}>{formatCurrency(expectedCash)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="card-header" style={{ margin: 0 }}>💰 Entregas del Grifero</div>
                  <Btn className="btn-sm" onClick={() => setEditedDeliveries(prev => [...prev, ''])}>+ Agregar</Btn>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  Corrige si el grifero contó mal, o añade entregas faltantes.
                </p>
                {editedDeliveries.length === 0 && (
                  <p style={{ fontSize: 13, color: '#475569', padding: '6px 0' }}>Sin entregas registradas.</p>
                )}
                {editedDeliveries.map((amt, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8', minWidth: 80 }}>Entrega #{j + 1}</span>
                    <input
                      className="input-field" type="number" step="0.01"
                      style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}
                      placeholder="0.00" value={amt}
                      onChange={ev => setEditedDeliveries(prev => prev.map((v, k) => k === j ? ev.target.value : v))}
                    />
                    <Btn variant="danger" className="btn-icon"
                      onClick={() => setEditedDeliveries(prev => prev.filter((_, k) => k !== j))}>🗑️</Btn>
                  </div>
                ))}
                {editedDeliveries.length > 0 && (
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginTop: 8 }}>
                    <div className="flex-between">
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Total entregado</span>
                      <span style={{ fontWeight: 900, fontSize: 18, color: '#34d399' }}>
                        {formatCurrency(editedDeliveries.reduce((s, v) => s + (parseFloat(v) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <Card style={{ marginBottom: 12 }}>
                <div className="card-header">💵 Dinero Contado por el Administrador</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Ingresa el total de efectivo que contaste físicamente.</p>
                <input className="input-field" type="number" step="0.01" placeholder="0.00"
                  value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                  style={{ fontSize: 24, fontWeight: 900, textAlign: 'right', marginBottom: 14 }} />
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                  <SumRow label="Efectivo esperado" value={formatCurrency(expectedCash)} />
                  <SumRow label="Efectivo contado"  value={formatCurrency(cashNum)} />
                  <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 10 }}>
                    <div className="flex-between">
                      <span style={{ fontWeight: 800, fontSize: 15 }}>Diferencia de caja</span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: Math.abs(cashDiff) < 0.01 ? '#34d399' : cashDiff > 0 ? '#6366f1' : '#ef4444' }}>
                        {Math.abs(cashDiff) < 0.01 ? '✅ Todo cuadra' : formatSignedCurrency(cashDiff)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="card-header">📝 Observaciones</div>
                <textarea className="input-field" rows={3} style={{ resize: 'vertical' }}
                  placeholder="Escribe aquí cualquier observación sobre este turno..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar: efectivo estimado + navegación */}
        <WizardSidebar
          totalSales={balance.totalSales} runningCash={runningCash}
          checkedItems={checkedItems} totalItems={totalItems} hasEdits={hasEdits}
          deductions={[
            { label: '− Pagos ✅',      amt: verifiedPayAmt,   color: '#34d399' },
            { label: '− Créditos ✅',   amt: verifiedCredAmt,  color: '#34d399' },
            { label: '− Promos ✅',     amt: verifiedPromoAmt, color: '#34d399' },
            { label: '− Descuentos ✅', amt: verifiedDiscAmt,  color: '#34d399' },
            { label: '− Gastos',        amt: totalExpensesAmt, color: '#ef4444' },
          ]}
        >
          {navButtons}
        </WizardSidebar>
      </div>
    </div>
  );
};

export default VerifyForm;
