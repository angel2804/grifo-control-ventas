import React, { useState, useMemo } from 'react';
import { Card, Btn, ProductTag } from '../UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency,
  calcShiftBalance, calcSalesByProduct,
} from '../../utils/helpers';
import { ISLANDS_CONFIG, PAYMENT_METHODS, PRODUCTS_LIST } from '../../utils/constants';
import {
  ALL_WIZARD_STEPS, SHIFT_ORDER, SHIFT_ICON,
  ItemStep, WizardSidebar, SumRow, GalRow, WBadge,
} from './VerifyShared';

// ══════════════════════════════════════════════
// FORMULARIO: Día completo (múltiples turnos)
// ══════════════════════════════════════════════
const VerifyDayForm = ({
  verifyTarget, setVerifyTarget, setCurrentPage,
  addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
}) => {
  const { shifts, date, editingId } = verifyTarget;
  const existing = editingId ? verifiedReports.find(r => r.id === editingId) : null;
  const dayIsland = ISLANDS_CONFIG.find(i => i.id.toString() === shifts[0]?.island);
  const availableProducts = dayIsland?.isGLP ? PRODUCTS_LIST : PRODUCTS_LIST.filter(p => p !== 'GLP');

  const [groupStates, setGroupStates] = useState(() => {
    const groupMap = {};
    shifts.forEach((s, i) => {
      if (!groupMap[s.shift]) groupMap[s.shift] = [];
      groupMap[s.shift].push(i);
    });
    const groups = {};
    Object.entries(groupMap).forEach(([shiftName, indices]) => {
      const cashReceived = existing?.shiftGroupCash?.[shiftName]?.toString() ?? '';
      const items = { payments: [], credits: [], promotions: [], discounts: [] };
      indices.forEach(i => {
        const s = shifts[i];
        const ex_sr = existing?.shiftReports?.find(sr => sr.shiftId === s.id);
        items.payments.push(...(s.payments || []).map((p, j) => ({
          ...p, _id: `${i}_${j}`, _shiftIdx: i, _worker: s.worker,
          verified: ex_sr?.items?.payments?.[j]?.verified ?? null,
        })));
        items.credits.push(...(s.credits || []).map((c, j) => ({
          ...c, _id: `${i}_${j}`, _shiftIdx: i, _worker: s.worker,
          verified: ex_sr?.items?.credits?.[j]?.verified ?? null,
        })));
        items.promotions.push(...(s.promotions || []).map((p, j) => ({
          ...p, _id: `${i}_${j}`, _shiftIdx: i, _worker: s.worker,
          verified: ex_sr?.items?.promotions?.[j]?.verified ?? null,
        })));
        items.discounts.push(...(s.discounts || []).map((d, j) => ({
          ...d, _id: `${i}_${j}`, _shiftIdx: i, _worker: s.worker,
          verified: ex_sr?.items?.discounts?.[j]?.verified ?? null,
        })));
      });
      groups[shiftName] = { cashReceived, items };
    });
    return groups;
  });

  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [editedShiftsData, setEditedShiftsData] = useState(() =>
    shifts.map(s => ({
      expenses:   JSON.parse(JSON.stringify(s.expenses   || [])),
      meters:     JSON.parse(JSON.stringify(s.meters     || {})),
      deliveries: JSON.parse(JSON.stringify(s.deliveries || [])),
    }))
  );
  const [stepIdx, setStepIdx] = useState(0);

  const updateGroupItemField = (shiftName, section, id, field, val) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        items: {
          ...prev[shiftName].items,
          [section]: prev[shiftName].items[section].map(item =>
            item._id === id ? { ...item, [field]: val } : item
          ),
        },
      },
    }));
  };

  const effectiveShifts = useMemo(() =>
    shifts.map((s, i) => {
      const gs = groupStates[s.shift];
      const ed = editedShiftsData[i];
      return {
        ...s,
        payments:   gs.items.payments.filter(p => p._shiftIdx === i).map(({ _id, _shiftIdx, _worker, verified, ...r }) => r),
        credits:    gs.items.credits.filter(c => c._shiftIdx === i).map(({ _id, _shiftIdx, _worker, verified, ...r }) => r),
        promotions: gs.items.promotions.filter(p => p._shiftIdx === i).map(({ _id, _shiftIdx, _worker, verified, ...r }) => r),
        discounts:  gs.items.discounts.filter(d => d._shiftIdx === i).map(({ _id, _shiftIdx, _worker, verified, ...r }) => r),
        expenses:   ed.expenses,
        meters:     ed.meters,
        deliveries: ed.deliveries,
      };
    }),
    [shifts, groupStates, editedShiftsData]
  );

  const toggleGroupItem = (shiftName, section, id) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        items: {
          ...prev[shiftName].items,
          [section]: prev[shiftName].items[section].map(item =>
            item._id === id
              ? { ...item, verified: item.verified === null ? true : item.verified === true ? false : null }
              : item
          ),
        },
      },
    }));
  };

  const toggleAllGroup = (shiftName, section) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        items: {
          ...prev[shiftName].items,
          [section]: prev[shiftName].items[section].map(item => ({ ...item, verified: true })),
        },
      },
    }));
  };

  const setGroupCash = (shiftName, value) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: { ...prev[shiftName], cashReceived: value },
    }));
  };

  const shiftBalances = useMemo(() =>
    effectiveShifts.map(s => ({
      balance: calcShiftBalance(s, prices),
      salesByProduct: calcSalesByProduct(s, prices),
    })),
    [effectiveShifts, prices]
  );

  const totalSalesAll = shiftBalances.reduce((sum, { balance }) => sum + balance.totalSales, 0);
  const totalGallonsAll = shiftBalances.reduce((sum, { salesByProduct }) =>
    sum + Object.values(salesByProduct).reduce((s2, v) => s2 + v.gallons, 0), 0);
  const totalExpectedCash = shiftBalances.reduce((sum, { balance }) =>
    sum + balance.totalSales - balance.totalPayments - balance.totalCredits
    - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses, 0);
  const totalCashReceived = Object.values(groupStates).reduce(
    (sum, gs) => sum + (parseFloat(gs.cashReceived) || 0), 0
  );
  const totalLentGallons = useMemo(() =>
    Object.values(groupStates).reduce((sum, gs) => {
      const cred  = gs.items.credits.reduce((s2, c) => s2 + (parseFloat(c.gallons) || 0), 0);
      const promo = gs.items.promotions.reduce((s2, p) => s2 + (parseFloat(p.gallons) || 0), 0);
      return sum + cred + promo;
    }, 0),
    [groupStates]
  );
  const cashDiff = totalCashReceived - totalExpectedCash;

  const shiftGroups = useMemo(() => {
    const map = {};
    shifts.forEach((s, i) => {
      if (!map[s.shift]) map[s.shift] = [];
      map[s.shift].push(i);
    });
    return Object.entries(map)
      .sort(([a], [b]) => (SHIFT_ORDER[a] ?? 99) - (SHIFT_ORDER[b] ?? 99))
      .map(([shiftName, indices]) => ({ shiftName, indices }));
  }, [shifts]);

  // Totales verificados para sidebar
  const dayVerifiedPayAmt = Object.values(groupStates).reduce((sum, gs) =>
    sum + gs.items.payments.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0), 0);
  const dayVerifiedCredAmt = Object.values(groupStates).reduce((sum, gs) =>
    sum + gs.items.credits.filter(c => c.verified === true).reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0), 0);
  const dayVerifiedPromoAmt = Object.values(groupStates).reduce((sum, gs) =>
    sum + gs.items.promotions.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0), 0);
  const dayVerifiedDiscAmt = Object.values(groupStates).reduce((sum, gs) =>
    sum + gs.items.discounts.filter(d => d.verified === true).reduce((s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)), 0), 0);
  const dayTotalExpenses = editedShiftsData.reduce((sum, ed) =>
    sum + ed.expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), 0);
  const dayRunningCash = totalSalesAll - dayVerifiedPayAmt - dayVerifiedCredAmt - dayVerifiedPromoAmt - dayVerifiedDiscAmt - dayTotalExpenses;

  const allItems = Object.values(groupStates).flatMap(gs =>
    [...gs.items.payments, ...gs.items.credits, ...gs.items.promotions, ...gs.items.discounts]);
  const checkedItems = allItems.filter(i => i.verified !== null).length;
  const totalItems = allItems.length;

  const hasEdits = useMemo(() =>
    effectiveShifts.some((eff, i) => JSON.stringify(eff) !== JSON.stringify(shifts[i])),
    [effectiveShifts, shifts]
  );

  const activeSteps = useMemo(() => ALL_WIZARD_STEPS.filter(s => {
    if (s.id === 'payments')   return Object.values(groupStates).some(gs => gs.items.payments.length > 0);
    if (s.id === 'credits')    return Object.values(groupStates).some(gs => gs.items.credits.length > 0);
    if (s.id === 'promotions') return Object.values(groupStates).some(gs => gs.items.promotions.length > 0);
    if (s.id === 'discounts')  return Object.values(groupStates).some(gs => gs.items.discounts.length > 0);
    return true;
  }), []); // eslint-disable-line

  const currentStep = activeSteps[stepIdx] || activeSteps[0];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === activeSteps.length - 1;

  const handleSave = () => {
    effectiveShifts.forEach((eff, i) => {
      const orig = shifts[i];
      const gs = groupStates[orig.shift];
      const groupCashNum = parseFloat(gs.cashReceived) || 0;
      if (JSON.stringify(eff) !== JSON.stringify(orig) || groupCashNum > 0) {
        updateShift(orig.id, () => ({ ...eff, adminCashReceived: groupCashNum }));
      }
    });

    const shiftReports = effectiveShifts.map((eff, i) => {
      const s = shifts[i];
      const gs = groupStates[s.shift];
      const groupCashNum = parseFloat(gs.cashReceived) || 0;
      const shiftItems = {
        payments:   gs.items.payments.filter(p => p._shiftIdx === i).map(({ _id, _shiftIdx, _worker, ...rest }) => rest),
        credits:    gs.items.credits.filter(c => c._shiftIdx === i).map(({ _id, _shiftIdx, _worker, ...rest }) => rest),
        promotions: gs.items.promotions.filter(p => p._shiftIdx === i).map(({ _id, _shiftIdx, _worker, ...rest }) => rest),
        discounts:  gs.items.discounts.filter(d => d._shiftIdx === i).map(({ _id, _shiftIdx, _worker, ...rest }) => rest),
      };
      const { balance, salesByProduct } = shiftBalances[i];
      const galTurno = Object.values(salesByProduct).reduce((sum, v) => sum + v.gallons, 0);
      const lent = shiftItems.credits.reduce((sum, c) => sum + (parseFloat(c.gallons) || 0), 0)
        + shiftItems.promotions.reduce((sum, p) => sum + (parseFloat(p.gallons) || 0), 0);
      const allShiftItems = [...shiftItems.payments, ...shiftItems.credits, ...shiftItems.promotions, ...shiftItems.discounts];
      return {
        shiftId: s.id, worker: s.worker, island: s.island, shift: s.shift,
        items: shiftItems,
        cashReceived: groupCashNum,
        totalSales: balance.totalSales,
        totalGallons: galTurno, lentGallons: lent, collectedGallons: galTurno - lent,
        checkedItems: allShiftItems.filter(it => it.verified !== null).length,
        totalItems: allShiftItems.length,
        corrected: JSON.stringify(eff) !== JSON.stringify(shifts[i]),
      };
    });

    const shiftGroupCash = Object.fromEntries(
      Object.entries(groupStates).map(([name, gs]) => [name, parseFloat(gs.cashReceived) || 0])
    );
    const report = {
      id: existing?.id || Date.now(),
      type: 'day', date,
      verifiedAt: new Date().toISOString(),
      shiftReports, shiftGroupCash, notes,
      totalSales: totalSalesAll, totalGallons: totalGallonsAll,
      totalCashReceived, lentGallons: totalLentGallons,
      collectedGallons: totalGallonsAll - totalLentGallons,
      checkedItems, totalItems,
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
            {existing ? 'Editar Verificación del Día' : 'Verificar Día Completo'}
          </h2>
          <p className="text-muted">{date} &middot; {shifts.length} turno{shifts.length !== 1 ? 's' : ''} para verificar</p>
        </div>
        <Btn variant="ghost" onClick={handleCancel}>&larr; Cancelar</Btn>
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
            <div>
              {shiftGroups.map(({ shiftName, indices }) => (
                <Card key={shiftName} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{shiftName}</span>
                  </div>
                  {indices.map(idx => {
                    const s = shifts[idx];
                    const island = ISLANDS_CONFIG.find(il => il.id.toString() === s.island);
                    const ed = editedShiftsData[idx];
                    const hasEditsShift = JSON.stringify(effectiveShifts[idx]) !== JSON.stringify(s);
                    return (
                      <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{s.worker}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>&middot; {island?.name}</span>
                          {hasEditsShift && (
                            <span style={{ fontSize: 10, background: '#92400e', color: '#fde68a', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              CORREGIDO
                            </span>
                          )}
                        </div>
                        {island?.faces?.map(face => (
                          <div key={face.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 6 }}>{face.label}</div>
                            {face.dispensers.map(d => {
                              const m = ed.meters[d.key] || { start: 0, end: null };
                              const gal = Math.max(0, parseFloat(m.end || 0) - parseFloat(m.start || 0));
                              return (
                                <div key={d.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: '#0f172a', marginBottom: 6, flexWrap: 'wrap' }}>
                                  <ProductTag product={d.product} />
                                  <span style={{ fontSize: 11, color: '#64748b', width: 48 }}>{d.label}</span>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Inicio: <strong style={{ color: '#e2e8f0' }}>{parseFloat(m.start || 0).toFixed(3)}</strong></span>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Final:</span>
                                  <input
                                    className="input-field" type="number" step="0.001" style={{ width: 130, textAlign: 'right' }}
                                    placeholder="Lectura final" value={m.end !== null && m.end !== '' ? m.end : ''}
                                    onChange={ev => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                      ? { ...x, meters: { ...x.meters, [d.key]: { ...(x.meters[d.key] || { start: 0 }), end: ev.target.value } } }
                                      : x))}
                                  />
                                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatGallons(gal)}</div>
                                    <div style={{ fontWeight: 700, color: '#34d399', fontSize: 13 }}>{formatCurrency(gal * (prices[d.product] || 0))}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#a5b4fc' }}>VENTA {s.worker.toUpperCase()}</span>
                          <span style={{ fontWeight: 900, fontSize: 18, color: '#818cf8' }}>{formatCurrency(shiftBalances[idx].balance.totalSales)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#a5b4fc' }}>TOTAL {shiftName.toUpperCase()}</span>
                    <span style={{ fontWeight: 900, fontSize: 20, color: '#818cf8' }}>
                      {formatCurrency(indices.reduce((sum, idx) => sum + shiftBalances[idx].balance.totalSales, 0))}
                    </span>
                  </div>
                </Card>
              ))}
              <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', borderRadius: 14, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #312e81' }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#a5b4fc' }}>TOTAL DÍA</span>
                <span style={{ fontWeight: 900, fontSize: 28, color: '#818cf8' }}>{formatCurrency(totalSalesAll)}</span>
              </div>
            </div>
          )}

          {/* Paso: Pagos */}
          {currentStep.id === 'payments' && (
            <div>
              {shiftGroups.map(({ shiftName }) => {
                const gs = groupStates[shiftName];
                if (!gs || gs.items.payments.length === 0) return null;
                const verifiedAmt = gs.items.payments.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                return (
                  <div key={shiftName} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{shiftName}</span>
                    </div>
                    <ItemStep
                      items={gs.items.payments}
                      headers={['Trabajador', 'Método', 'Referencia', 'Factura', 'Monto']}
                      onToggle={id => toggleGroupItem(shiftName, 'payments', id)}
                      verifiedAmt={verifiedAmt}
                      onToggleAll={() => toggleAllGroup(shiftName, 'payments')}
                      renderRow={p => [
                        <WBadge worker={p._worker} />,
                        <select
                          className="input-field" style={{ width: 110, fontSize: 12 }}
                          value={p.method || ''}
                          onChange={ev => updateGroupItemField(shiftName, 'payments', p._id, 'method', ev.target.value)}
                        >
                          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>,
                        <input className="input-field" style={{ width: 120 }} value={p.reference || ''} onChange={ev => updateGroupItemField(shiftName, 'payments', p._id, 'reference', ev.target.value)} />,
                        <input className="input-field" style={{ width: 120 }} value={p.invoice || ''} onChange={ev => updateGroupItemField(shiftName, 'payments', p._id, 'invoice', ev.target.value)} />,
                        <input className="input-field" type="number" step="0.01" style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
                          value={p.amount} onChange={ev => updateGroupItemField(shiftName, 'payments', p._id, 'amount', ev.target.value)} />,
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paso: Créditos */}
          {currentStep.id === 'credits' && (
            <div>
              {shiftGroups.map(({ shiftName }) => {
                const gs = groupStates[shiftName];
                if (!gs || gs.items.credits.length === 0) return null;
                const verifiedAmt = gs.items.credits.filter(c => c.verified === true).reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);
                return (
                  <div key={shiftName} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{shiftName}</span>
                    </div>
                    <ItemStep
                      items={gs.items.credits}
                      headers={['Trabajador', 'Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
                      onToggle={id => toggleGroupItem(shiftName, 'credits', id)}
                      verifiedAmt={verifiedAmt}
                      onToggleAll={() => toggleAllGroup(shiftName, 'credits')}
                      renderRow={c => [
                        <WBadge worker={c._worker} />,
                        <select
                          className="input-field" style={{ width: 90, fontSize: 12 }}
                          value={c.product || ''}
                          onChange={ev => updateGroupItemField(shiftName, 'credits', c._id, 'product', ev.target.value)}
                        >
                          {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>,
                        <input className="input-field" style={{ width: 130 }} value={c.client || ''} onChange={ev => updateGroupItemField(shiftName, 'credits', c._id, 'client', ev.target.value)} />,
                        <input className="input-field" style={{ width: 120 }} value={c.voucher || ''} onChange={ev => updateGroupItemField(shiftName, 'credits', c._id, 'voucher', ev.target.value)} />,
                        <input className="input-field" type="number" step="0.001" style={{ width: 100, textAlign: 'right', fontWeight: 700 }}
                          value={c.gallons} onChange={ev => updateGroupItemField(shiftName, 'credits', c._id, 'gallons', ev.target.value)} />,
                        <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}</span>,
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paso: Promociones */}
          {currentStep.id === 'promotions' && (
            <div>
              {shiftGroups.map(({ shiftName }) => {
                const gs = groupStates[shiftName];
                if (!gs || gs.items.promotions.length === 0) return null;
                const verifiedAmt = gs.items.promotions.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0);
                return (
                  <div key={shiftName} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{shiftName}</span>
                    </div>
                    <ItemStep
                      items={gs.items.promotions}
                      headers={['Trabajador', 'Producto', 'DNI / Placa', 'Galones', 'Monto']}
                      onToggle={id => toggleGroupItem(shiftName, 'promotions', id)}
                      verifiedAmt={verifiedAmt}
                      onToggleAll={() => toggleAllGroup(shiftName, 'promotions')}
                      renderRow={p => [
                        <WBadge worker={p._worker} />,
                        <ProductTag product={p.product} />,
                        <input className="input-field" style={{ width: 120 }} value={p.dniPlate || ''} onChange={ev => updateGroupItemField(shiftName, 'promotions', p._id, 'dniPlate', ev.target.value)} />,
                        <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={p.gallons} onChange={ev => updateGroupItemField(shiftName, 'promotions', p._id, 'gallons', ev.target.value)} />,
                        <span style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency((parseFloat(p.gallons) || 0) * (prices[p.product] || 0))}</span>,
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paso: Descuentos */}
          {currentStep.id === 'discounts' && (
            <div>
              {shiftGroups.map(({ shiftName }) => {
                const gs = groupStates[shiftName];
                if (!gs || gs.items.discounts.length === 0) return null;
                const verifiedAmt = gs.items.discounts.filter(d => d.verified === true).reduce((s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)), 0);
                return (
                  <div key={shiftName} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{shiftName}</span>
                    </div>
                    <ItemStep
                      items={gs.items.discounts}
                      headers={['Trabajador', 'Producto', 'Cliente', 'Galones', 'Precio', 'Monto']}
                      onToggle={id => toggleGroupItem(shiftName, 'discounts', id)}
                      verifiedAmt={verifiedAmt}
                      onToggleAll={() => toggleAllGroup(shiftName, 'discounts')}
                      renderRow={d => [
                        <WBadge worker={d._worker} />,
                        <select
                          className="input-field" style={{ width: 90, fontSize: 12 }}
                          value={d.product || ''}
                          onChange={ev => updateGroupItemField(shiftName, 'discounts', d._id, 'product', ev.target.value)}
                        >
                          {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>,
                        <input className="input-field" style={{ width: 130 }} value={d.client || ''} onChange={ev => updateGroupItemField(shiftName, 'discounts', d._id, 'client', ev.target.value)} />,
                        <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={d.gallons} onChange={ev => updateGroupItemField(shiftName, 'discounts', d._id, 'gallons', ev.target.value)} />,
                        <input className="input-field" type="number" step="0.001" style={{ width: 90, textAlign: 'right', fontWeight: 700 }} value={d.price} onChange={ev => updateGroupItemField(shiftName, 'discounts', d._id, 'price', ev.target.value)} />,
                        <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)))}</span>,
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paso: Gastos */}
          {currentStep.id === 'expenses' && (
            <div>
              {shiftGroups.map(({ shiftName, indices }) => (
                <Card key={shiftName} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{shiftName}</span>
                  </div>
                  {indices.map(idx => {
                    const s = shifts[idx];
                    const island = ISLANDS_CONFIG.find(il => il.id.toString() === s.island);
                    const ed = editedShiftsData[idx];
                    return (
                      <div key={idx} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #1e293b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{s.worker}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>&middot; {island?.name}</span>
                          </div>
                          <Btn className="btn-sm" onClick={() =>
                            setEditedShiftsData(prev => prev.map((x, j) => j === idx
                              ? { ...x, expenses: [...x.expenses, { detail: '', amount: 0 }] }
                              : x))
                          }>+ Gasto</Btn>
                        </div>
                        {ed.expenses.length === 0 && (
                          <p style={{ fontSize: 12, color: '#475569', marginBottom: 0 }}>Sin gastos.</p>
                        )}
                        {ed.expenses.map((e, ei) => (
                          <div key={ei} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                            <input className="input-field" style={{ flex: 1, fontSize: 13 }} placeholder="Detalle"
                              value={e.detail}
                              onChange={ev => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                ? { ...x, expenses: x.expenses.map((ex, k) => k === ei ? { ...ex, detail: ev.target.value } : ex) }
                                : x))}
                            />
                            <input className="input-field" type="number" step="0.01" style={{ width: 100, fontSize: 13 }} placeholder="0.00"
                              value={e.amount}
                              onChange={ev => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                ? { ...x, expenses: x.expenses.map((ex, k) => k === ei ? { ...ex, amount: ev.target.value } : ex) }
                                : x))}
                            />
                            <Btn variant="danger" className="btn-icon" onClick={() =>
                              setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                ? { ...x, expenses: x.expenses.filter((_, k) => k !== ei) }
                                : x))
                            }>🗑️</Btn>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </Card>
              ))}
              {dayTotalExpenses > 0 && (
                <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginTop: 4 }}>
                  <div className="flex-between">
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Total gastos del día</span>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: 16 }}>{formatCurrency(dayTotalExpenses)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso: Resumen */}
          {currentStep.id === 'summary' && (
            <div>
              {shiftGroups.map(({ shiftName, indices }) => {
                const gs = groupStates[shiftName];
                if (!gs) return null;
                const groupSales = indices.reduce((sum, idx) => sum + shiftBalances[idx].balance.totalSales, 0);
                const groupExpected = indices.reduce((sum, idx) => {
                  const { balance } = shiftBalances[idx];
                  return sum + balance.totalSales - balance.totalPayments - balance.totalCredits
                    - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
                }, 0);
                const groupCashNum = parseFloat(gs.cashReceived) || 0;
                const groupCashDiff = groupCashNum - groupExpected;
                const groupDelivTotal = indices.reduce((sum, idx) =>
                  sum + editedShiftsData[idx].deliveries.reduce((s, v) => s + (parseFloat(v) || 0), 0), 0);
                return (
                  <Card key={shiftName} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 20 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{shiftName}</span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{formatCurrency(groupSales)}</span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', letterSpacing: '0.05em' }}>ENTREGAS DE GRIFEROS</span>
                        <span style={{ fontWeight: 900, fontSize: 14, color: '#34d399' }}>{formatCurrency(groupDelivTotal)}</span>
                      </div>
                      {indices.map(idx => {
                        const s = shifts[idx];
                        const island = ISLANDS_CONFIG.find(il => il.id.toString() === s.island)?.name;
                        const delivs = editedShiftsData[idx].deliveries;
                        const workerTotal = delivs.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                        return (
                          <div key={idx} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>
                                {s.worker} <span style={{ fontWeight: 400, color: '#64748b' }}>&middot; {island}</span>
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#34d399' }}>{formatCurrency(workerTotal)}</span>
                                <Btn className="btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                                  onClick={() => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                    ? { ...x, deliveries: [...x.deliveries, ''] } : x))}>
                                  + Entrega
                                </Btn>
                              </div>
                            </div>
                            {delivs.length === 0 && (
                              <span style={{ fontSize: 11, color: '#475569' }}>Sin entregas.</span>
                            )}
                            {delivs.map((amt, di) => (
                              <div key={di} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#64748b', width: 60 }}>#{di + 1}</span>
                                <input
                                  className="input-field" type="number" step="0.01"
                                  style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 700 }}
                                  placeholder="0.00" value={amt}
                                  onChange={ev => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                    ? { ...x, deliveries: x.deliveries.map((v, k) => k === di ? ev.target.value : v) }
                                    : x))}
                                />
                                <Btn variant="danger" className="btn-icon" style={{ padding: '4px 8px', fontSize: 11 }}
                                  onClick={() => setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                    ? { ...x, deliveries: x.deliveries.filter((_, k) => k !== di) }
                                    : x))}>🗑️</Btn>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {groupCashNum > 0 && (
                        <div className="flex-between" style={{ paddingTop: 8, borderTop: '1px solid #334155', marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>vs. lo que contaste</span>
                          <span style={{ fontWeight: 900, fontSize: 13, color: Math.abs(groupCashNum - groupDelivTotal) < 0.01 ? '#34d399' : '#ef4444' }}>
                            {Math.abs(groupCashNum - groupDelivTotal) < 0.01 ? 'Cuadra' : formatSignedCurrency(groupCashNum - groupDelivTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                    <label className="form-label">EFECTIVO CONTADO — {shiftName.toUpperCase()}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <input
                        className="input-field" type="number" step="0.01" placeholder="0.00"
                        value={gs.cashReceived} onChange={e => setGroupCash(shiftName, e.target.value)}
                        style={{ fontSize: 22, fontWeight: 800, textAlign: 'right', maxWidth: 200 }}
                      />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Esperado: <strong style={{ color: '#e2e8f0' }}>{formatCurrency(groupExpected)}</strong></span>
                      {groupCashNum > 0 && (
                        <span style={{ fontWeight: 800, fontSize: 16, color: Math.abs(groupCashDiff) < 0.01 ? '#34d399' : groupCashDiff > 0 ? '#6366f1' : '#ef4444' }}>
                          {Math.abs(groupCashDiff) < 0.01 ? 'Cuadra' : formatSignedCurrency(groupCashDiff)}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}

              {/* Totales del día */}
              <div className="grid-2 mb-2">
                <Card>
                  <div className="card-header">Total del Día</div>
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 12 }}>
                    <SumRow label="Efectivo esperado" value={formatCurrency(totalExpectedCash)} />
                    <SumRow label="Efectivo recibido" value={formatCurrency(totalCashReceived)} />
                    <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
                      <div className="flex-between">
                        <span style={{ fontWeight: 700 }}>Diferencia total</span>
                        <span style={{ fontWeight: 900, fontSize: 20, color: Math.abs(cashDiff) < 0.01 ? '#34d399' : cashDiff > 0 ? '#6366f1' : '#ef4444' }}>
                          {formatSignedCurrency(cashDiff)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="card-header">Galones del Día</div>
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                    <GalRow label="Total vendidos" value={totalGallonsAll} color="#6366f1" />
                    <GalRow label="Prestados" value={totalLentGallons} color="#f59e0b" note="Créditos + promos" />
                    <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
                      <GalRow label="Cobrados" value={totalGallonsAll - totalLentGallons} color="#34d399" bold />
                    </div>
                  </div>
                </Card>
              </div>

              <Card>
                <div className="card-header">Observaciones del Día</div>
                <textarea className="input-field" rows={3}
                  placeholder="Escribe aquí cualquier observación sobre este día..."
                  value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }}
                />
              </Card>
            </div>
          )}

        </div>

        {/* Sidebar: efectivo estimado + navegación */}
        <WizardSidebar
          totalSales={totalSalesAll} runningCash={dayRunningCash}
          checkedItems={checkedItems} totalItems={totalItems} hasEdits={hasEdits}
          deductions={[
            { label: '− Pagos',      amt: dayVerifiedPayAmt,   color: '#34d399' },
            { label: '− Créditos',   amt: dayVerifiedCredAmt,  color: '#34d399' },
            { label: '− Promos',     amt: dayVerifiedPromoAmt, color: '#34d399' },
            { label: '− Descuentos', amt: dayVerifiedDiscAmt,  color: '#34d399' },
            { label: '− Gastos',     amt: dayTotalExpenses,    color: '#ef4444' },
          ]}
        >
          {navButtons}
        </WizardSidebar>
      </div>
    </div>
  );
};

export default VerifyDayForm;
