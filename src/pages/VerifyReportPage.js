import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, ProductTag } from '../components/UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency,
  calcShiftBalance, calcSalesByProduct,
} from '../utils/helpers';
import { ISLANDS_CONFIG } from '../utils/constants';

const SHIFT_ORDER = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };
const SHIFT_ICON  = { 'Mañana': '🌅', 'Tarde': '🌆', 'Noche': '🌙' };

// ============================================
// PÁGINA: Verificar Reporte (Solo Admin)
// Soporta verificación de un turno individual
// o de todos los turnos de un día completo.
// ============================================

const VerifyReportPage = () => {
  const {
    verifyTarget, setVerifyTarget, setCurrentPage,
    addVerifiedReport, updateVerifiedReport,
    verifiedReports, prices, updateShift,
  } = useApp();

  if (!verifyTarget) {
    return (
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Verificar Reporte</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p className="text-muted">
              Selecciona un turno cerrado desde <strong>Reportes</strong> y pulsa
              "Verificar Reporte" para iniciar.
            </p>
            <Btn style={{ marginTop: 16 }} onClick={() => setCurrentPage('reports')}>
              Ir a Reportes
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // Decidir qué formulario mostrar
  const sharedProps = {
    verifyTarget, setVerifyTarget, setCurrentPage,
    addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
  };

  if (verifyTarget.shifts) {
    return <VerifyDayForm {...sharedProps} />;
  }
  return <VerifyForm {...sharedProps} />;
};

// ══════════════════════════════════════════════
// FORMULARIO: Turno individual
// ══════════════════════════════════════════════
const VerifyForm = ({
  verifyTarget, setVerifyTarget, setCurrentPage,
  addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
}) => {
  const { shift, editingId } = verifyTarget;
  const existing = editingId ? verifiedReports.find(r => r.id === editingId) : null;
  const island = ISLANDS_CONFIG.find(i => i.id.toString() === shift.island);

  // ── Estado de verificación + datos editables de ítems ──
  const [items, setItems] = useState(() => ({
    payments:   (shift.payments   || []).map((p, i) => ({ ...p, _id: i, verified: existing?.items?.payments?.[i]?.verified   ?? null })),
    credits:    (shift.credits    || []).map((c, i) => ({ ...c, _id: i, verified: existing?.items?.credits?.[i]?.verified    ?? null })),
    promotions: (shift.promotions || []).map((p, i) => ({ ...p, _id: i, verified: existing?.items?.promotions?.[i]?.verified ?? null })),
    discounts:  (shift.discounts  || []).map((d, i) => ({ ...d, _id: i, verified: existing?.items?.discounts?.[i]?.verified  ?? null })),
  }));

  // ── Estado editable para gastos y contómetros ──
  const [editedExpenses, setEditedExpenses] = useState(() => JSON.parse(JSON.stringify(shift.expenses || [])));
  const [editedMeters,   setEditedMeters]   = useState(() => JSON.parse(JSON.stringify(shift.meters   || {})));
  const [showEditor, setShowEditor] = useState(false);

  // ── Turno efectivo (con correcciones aplicadas) ──
  const editedShift = useMemo(() => ({
    ...shift,
    payments:   items.payments.map(  ({ _id, verified, ...r }) => r),
    credits:    items.credits.map(   ({ _id, verified, ...r }) => r),
    promotions: items.promotions.map(({ _id, verified, ...r }) => r),
    discounts:  items.discounts.map( ({ _id, verified, ...r }) => r),
    expenses:   editedExpenses,
    meters:     editedMeters,
  }), [shift, items, editedExpenses, editedMeters]);

  const hasEdits = useMemo(() =>
    JSON.stringify(editedShift) !== JSON.stringify(shift),
    [editedShift, shift]
  );

  // Balance siempre refleja las correcciones
  const balance = useMemo(() => calcShiftBalance(editedShift, prices), [editedShift, prices]);
  const salesByProduct = useMemo(() => calcSalesByProduct(editedShift, prices), [editedShift, prices]);

  const [cashReceived, setCashReceived] = useState(existing?.cashReceived?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const toggle = (section, id) => {
    setItems(prev => ({
      ...prev,
      [section]: prev[section].map(item =>
        item._id === id
          ? { ...item, verified: item.verified === null ? true : item.verified === true ? false : null }
          : item
      ),
    }));
  };

  // Editar un campo de un ítem (amount, gallons, etc.)
  const updateItemField = (section, id, field, val) => {
    setItems(prev => ({
      ...prev,
      [section]: prev[section].map(item =>
        item._id === id ? { ...item, [field]: val } : item
      ),
    }));
  };

  const totalGallons = useMemo(
    () => Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0),
    [salesByProduct]
  );
  const lentGallons = useMemo(() => {
    const cred  = items.credits.reduce((s, c) => s + (parseFloat(c.gallons) || 0), 0);
    const promo = items.promotions.reduce((s, p) => s + (parseFloat(p.gallons) || 0), 0);
    return cred + promo;
  }, [items.credits, items.promotions]);

  const verifiedPayAmt  = items.payments.filter(p => p.verified === true).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const rejectedPayAmt  = items.payments.filter(p => p.verified === false).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const verifiedCredAmt = items.credits.filter(c => c.verified === true).reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);
  const rejectedCredAmt = items.credits.filter(c => c.verified === false).reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);

  const expectedCash = balance.totalSales - balance.totalPayments - balance.totalCredits
    - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
  const cashNum  = parseFloat(cashReceived) || 0;
  const cashDiff = cashNum - expectedCash;

  const allItems    = [...items.payments, ...items.credits, ...items.promotions, ...items.discounts];
  const checkedItems = allItems.filter(i => i.verified !== null).length;
  const totalItems   = allItems.length;
  const pct = totalItems === 0 ? 100 : Math.round((checkedItems / totalItems) * 100);

  const handleSave = () => {
    // Si hubo correcciones, actualizar el turno en Firestore
    if (hasEdits) {
      updateShift(shift.id, () => editedShift);
    }

    const report = {
      id: existing?.id || Date.now(),
      type: 'shift',
      shiftId: shift.id,
      date: editedShift.date,
      worker: editedShift.worker,
      island: editedShift.island,
      shift: editedShift.shift,
      verifiedAt: new Date().toISOString(),
      items,
      cashReceived: cashNum,
      notes,
      totalSales: balance.totalSales,
      totalGallons,
      lentGallons,
      collectedGallons: totalGallons - lentGallons,
      checkedItems,
      totalItems,
      corrected: hasEdits,
    };
    existing ? updateVerifiedReport(existing.id, () => report) : addVerifiedReport(report);
    setVerifyTarget(null);
    setCurrentPage('verified');
  };

  const handleCancel = () => { setVerifyTarget(null); setCurrentPage('reports'); };

  return (
    <div>
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {existing ? '✏️ Editar Verificación' : '🔍 Verificar Reporte'}
          </h2>
          <p className="text-muted">{shift.worker} · {island?.name} · {shift.shift} · {shift.date}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={handleCancel}>← Cancelar</Btn>
          <Btn variant="success" style={{ padding: '10px 24px', fontWeight: 800 }} onClick={handleSave}>
            ✅ Guardar Verificación
          </Btn>
        </div>
      </div>

      {totalItems > 0 && <ProgressBar checked={checkedItems} total={totalItems} pct={pct} />}

      <div className="grid-2 mb-2">
        <Card>
          <div className="card-header">💵 Efectivo Recibido</div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">INGRESA EL EFECTIVO TOTAL QUE RECIBISTE</label>
            <input
              className="input-field" type="number" step="0.01" placeholder="0.00"
              value={cashReceived} onChange={e => setCashReceived(e.target.value)}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }}
            />
          </div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 12 }}>
            <SumRow label="Efectivo esperado" value={formatCurrency(expectedCash)} />
            <SumRow label="Efectivo recibido" value={formatCurrency(cashNum)} />
            <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
              <div className="flex-between">
                <span style={{ fontWeight: 700 }}>Diferencia de caja</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: Math.abs(cashDiff) < 0.01 ? '#34d399' : cashDiff > 0 ? '#6366f1' : '#ef4444' }}>
                  {formatSignedCurrency(cashDiff)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header">⛽ Resumen de Galones</div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <GalRow label="Total galones vendidos" value={totalGallons} color="#6366f1" />
            <GalRow label="Galones prestados (créditos + promos)" value={lentGallons} color="#f59e0b" note="No cobrados aún" />
            <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
              <GalRow label="Galones cobrados" value={totalGallons - lentGallons} color="#34d399" bold />
            </div>
          </div>
          {Object.entries(salesByProduct).map(([prod, data]) => (
            <div key={prod} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
              <ProductTag product={prod} />
              <span style={{ fontSize: 13 }}>{formatGallons(data.gallons)}</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>{formatCurrency(data.amount)}</span>
            </div>
          ))}
          <div className="flex-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
            <span style={{ fontWeight: 800 }}>TOTAL VENTA</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#6366f1' }}>{formatCurrency(balance.totalSales)}</span>
          </div>
        </Card>
      </div>

      {items.payments.length > 0 && (
        <VerifySection title="💳 Pagos Electrónicos"
          subtitle={`Verificados: ${formatCurrency(verifiedPayAmt)} · No encontrados: ${formatCurrency(rejectedPayAmt)}`}
          items={items.payments} onToggle={id => toggle('payments', id)}
          renderRow={p => [p.method, p.reference || '—', p.invoice || '—', <span style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</span>]}
          headers={['Método', 'Referencia', 'Factura', 'Monto']}
        />
      )}
      {items.credits.length > 0 && (
        <VerifySection title="📄 Créditos"
          subtitle={`Verificados: ${formatCurrency(verifiedCredAmt)} · No encontrados: ${formatCurrency(rejectedCredAmt)}`}
          items={items.credits} onToggle={id => toggle('credits', id)}
          renderRow={c => [<ProductTag product={c.product} />, c.client || '—', c.voucher || '—', <span style={{ fontWeight: 700 }}>{formatGallons(parseFloat(c.gallons) || 0)}</span>, <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}</span>]}
          headers={['Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
        />
      )}
      {items.promotions.length > 0 && (
        <VerifySection title="🎁 Promociones" subtitle="Galones prestados por promoción"
          items={items.promotions} onToggle={id => toggle('promotions', id)}
          renderRow={p => [<ProductTag product={p.product} />, p.dniPlate || '—', <span style={{ fontWeight: 700 }}>{formatGallons(parseFloat(p.gallons) || 0)}</span>]}
          headers={['Producto', 'DNI / Placa', 'Galones']}
        />
      )}
      {items.discounts.length > 0 && (
        <VerifySection title="🔻 Descuentos" subtitle="Ventas con precio especial"
          items={items.discounts} onToggle={id => toggle('discounts', id)}
          renderRow={d => [<ProductTag product={d.product} />, d.client || '—', formatGallons(parseFloat(d.gallons) || 0), formatCurrency(d.price), <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0))}</span>]}
          headers={['Producto', 'Cliente', 'Galones', 'Precio', 'Monto']}
        />
      )}
      {totalItems === 0 && (
        <Card>
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>
            Este turno no tiene pagos electrónicos, créditos, promociones ni descuentos que verificar.
          </p>
        </Card>
      )}

      {/* ── CORRECCIONES AL TURNO ── */}
      <Card>
        <div
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => setShowEditor(v => !v)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-header" style={{ marginBottom: 0 }}>✏️ Corregir datos del turno</span>
            {hasEdits && (
              <span style={{ fontSize: 11, background: '#92400e', color: '#fde68a', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ● DATOS CORREGIDOS
              </span>
            )}
          </div>
          <span style={{ fontSize: 16, color: '#64748b' }}>{showEditor ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
          Si encontraste un error (número mal escrito, gasto que faltaba, crédito incorrecto), corrígelo aquí.
          El balance se recalcula automáticamente.
        </div>

        {showEditor && (
          <div style={{ marginTop: 20 }}>

            {/* Gastos */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>🧾 GASTOS</span>
                <Btn className="btn-sm" onClick={() => setEditedExpenses(prev => [...prev, { detail: '', amount: 0 }])}>
                  + Agregar gasto
                </Btn>
              </div>
              {editedExpenses.length === 0 && (
                <p style={{ fontSize: 13, color: '#475569' }}>Sin gastos. Toca "Agregar gasto" para añadir uno.</p>
              )}
              {editedExpenses.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    className="input-field" style={{ flex: 1 }} placeholder="Detalle del gasto"
                    value={e.detail}
                    onChange={ev => setEditedExpenses(prev => prev.map((x, j) => j === i ? { ...x, detail: ev.target.value } : x))}
                  />
                  <input
                    className="input-field" type="number" step="0.01" style={{ width: 110 }} placeholder="0.00"
                    value={e.amount}
                    onChange={ev => setEditedExpenses(prev => prev.map((x, j) => j === i ? { ...x, amount: ev.target.value } : x))}
                  />
                  <Btn variant="danger" className="btn-icon"
                    onClick={() => setEditedExpenses(prev => prev.filter((_, j) => j !== i))}>
                    🗑️
                  </Btn>
                </div>
              ))}
              {editedExpenses.length > 0 && (
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                  Total gastos: {formatCurrency(editedExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}
                </div>
              )}
            </div>

            {/* Créditos */}
            {items.credits.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
                  📋 CRÉDITOS — corregir galones si hay error
                </div>
                {items.credits.map((c) => (
                  <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <ProductTag product={c.product} />
                    <span style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>{c.client || '—'}</span>
                    <input
                      className="input-field" type="number" step="0.001" style={{ width: 120 }} placeholder="Galones"
                      value={c.gallons}
                      onChange={ev => updateItemField('credits', c._id, 'gallons', ev.target.value)}
                    />
                    <span style={{ fontSize: 12, color: '#f59e0b', width: 80, textAlign: 'right' }}>
                      = {formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Pagos electrónicos */}
            {items.payments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
                  💳 PAGOS ELECTRÓNICOS — corregir monto si hay error
                </div>
                {items.payments.map((p) => (
                  <div key={p._id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, background: '#1e3a5f', color: '#93c5fd', padding: '4px 8px', borderRadius: 6, minWidth: 90, textAlign: 'center' }}>
                      {p.method}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>{p.reference || '—'}</span>
                    <input
                      className="input-field" type="number" step="0.01" style={{ width: 120 }} placeholder="0.00"
                      value={p.amount}
                      onChange={ev => updateItemField('payments', p._id, 'amount', ev.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Contómetros */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
                ⛽ CONTÓMETROS — corregir lectura final si está mal escrita
              </div>
              {island?.faces?.map(face => (
                <div key={face.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>{face.label}</div>
                  {face.dispensers.map(d => {
                    const m = editedMeters[d.key] || { start: 0, end: null };
                    const gal = Math.max(0, (parseFloat(m.end || 0) - parseFloat(m.start || 0)));
                    return (
                      <div key={d.key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <ProductTag product={d.product} />
                        <span style={{ fontSize: 12, color: '#64748b', width: 60 }}>{d.label}</span>
                        <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>
                          Inicio: <strong>{parseFloat(m.start || 0).toFixed(3)}</strong>
                        </span>
                        <input
                          className="input-field" type="number" step="0.001" style={{ width: 140 }}
                          placeholder="Lectura final"
                          value={m.end !== null && m.end !== '' ? m.end : ''}
                          onChange={ev => setEditedMeters(prev => ({
                            ...prev,
                            [d.key]: { ...(prev[d.key] || { start: 0 }), end: ev.target.value },
                          }))}
                        />
                        <span style={{ fontSize: 12, color: '#34d399', width: 80, textAlign: 'right' }}>
                          = {formatCurrency(gal * (prices[d.product] || 0))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="card-header">📝 Observaciones</div>
        <textarea className="input-field" rows={3}
          placeholder="Escribe aquí cualquier observación sobre este turno..."
          value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }}
        />
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" style={{ padding: '12px 24px' }} onClick={handleCancel}>Cancelar</Btn>
        <Btn variant="success" style={{ padding: '12px 32px', fontSize: 16, fontWeight: 800 }} onClick={handleSave}>
          ✅ {hasEdits ? 'Guardar correcciones y verificar' : 'Guardar Verificación'}
        </Btn>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// FORMULARIO: Día completo (múltiples turnos)
// ══════════════════════════════════════════════
const VerifyDayForm = ({
  verifyTarget, setVerifyTarget, setCurrentPage,
  addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
}) => {
  const { shifts, date, editingId } = verifyTarget;
  const existing = editingId ? verifiedReports.find(r => r.id === editingId) : null;

  // Estado agrupado por nombre de turno (Mañana / Tarde / Noche)
  // { 'Mañana': { cashReceived, items: { payments, credits, promotions, discounts } }, ... }
  // Cada item lleva _id único, _shiftIdx y _worker para saber de quién es
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
  const [expanded, setExpanded] = useState({ 'Mañana': true, 'Tarde': true, 'Noche': true });

  // ── Datos editables por turno (gastos + contómetros) ──
  const [editedShiftsData, setEditedShiftsData] = useState(() =>
    shifts.map(s => ({
      expenses: JSON.parse(JSON.stringify(s.expenses || [])),
      meters:   JSON.parse(JSON.stringify(s.meters   || {})),
    }))
  );
  const [showEditorFor, setShowEditorFor] = useState(null); // shiftIdx o null

  // Editar campo de ítem dentro del grupo (créditos, pagos)
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

  // Turno efectivo (con correcciones)
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
        expenses: ed.expenses,
        meters:   ed.meters,
      };
    }),
    [shifts, groupStates, editedShiftsData]
  );

  // Alternar verificación de un ítem dentro de un grupo
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

  // Marcar todos los ítems de un grupo como verificados
  const markAllGroup = (shiftName) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: {
        ...prev[shiftName],
        items: Object.fromEntries(
          Object.entries(prev[shiftName].items).map(([section, arr]) => [
            section,
            arr.map(item => ({ ...item, verified: true })),
          ])
        ),
      },
    }));
  };

  const setGroupCash = (shiftName, value) => {
    setGroupStates(prev => ({
      ...prev,
      [shiftName]: { ...prev[shiftName], cashReceived: value },
    }));
  };

  const toggleExpand = (name) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Cálculos por turno individual — usa effectiveShifts para reflejar correcciones
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

  // Grupos ordenados Mañana → Tarde → Noche
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

  // Progreso global
  const allItems     = Object.values(groupStates).flatMap(gs =>
    [...gs.items.payments, ...gs.items.credits, ...gs.items.promotions, ...gs.items.discounts]
  );
  const checkedItems = allItems.filter(i => i.verified !== null).length;
  const totalItems   = allItems.length;
  const pct = totalItems === 0 ? 100 : Math.round((checkedItems / totalItems) * 100);

  const handleSave = () => {
    // Guardar correcciones en Firestore para cada turno editado
    effectiveShifts.forEach((eff, i) => {
      const orig = shifts[i];
      if (JSON.stringify(eff) !== JSON.stringify(orig)) {
        updateShift(orig.id, () => eff);
      }
    });

    const shiftReports = effectiveShifts.map((eff, i) => {
      const s = shifts[i];
      const gs = groupStates[s.shift];
      // Extraer ítems de este turno con verificación, sin campos internos
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
        cashReceived: 0,
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
      type: 'day',
      date,
      verifiedAt: new Date().toISOString(),
      shiftReports,
      shiftGroupCash,
      notes,
      totalSales: totalSalesAll,
      totalGallons: totalGallonsAll,
      totalCashReceived,
      lentGallons: totalLentGallons,
      collectedGallons: totalGallonsAll - totalLentGallons,
      checkedItems,
      totalItems,
    };

    existing ? updateVerifiedReport(existing.id, () => report) : addVerifiedReport(report);
    setVerifyTarget(null);
    setCurrentPage('verified');
  };

  const handleCancel = () => { setVerifyTarget(null); setCurrentPage('reports'); };

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {existing ? '✏️ Editar Verificación del Día' : '🔍 Verificar Día Completo'}
          </h2>
          <p className="text-muted">
            {date} · {shifts.length} turno{shifts.length !== 1 ? 's' : ''} para verificar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={handleCancel}>← Cancelar</Btn>
          <Btn variant="success" style={{ padding: '10px 24px', fontWeight: 800 }} onClick={handleSave}>
            ✅ Guardar Verificación del Día
          </Btn>
        </div>
      </div>

      {/* Progreso global */}
      {totalItems > 0 && <ProgressBar checked={checkedItems} total={totalItems} pct={pct} label="Progreso total del día" />}

      {/* Resumen del día */}
      <div className="grid-2 mb-2">
        <Card>
          <div className="card-header">💵 Efectivo Total del Día</div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 12 }}>
            <SumRow label="Efectivo esperado (todos los turnos)" value={formatCurrency(totalExpectedCash)} />
            <SumRow label="Efectivo recibido (todos los turnos)" value={formatCurrency(totalCashReceived)} />
            <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
              <div className="flex-between">
                <span style={{ fontWeight: 700 }}>Diferencia total de caja</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: Math.abs(cashDiff) < 0.01 ? '#34d399' : cashDiff > 0 ? '#6366f1' : '#ef4444' }}>
                  {formatSignedCurrency(cashDiff)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header">⛽ Galones del Día</div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
            <GalRow label="Total galones vendidos" value={totalGallonsAll} color="#6366f1" />
            <GalRow label="Galones prestados (créditos + promos)" value={totalLentGallons} color="#f59e0b" note="No cobrados aún" />
            <div style={{ borderTop: '1px solid #334155', paddingTop: 8, marginTop: 6 }}>
              <GalRow label="Galones cobrados" value={totalGallonsAll - totalLentGallons} color="#34d399" bold />
            </div>
          </div>
        </Card>
      </div>

      {/* Una sección por nombre de turno (Mañana / Tarde / Noche) */}
      {shiftGroups.map(({ shiftName, indices }) => {
        const gs = groupStates[shiftName];
        if (!gs) return null;

        const groupItems = [...gs.items.payments, ...gs.items.credits, ...gs.items.promotions, ...gs.items.discounts];
        const groupChecked = groupItems.filter(i => i.verified !== null).length;
        const groupPct = groupItems.length === 0 ? 100 : Math.round((groupChecked / groupItems.length) * 100);
        const groupExpected = indices.reduce((sum, idx) => {
          const { balance } = shiftBalances[idx];
          return sum + balance.totalSales - balance.totalPayments - balance.totalCredits
            - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
        }, 0);
        const groupSales = indices.reduce((sum, idx) => sum + shiftBalances[idx].balance.totalSales, 0);
        const groupCashNum = parseFloat(gs.cashReceived) || 0;
        const groupCashDiff = groupCashNum - groupExpected;
        const isOpen = expanded[shiftName];

        return (
          <Card key={shiftName} style={{ marginBottom: 12 }}>
            {/* Cabecera del grupo */}
            <div
              onClick={() => toggleExpand(shiftName)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isOpen ? 16 : 0 }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{SHIFT_ICON[shiftName] || '⛽'}</span>
                  <span style={{ fontWeight: 800, fontSize: 18 }}>{shiftName}</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{formatCurrency(groupSales)}</span>
                </div>
                {/* Trabajadores del turno */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {indices.map(idx => (
                    <span key={idx} style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 12,
                      background: '#1e293b', color: '#94a3b8',
                    }}>
                      {shifts[idx].worker} · {ISLANDS_CONFIG.find(il => il.id.toString() === shifts[idx].island)?.name}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: groupPct === 100 ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.15)',
                  color: groupPct === 100 ? '#6ee7b7' : '#fcd34d',
                }}>
                  {groupChecked}/{groupItems.length} verificados
                </span>
                {groupCashNum > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: Math.abs(groupCashDiff) < 0.01 ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.15)',
                    color: Math.abs(groupCashDiff) < 0.01 ? '#6ee7b7' : '#fca5a5',
                  }}>
                    {Math.abs(groupCashDiff) < 0.01 ? '✅ Caja OK' : `Caja: ${formatSignedCurrency(groupCashDiff)}`}
                  </span>
                )}
                <span style={{ color: '#64748b', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <>
                {/* Efectivo del turno (un solo campo para todo el grupo) */}
                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <label className="form-label">EFECTIVO RECIBIDO — TURNO {shiftName.toUpperCase()}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <input
                      className="input-field" type="number" step="0.01" placeholder="0.00"
                      value={gs.cashReceived} onChange={e => setGroupCash(shiftName, e.target.value)}
                      style={{ fontSize: 20, fontWeight: 800, textAlign: 'right', maxWidth: 200 }}
                    />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>
                      Esperado: <strong style={{ color: '#e2e8f0' }}>{formatCurrency(groupExpected)}</strong>
                    </span>
                    {groupCashNum > 0 && (
                      <span style={{
                        fontWeight: 800, fontSize: 16,
                        color: Math.abs(groupCashDiff) < 0.01 ? '#34d399' : groupCashDiff > 0 ? '#6366f1' : '#ef4444',
                      }}>
                        {formatSignedCurrency(groupCashDiff)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Entregas de dinero registradas por los griferos */}
                {(() => {
                  const delivData = indices
                    .map(idx => {
                      const s = shifts[idx];
                      const delivs = (s.deliveries || []).filter(v => parseFloat(v) > 0);
                      const total = delivs.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                      return {
                        worker: s.worker,
                        island: ISLANDS_CONFIG.find(il => il.id.toString() === s.island)?.name,
                        deliveries: delivs,
                        total,
                      };
                    })
                    .filter(d => d.deliveries.length > 0);

                  if (delivData.length === 0) return null;
                  const groupDelivTotal = delivData.reduce((sum, d) => sum + d.total, 0);
                  const delivDiff = groupCashNum > 0 ? groupCashNum - groupDelivTotal : null;

                  return (
                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#94a3b8', letterSpacing: '0.05em' }}>
                          💰 ENTREGAS REGISTRADAS POR GRIFEROS
                        </span>
                        <span style={{ fontWeight: 900, fontSize: 15, color: '#34d399' }}>
                          {formatCurrency(groupDelivTotal)}
                        </span>
                      </div>
                      {delivData.map((d, di) => (
                        <div key={di} style={{
                          paddingBottom: 8, marginBottom: 8,
                          borderBottom: di < delivData.length - 1 ? '1px solid #1e293b' : 'none',
                        }}>
                          <div className="flex-between" style={{ marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {d.worker} <span style={{ fontWeight: 400, color: '#64748b' }}>· {d.island}</span>
                            </span>
                            <span style={{ fontWeight: 800, color: '#e2e8f0' }}>{formatCurrency(d.total)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {d.deliveries.map((amt, j) => (
                              <span key={j} style={{
                                fontSize: 12, background: '#1e293b',
                                padding: '2px 10px', borderRadius: 8, color: '#cbd5e1',
                              }}>
                                {formatCurrency(parseFloat(amt) || 0)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {groupCashNum > 0 && delivDiff !== null && (
                        <div className="flex-between" style={{ paddingTop: 8, borderTop: '1px solid #334155', marginTop: 4 }}>
                          <span style={{ fontSize: 13, color: '#94a3b8' }}>
                            Diferencia (lo que contaste vs lo que entregaron)
                          </span>
                          <span style={{
                            fontWeight: 900, fontSize: 15,
                            color: Math.abs(delivDiff) < 0.01 ? '#34d399' : delivDiff > 0 ? '#6366f1' : '#ef4444',
                          }}>
                            {Math.abs(delivDiff) < 0.01 ? '✅ Cuadra' : formatSignedCurrency(delivDiff)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Botón marcar todo */}
                {groupItems.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Btn variant="ghost" onClick={() => markAllGroup(shiftName)}
                      style={{ fontSize: 13, padding: '6px 14px' }}>
                      ✅ Marcar todo como verificado
                    </Btn>
                  </div>
                )}

                {/* Ítems combinados de todos los trabajadores del turno */}
                {gs.items.payments.length > 0 && (
                  <VerifySection title="💳 Pagos Electrónicos" items={gs.items.payments}
                    onToggle={id => toggleGroupItem(shiftName, 'payments', id)}
                    renderRow={p => [
                      <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{p._worker}</span>,
                      p.method, p.reference || '—', p.invoice || '—',
                      <span style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</span>,
                    ]}
                    headers={['Trabajador', 'Método', 'Referencia', 'Factura', 'Monto']}
                  />
                )}
                {gs.items.credits.length > 0 && (
                  <VerifySection title="📄 Créditos" items={gs.items.credits}
                    onToggle={id => toggleGroupItem(shiftName, 'credits', id)}
                    renderRow={c => [
                      <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{c._worker}</span>,
                      <ProductTag product={c.product} />, c.client || '—', c.voucher || '—',
                      <span style={{ fontWeight: 700 }}>{formatGallons(parseFloat(c.gallons) || 0)}</span>,
                      <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}</span>,
                    ]}
                    headers={['Trabajador', 'Producto', 'Cliente', 'Vale', 'Galones', 'Monto']}
                  />
                )}
                {gs.items.promotions.length > 0 && (
                  <VerifySection title="🎁 Promociones" items={gs.items.promotions}
                    onToggle={id => toggleGroupItem(shiftName, 'promotions', id)}
                    renderRow={p => [
                      <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{p._worker}</span>,
                      <ProductTag product={p.product} />, p.dniPlate || '—',
                      <span style={{ fontWeight: 700 }}>{formatGallons(parseFloat(p.gallons) || 0)}</span>,
                    ]}
                    headers={['Trabajador', 'Producto', 'DNI / Placa', 'Galones']}
                  />
                )}
                {gs.items.discounts.length > 0 && (
                  <VerifySection title="🔻 Descuentos" items={gs.items.discounts}
                    onToggle={id => toggleGroupItem(shiftName, 'discounts', id)}
                    renderRow={d => [
                      <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d._worker}</span>,
                      <ProductTag product={d.product} />, d.client || '—',
                      formatGallons(parseFloat(d.gallons) || 0), formatCurrency(d.price),
                      <span style={{ fontWeight: 700 }}>{formatCurrency((parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0))}</span>,
                    ]}
                    headers={['Trabajador', 'Producto', 'Cliente', 'Galones', 'Precio', 'Monto']}
                  />
                )}
                {groupItems.length === 0 && (
                  <p className="text-muted" style={{ padding: '10px 0', textAlign: 'center', fontSize: 13 }}>
                    Ningún turno de {shiftName} tiene pagos, créditos, promociones ni descuentos que verificar.
                  </p>
                )}

                {/* ── Correcciones por turno ── */}
                <div style={{ marginTop: 16, borderTop: '1px solid #1e293b', paddingTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>
                    ✏️ Correcciones por turno
                  </div>
                  {indices.map(idx => {
                    const s = shifts[idx];
                    const islandName = ISLANDS_CONFIG.find(il => il.id.toString() === s.island)?.name;
                    const isOpen2 = showEditorFor === idx;
                    const ed = editedShiftsData[idx];
                    const hasShiftEdits = JSON.stringify(effectiveShifts[idx]) !== JSON.stringify(s);
                    const groupCredits = gs.items.credits.filter(c => c._shiftIdx === idx);
                    const groupPayments = gs.items.payments.filter(p => p._shiftIdx === idx);
                    return (
                      <div key={idx} style={{ marginBottom: 10, background: '#0f172a', borderRadius: 10, padding: 12 }}>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => setShowEditorFor(isOpen2 ? null : idx)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.worker}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>· {islandName}</span>
                            {hasShiftEdits && (
                              <span style={{ fontSize: 10, background: '#92400e', color: '#fde68a', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                CORREGIDO
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: '#475569' }}>{isOpen2 ? '▲' : '▼ editar'}</span>
                        </div>

                        {isOpen2 && (
                          <div style={{ marginTop: 14 }}>
                            {/* Gastos */}
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>🧾 GASTOS</span>
                                <Btn className="btn-sm" onClick={() =>
                                  setEditedShiftsData(prev => prev.map((x, j) => j === idx
                                    ? { ...x, expenses: [...x.expenses, { detail: '', amount: 0 }] }
                                    : x))
                                }>
                                  + Agregar
                                </Btn>
                              </div>
                              {ed.expenses.length === 0 && (
                                <p style={{ fontSize: 12, color: '#475569' }}>Sin gastos.</p>
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

                            {/* Créditos del turno */}
                            {groupCredits.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>📋 CRÉDITOS — corregir galones</div>
                                {groupCredits.map(c => (
                                  <div key={c._id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                    <ProductTag product={c.product} />
                                    <span style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>{c.client || '—'}</span>
                                    <input className="input-field" type="number" step="0.001" style={{ width: 110, fontSize: 13 }}
                                      value={c.gallons}
                                      onChange={ev => updateGroupItemField(shiftName, 'credits', c._id, 'gallons', ev.target.value)}
                                    />
                                    <span style={{ fontSize: 12, color: '#f59e0b', width: 72, textAlign: 'right' }}>
                                      = {formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Pagos del turno */}
                            {groupPayments.length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>💳 PAGOS — corregir monto</div>
                                {groupPayments.map(p => (
                                  <div key={p._id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, background: '#1e3a5f', color: '#93c5fd', padding: '3px 8px', borderRadius: 6, minWidth: 70, textAlign: 'center' }}>
                                      {p.method}
                                    </span>
                                    <span style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>{p.reference || '—'}</span>
                                    <input className="input-field" type="number" step="0.01" style={{ width: 110, fontSize: 13 }}
                                      value={p.amount}
                                      onChange={ev => updateGroupItemField(shiftName, 'payments', p._id, 'amount', ev.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        );
      })}

      {/* Observaciones */}
      <Card>
        <div className="card-header">📝 Observaciones del Día</div>
        <textarea className="input-field" rows={3}
          placeholder="Escribe aquí cualquier observación sobre este día..."
          value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }}
        />
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" style={{ padding: '12px 24px' }} onClick={handleCancel}>Cancelar</Btn>
        <Btn variant="success" style={{ padding: '12px 32px', fontSize: 16, fontWeight: 800 }} onClick={handleSave}>
          ✅ Guardar Verificación del Día
        </Btn>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// COMPONENTE REUTILIZABLE: Sección de verificación
// ══════════════════════════════════════════════
const VerifySection = ({ title, subtitle, items, onToggle, renderRow, headers }) => {
  const checked = items.filter(i => i.verified !== null).length;
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="card-header" style={{ marginBottom: 2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div>}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: checked === items.length ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.15)',
          color: checked === items.length ? '#6ee7b7' : '#fcd34d',
        }}>
          {checked}/{items.length} verificados
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: '#64748b' }}>
        <span>⬜ Sin revisar</span>
        <span style={{ color: '#34d399' }}>✅ Confirmado</span>
        <span style={{ color: '#ef4444' }}>❌ No encontrado</span>
        <span style={{ color: '#64748b', marginLeft: 4 }}>← clic para alternar</span>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h}</th>)}
            <th style={{ textAlign: 'center', width: 80 }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const v = item.verified;
            const rowBg = v === true ? 'rgba(52,211,153,0.07)' : v === false ? 'rgba(239,68,68,0.07)' : '';
            return (
              <tr key={item._id} style={{ background: rowBg }}>
                {renderRow(item).map((cell, ci) => <td key={ci}>{cell}</td>)}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => onToggle(item._id)}
                    title="Clic para cambiar estado"
                    style={{
                      background: 'none',
                      border: `2px solid ${v === null ? '#334155' : v ? '#059669' : '#dc2626'}`,
                      borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                      fontSize: 18, lineHeight: 1, transition: 'all 0.15s', minWidth: 44,
                    }}
                  >
                    {v === null ? '⬜' : v ? '✅' : '❌'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

// ── Helpers visuales ──
const ProgressBar = ({ checked, total, pct, label }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
      <span>{label || 'Progreso de verificación'}</span>
      <span style={{ fontWeight: 700, color: pct === 100 ? '#34d399' : '#f59e0b' }}>
        {checked}/{total} items ({pct}%)
      </span>
    </div>
    <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 4, transition: 'width 0.3s',
        width: `${pct}%`, background: pct === 100 ? '#059669' : '#f59e0b',
      }} />
    </div>
  </div>
);

const SumRow = ({ label, value }) => (
  <div className="flex-between" style={{ padding: '5px 0', fontSize: 13 }}>
    <span style={{ color: '#94a3b8' }}>{label}</span>
    <span style={{ fontWeight: 700 }}>{value}</span>
  </div>
);

const GalRow = ({ label, value, color, note, bold }) => (
  <div style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
    <div className="flex-between">
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? 18 : 14, color }}>
        {formatGallons(value)}
      </span>
    </div>
    {note && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{note}</div>}
  </div>
);

export default VerifyReportPage;
