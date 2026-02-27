import React, { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, Input, Select, StatCard, ProductTag, HelpBtn } from '../components/UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency, calcGallons,
  calcSalesByProduct, calcShiftBalance, sumField, sumArray,
  createEmptyShift, getCarryoverMeters,
} from '../utils/helpers';
import {
  ISLANDS_CONFIG, PAYMENT_METHODS, PRODUCTS_LIST,
  SHIFT_OPTIONS, CYLINDER_SIZES,
} from '../utils/constants';

// ============================================
// PÁGINA: Mi Turno (Grifero)
// El grifero registra toda la info de su turno.
// Si no tiene turno activo, puede crear uno.
// ============================================

const WorkerShiftPage = () => {
  const { currentUser, shifts, addShift, updateShift, closeShift, prices, lastClosedShift, setLastClosedShift } = useApp();
  const [activeTab, setActiveTab] = useState('meters');

  // Buscar turno abierto del trabajador actual
  const myOpenShifts = shifts.filter(
    (s) => s.worker === currentUser.name && s.status === 'open'
  );
  const shift = myOpenShifts[0];

  // Función para actualizar el turno actual
  const update = useCallback(
    (updater) => {
      if (!shift) return;
      updateShift(shift.id, updater);
    },
    [shift, updateShift]
  );

  // ---- CONFIGURACIÓN DE LA ISLA DEL TURNO ----
  const islandConfig = useMemo(
    () => ISLANDS_CONFIG.find((isl) => isl.id.toString() === (shift?.island || '')),
    [shift]
  );
  const isGLPShift = islandConfig?.isGLP || false;

  // ---- CÁLCULOS AUTOMÁTICOS ----

  const salesByProduct = useMemo(
    () => (shift ? calcSalesByProduct(shift, prices) : {}),
    [shift, prices]
  );

  const totalMeterSales = useMemo(
    () => Object.values(salesByProduct).reduce((s, v) => s + v.amount, 0),
    [salesByProduct]
  );

  const totalGallons = useMemo(
    () => Object.values(salesByProduct).reduce((s, v) => s + v.gallons, 0),
    [salesByProduct]
  );

  const totalCylindersAmount = useMemo(() => {
    if (!shift || !shift.gasCylinders) return 0;
    return shift.gasCylinders.reduce(
      (s, c) => s + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0),
      0
    );
  }, [shift]);

  const totalSales = useMemo(
    () => totalMeterSales + totalCylindersAmount,
    [totalMeterSales, totalCylindersAmount]
  );

  const totalPayments = useMemo(
    () => (shift ? sumField(shift.payments, 'amount') : 0),
    [shift]
  );

  const totalExpenses = useMemo(
    () => (shift ? sumField(shift.expenses, 'amount') : 0),
    [shift]
  );

  const totalAdvance = useMemo(
    () => (shift ? sumField(shift.advancePayments, 'amount') : 0),
    [shift]
  );

  const totalDeliveries = useMemo(
    () => (shift ? sumArray(shift.deliveries) : 0),
    [shift]
  );

  const totalCreditsAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.credits.reduce(
      (s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0),
      0
    );
  }, [shift, prices]);

  const totalPromosAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.promotions.reduce(
      (s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0),
      0
    );
  }, [shift, prices]);

  const totalDiscountsAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.discounts.reduce(
      (s, d) => s + (parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0),
      0
    );
  }, [shift]);

  // Efectivo esperado y diferencia
  const expectedCash = totalSales - totalPayments - totalCreditsAmount - totalPromosAmount - totalDiscountsAmount - totalExpenses;
  const difference = totalDeliveries + totalPayments + totalAdvance - totalSales + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses;

  // ---- FUNCIONES CRUD GENÉRICAS ----

  const addItem = (field, item) => {
    update((s) => ({ ...s, [field]: [...(s[field] || []), item] }));
  };

  const removeItem = (field, idx) => {
    update((s) => ({ ...s, [field]: s[field].filter((_, i) => i !== idx) }));
  };

  const updateItem = (field, idx, key, value) => {
    update((s) => ({
      ...s,
      [field]: s[field].map((item, i) => (i === idx ? { ...item, [key]: value } : item)),
    }));
  };

  const updateMeterEnd = (meterKey, value) => {
    update((s) => ({
      ...s,
      meters: {
        ...s.meters,
        [meterKey]: { ...s.meters[meterKey], end: value },
      },
    }));
  };

  // ---- TABS (balones solo para isla GLP) ----

  const tabs = [
    { key: 'meters', label: '⛽ Contómetros' },
    ...(isGLPShift ? [{ key: 'cylinders', label: '🛢️ Balones' }] : []),
    { key: 'payments', label: '💳 Pagos' },
    { key: 'credits', label: '📄 Créditos' },
    { key: 'promotions', label: '🎁 Promociones' },
    { key: 'discounts', label: '🔻 Descuentos' },
    { key: 'expenses', label: '🧾 Gastos' },
    { key: 'advance', label: '⏩ Adelantos' },
    { key: 'deliveries', label: '📥 Entregas' },
    { key: 'summary', label: '⚖️ Cuadre' },
  ];

  // ---- ESTADO PARA INICIAR TURNO PROPIO ----

  const [startForm, setStartForm] = useState({
    island: ISLANDS_CONFIG[0].id.toString(),
    date: new Date().toISOString().split('T')[0],
    shift: 'Mañana',
  });

  const carryoverMeters = useMemo(
    () => getCarryoverMeters(shifts, startForm.island),
    [shifts, startForm.island]
  );

  // Verifica si ya existe el turno exacto (misma isla + fecha + turno)
  const existingSlotConflict = useMemo(() =>
    shifts.some(
      (s) => s.island === startForm.island
        && s.date === startForm.date
        && s.shift === startForm.shift
    ),
    [shifts, startForm]
  );

  // Cuenta cuántos turnos hay para la fecha seleccionada
  const shiftsForSelectedDate = useMemo(() =>
    shifts.filter((s) => s.date === startForm.date),
    [shifts, startForm.date]
  );

  // Máximo de turnos por día: 3 islas × 3 turnos = 9
  const maxShiftsPerDay = ISLANDS_CONFIG.length * SHIFT_OPTIONS.length;
  const isDayFull = shiftsForSelectedDate.length >= maxShiftsPerDay;

  // ---- ESTADO PARA CIERRE DE TURNO ----

  const [confirmClose, setConfirmClose] = useState(false);

  // ---- ESTADO PARA MODAL DE ITEMS (pagos, créditos, promos, descuentos) ----
  const [itemModal, setItemModal] = useState(null);
  // { type: 'payment'|'credit'|'promo'|'discount', idx: -1 (nuevo) | N (editar), data: {...} }

  const openAddModal = (type, defaultData) => setItemModal({ type, idx: -1, data: defaultData });
  const openEditModal = (type, idx, data) => setItemModal({ type, idx, data: { ...data } });

  const setModalField = (key, value) =>
    setItemModal((prev) => ({ ...prev, data: { ...prev.data, [key]: value } }));

  const handleModalSave = () => {
    const { type, idx, data } = itemModal;
    const fieldMap = { payment: 'payments', credit: 'credits', promo: 'promotions', discount: 'discounts' };
    const field = fieldMap[type];
    if (idx === -1) {
      addItem(field, data);
    } else {
      update((s) => ({ ...s, [field]: s[field].map((item, i) => (i === idx ? data : item)) }));
    }
    setItemModal(null);
  };

  const handleModalDelete = () => {
    const { type, idx } = itemModal;
    const fieldMap = { payment: 'payments', credit: 'credits', promo: 'promotions', discount: 'discounts' };
    removeItem(fieldMap[type], idx);
    setItemModal(null);
  };

  const handleConfirmClose = () => {
    setLastClosedShift({ ...shift });
    closeShift(shift.id);
    setConfirmClose(false);
  };

  const handleStartShift = () => {
    if (existingSlotConflict || isDayFull) return;
    const emptyShift = createEmptyShift();
    const meters = { ...emptyShift.meters, ...carryoverMeters };
    addShift({
      ...emptyShift,
      worker: currentUser.name,
      island: startForm.island,
      date: startForm.date,
      shift: startForm.shift,
      meters,
      hasCarryover: Object.keys(carryoverMeters).length > 0,
    });
  };

  // ---- SI NO HAY TURNO ABIERTO ----

  if (!shift) {
    // Si acaba de cerrar el turno, mostrar el resumen imprimible
    if (lastClosedShift) {
      return (
        <ShiftSummaryPrint
          shift={lastClosedShift}
          prices={prices}
          onDismiss={() => setLastClosedShift(null)}
        />
      );
    }

    const hasCarryover = Object.keys(carryoverMeters).length > 0;
    return (
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Mi Turno</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⛽</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              Bienvenido, {currentUser.name}
            </div>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              No tienes un turno activo. Llena el formulario y pulsa el botón para iniciar.
            </p>
          </div>

          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <Select
              label="ISLA ASIGNADA"
              value={startForm.island}
              onChange={(e) => setStartForm({ ...startForm, island: e.target.value })}
              options={ISLANDS_CONFIG.map((i) => ({ value: i.id.toString(), label: i.name }))}
            />
            <div className="grid-2">
              <Input
                label="FECHA"
                type="date"
                value={startForm.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartForm({ ...startForm, date: e.target.value })}
              />
              <Select
                label="TURNO"
                value={startForm.shift}
                onChange={(e) => setStartForm({ ...startForm, shift: e.target.value })}
                options={SHIFT_OPTIONS}
              />
            </div>

            {/* Contador de turnos del día */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: '#0f172a', borderRadius: 8,
              marginBottom: 12, fontSize: 13,
            }}>
              <span style={{ color: '#94a3b8' }}>Turnos registrados hoy ({startForm.date}):</span>
              <span style={{
                fontWeight: 800,
                color: isDayFull ? '#ef4444' : shiftsForSelectedDate.length >= 6 ? '#f59e0b' : '#34d399',
              }}>
                {shiftsForSelectedDate.length} / {maxShiftsPerDay}
              </span>
            </div>

            {/* Error: día completo */}
            {isDayFull && (
              <div style={{
                padding: 14, background: '#450a0a', borderRadius: 10,
                marginBottom: 16, border: '1px solid #991b1b',
              }}>
                <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                  🚫 Día completo
                </div>
                <div style={{ color: '#f87171', fontSize: 13 }}>
                  El {startForm.date} ya tiene los {maxShiftsPerDay} turnos registrados
                  ({ISLANDS_CONFIG.length} islas × 3 turnos). No es posible agregar más turnos para este día.
                </div>
              </div>
            )}

            {/* Error: turno ya registrado */}
            {!isDayFull && existingSlotConflict && (
              <div style={{
                padding: 14, background: '#450a0a', borderRadius: 10,
                marginBottom: 16, border: '1px solid #991b1b',
              }}>
                <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                  ⚠️ Turno ya registrado
                </div>
                <div style={{ color: '#f87171', fontSize: 13 }}>
                  Ya existe un turno de <strong style={{ color: '#fca5a5' }}>{startForm.shift}</strong> para{' '}
                  <strong style={{ color: '#fca5a5' }}>
                    {ISLANDS_CONFIG.find((i) => i.id.toString() === startForm.island)?.name || `Isla ${startForm.island}`}
                  </strong>{' '}
                  el {startForm.date}. Elige otra isla o turno.
                </div>
              </div>
            )}

            {/* Carryover / info contómetros — solo si no hay bloqueo */}
            {!existingSlotConflict && !isDayFull && (
              hasCarryover ? (
                <div style={{
                  padding: 12, background: '#064e3b', borderRadius: 10,
                  marginBottom: 16, fontSize: 13, color: '#6ee7b7',
                  border: '1px solid #065f46',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    ✅ Contómetros del turno anterior (se cargarán automáticamente)
                  </div>
                  {Object.entries(carryoverMeters).map(([key, m]) => {
                    const parts = key.split('-');
                    const faceId = parts[1];
                    const island = ISLANDS_CONFIG.find((isl) => isl.id.toString() === parts[0]);
                    const face = island?.faces.find((f) => f.id === faceId);
                    const dispenser = face?.dispensers.find((d) => d.key === key);
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                        <span>{face?.label || faceId} — {dispenser?.label || m.product}</span>
                        <span style={{ fontWeight: 700 }}>{(m.start || 0).toFixed(3)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: 10, background: '#1e3a5f', borderRadius: 10,
                  marginBottom: 16, fontSize: 13, color: '#93c5fd',
                  border: '1px solid #1e40af',
                }}>
                  ℹ️ Los contómetros iniciarán en 0 (primer turno registrado de esta isla).
                </div>
              )
            )}

            <Btn
              onClick={handleStartShift}
              className="btn-full"
              disabled={existingSlotConflict || isDayFull}
              style={{
                padding: 16, fontSize: 18, marginTop: 4,
                opacity: (existingSlotConflict || isDayFull) ? 0.45 : 1,
                cursor: (existingSlotConflict || isDayFull) ? 'not-allowed' : 'pointer',
              }}
            >
              {isDayFull ? '🚫 Día completo — sin cupos' : existingSlotConflict ? '⛔ Turno ocupado' : '⛽ Iniciar Mi Turno'}
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ---- OPCIONES DE PRODUCTO PARA SELECTS ----
  const productOptions = PRODUCTS_LIST.map((p) => ({ value: p, label: p }));

  return (
    <div>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Mi Turno</h2>
          <p className="text-muted">
            {shift.date} — {shift.shift} — {islandConfig?.name || `Isla ${shift.island}`}
          </p>
        </div>
        <Btn
          variant="danger"
          style={{ padding: '12px 24px', fontSize: 15, fontWeight: 700 }}
          onClick={() => setConfirmClose(true)}
        >
          🔴 Cerrar Turno
        </Btn>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid-4 mt-2 mb-2">
        <StatCard label="Total Venta" value={formatCurrency(totalSales)} color="#6366f1" />
        <StatCard label="Total Galones" value={formatGallons(totalGallons)} color="#8b5cf6" />
        <StatCard label="Total Entregas" value={formatCurrency(totalDeliveries)} color="#059669" />
        <StatCard
          label="Diferencia"
          value={formatSignedCurrency(difference)}
          color={Math.abs(difference) < 0.01 ? '#059669' : '#ef4444'}
        />
      </div>

      {/* Indicadores de progreso por tab */}
      {(() => {
        const hasMeterEnd = Object.values(shift.meters).some(
          (m) => m.end !== null && m.end !== '' && m.end !== undefined
        );
        const tabDone = {
          meters:    hasMeterEnd,
          cylinders: (shift.gasCylinders || []).length > 0,
          payments:  shift.payments.length > 0,
          credits:   shift.credits.length > 0,
          promotions:shift.promotions.length > 0,
          discounts: shift.discounts.length > 0,
          expenses:  shift.expenses.length > 0,
          advance:   shift.advancePayments.length > 0,
          deliveries:shift.deliveries.length > 0,
        };
        return (
          <div className="tabs-container">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {tabDone[t.key] && (
                  <span style={{
                    display: 'inline-block', width: 7, height: 7,
                    borderRadius: '50%', background: '#34d399',
                    marginLeft: 5, verticalAlign: 'middle', flexShrink: 0,
                  }} />
                )}
              </button>
            ))}
          </div>
        );
      })()}

      <Card>
        {/* ===== TAB: CONTÓMETROS ===== */}
        {activeTab === 'meters' && (
          <div>
            <div className="card-header">⛽ Contómetros — Ingrese lecturas finales</div>
            {shift.hasCarryover && (
              <div style={{
                padding: '8px 12px', background: '#064e3b', borderRadius: 8,
                marginBottom: 12, fontSize: 13, color: '#6ee7b7',
                border: '1px solid #065f46',
              }}>
                ✅ Los contómetros iniciales fueron tomados automáticamente del turno anterior.
              </div>
            )}

            {ISLANDS_CONFIG.filter(
              (isl) => isl.id.toString() === shift.island || shift.island === ''
            ).map((island) => (
              <div key={island.id} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>
                  {island.name}
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cara</th>
                      <th>Producto</th>
                      <th>Inicio 🔒</th>
                      <th>Final</th>
                      <th>Galones</th>
                      <th>Total S/</th>
                    </tr>
                  </thead>
                  <tbody>
                    {island.faces.map((face) =>
                      face.dispensers.map((dispenser) => {
                        const key = dispenser.key;
                        const m = shift.meters[key] || { start: 0, end: null, product: dispenser.product };
                        const gal = calcGallons(m.start, m.end);
                        const total = gal * (prices[dispenser.product] || 0);
                        return (
                          <tr key={key}>
                            <td>{face.label}</td>
                            <td>
                              <ProductTag product={dispenser.product} />
                              {' '}
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>{dispenser.label}</span>
                            </td>
                            <td style={{ color: '#64748b' }}>
                              🔒 {parseFloat(m.start || 0).toFixed(3)}
                            </td>
                            <td>
                              <input
                                className="input-field"
                                style={{ width: 130, MozAppearance: 'textfield' }}
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={m.end || ''}
                                onChange={(e) => updateMeterEnd(key, e.target.value)}
                              />
                            </td>
                            <td className="font-bold text-primary">
                              {gal.toFixed(3)}
                            </td>
                            <td className="font-bold text-success">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Resumen de ventas */}
            <div style={{ marginTop: 16, padding: 16, background: '#0f172a', borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Resumen de Ventas</div>
              {Object.entries(salesByProduct).map(([prod, data]) => (
                <div key={prod} className="flex-between" style={{ padding: '6px 0' }}>
                  <ProductTag product={prod} />
                  <span>{formatGallons(data.gallons)}</span>
                  <span className="font-bold text-success">{formatCurrency(data.amount)}</span>
                </div>
              ))}
              <div className="flex-between" style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 8 }}>
                <span className="font-extra-bold" style={{ fontSize: 16 }}>TOTAL CONTÓMETROS</span>
                <span className="font-extra-bold text-primary" style={{ fontSize: 20 }}>
                  {formatCurrency(totalMeterSales)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: BALONES GLP ===== */}
        {activeTab === 'cylinders' && (
          <div>
            <div className="flex-between mb-2">
              <div className="card-header">🛢️ Balones de GLP</div>
              <Btn
                className="btn-sm"
                onClick={() => addItem('gasCylinders', { size: '10', count: 0, price: 0 })}
              >
                ➕ Agregar
              </Btn>
            </div>
            {(!shift.gasCylinders || shift.gasCylinders.length === 0) && (
              <p className="text-muted" style={{ textAlign: 'center' }}>Sin balones registrados</p>
            )}
            {(shift.gasCylinders || []).map((c, i) => (
              <div key={i} className="grid-3 mb-1" style={{ alignItems: 'end' }}>
                <Select
                  label="TAMAÑO"
                  value={c.size}
                  onChange={(e) => updateItem('gasCylinders', i, 'size', e.target.value)}
                  options={CYLINDER_SIZES}
                />
                <Input
                  label="CANTIDAD"
                  type="number"
                  value={c.count}
                  onChange={(e) => updateItem('gasCylinders', i, 'count', e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                  <Input
                    label="PRECIO UNIT. S/"
                    type="number"
                    value={c.price}
                    onChange={(e) => updateItem('gasCylinders', i, 'price', e.target.value)}
                  />
                  <Btn
                    variant="danger"
                    className="btn-icon"
                    style={{ marginBottom: 12 }}
                    onClick={() => removeItem('gasCylinders', i)}
                  >
                    🗑️
                  </Btn>
                </div>
              </div>
            ))}
            {/* Totales por tamaño */}
            {(shift.gasCylinders || []).length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: '#0f172a', borderRadius: 10 }}>
                {(shift.gasCylinders || []).map((c, i) => (
                  <div key={i} className="flex-between" style={{ padding: '4px 0', fontSize: 14 }}>
                    <span>Balón {c.size} kg × {parseFloat(c.count) || 0} unid.</span>
                    <span className="font-bold text-success">
                      {formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}
                    </span>
                  </div>
                ))}
                <div className="flex-between" style={{ borderTop: '1px solid #334155', paddingTop: 10, marginTop: 8 }}>
                  <span className="font-extra-bold">TOTAL BALONES</span>
                  <span className="font-extra-bold" style={{ fontSize: 20, color: '#f59e0b' }}>
                    {formatCurrency(totalCylindersAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: PAGOS ===== */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="card-header" style={{ marginBottom: 0 }}>💳 Pagos Electrónicos</div>
              <HelpBtn title="Pagos Electrónicos" steps={[
                'Registra aquí los pagos que recibiste por VISA, YAPE o Transferencia.',
                'Cada fila es un método de pago. Toca "➕ Agregar" para añadir un nuevo pago.',
                'En "Referencia" escribe el número de operación. En "Monto" el dinero recibido.',
                'Para editar o eliminar un pago ya registrado, tócalo y aparecerá la ventana.',
                'Al terminar, el total aparece abajo en morado.',
              ]} />
            </div>
            <div className="grid-3" style={{ gap: 10 }}>
              {[
                { method: 'VISA',          icon: '💳', color: '#6366f1' },
                { method: 'YAPE',          icon: '📱', color: '#a855f7' },
                { method: 'Transferencia', icon: '🏦', color: '#3b82f6' },
              ].map(({ method, icon, color }) => {
                const methodItems = shift.payments
                  .map((p, i) => ({ ...p, _idx: i }))
                  .filter((p) => p.method === method);
                const methodTotal = methodItems.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                return (
                  <div key={method} style={{
                    background: '#0f172a', borderRadius: 12,
                    padding: '14px 12px', borderTop: `3px solid ${color}`,
                  }}>
                    {/* Cabecera de la columna */}
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 28 }}>{icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, margin: '4px 0 2px' }}>{method}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                        {methodItems.length === 0 ? 'Sin registros' : `${methodItems.length} pago${methodItems.length !== 1 ? 's' : ''}`}
                      </div>
                      <div style={{ fontWeight: 900, color, fontSize: 18, marginBottom: 10 }}>
                        {formatCurrency(methodTotal)}
                      </div>
                      <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => openAddModal('payment', { method, reference: '', invoice: '', amount: 0 })}>
                        ➕ Agregar
                      </Btn>
                    </div>
                    {/* Ítems de la columna */}
                    {methodItems.length > 0 && (
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                        {methodItems.map((p) => (
                          <div key={p._idx}
                            onClick={() => openEditModal('payment', p._idx, p)}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                            }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.reference || '—'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{formatCurrency(parseFloat(p.amount) || 0)}</span>
                              <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {shift.payments.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#6366f1', marginTop: 10 }}>
                Total Pagos: {formatCurrency(totalPayments)}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: CRÉDITOS ===== */}
        {activeTab === 'credits' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="card-header" style={{ marginBottom: 0 }}>📄 Créditos</div>
              <HelpBtn title="Créditos" steps={[
                'Un crédito es gasolina que despachas pero NO cobras en el momento (se paga después).',
                'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir un crédito.',
                'Escribe el nombre del cliente, el número de vale y los galones despachados.',
                'Para editar o eliminar un crédito ya registrado, tócalo para abrir la ventana.',
                'Al final verás el total de créditos en soles para que el admin lo verifique.',
              ]} />
            </div>
            {(() => {
              const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };
              return (
                <div className="grid-4" style={{ gap: 10 }}>
                  {productOptions.map(({ value: product, label }) => {
                    const color = PROD_COLORS[product] || '#6366f1';
                    const prodItems = shift.credits
                      .map((c, i) => ({ ...c, _idx: i }))
                      .filter((c) => c.product === product);
                    const prodGallons = prodItems.reduce((s, c) => s + (parseFloat(c.gallons) || 0), 0);
                    const prodTotal = prodItems.reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);
                    return (
                      <div key={product} style={{
                        background: '#0f172a', borderRadius: 12,
                        padding: '14px 12px', borderTop: `3px solid ${color}`,
                      }}>
                        {/* Cabecera de la columna */}
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <ProductTag product={product} />
                          <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 2px' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            {prodItems.length === 0
                              ? 'Sin registros'
                              : `${prodItems.length} · ${formatGallons(prodGallons)}`}
                          </div>
                          <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 16, marginBottom: 10 }}>
                            {formatCurrency(prodTotal)}
                          </div>
                          <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => openAddModal('credit', { product, client: '', voucher: '', invoice: '', gallons: 0 })}>
                            ➕ Agregar
                          </Btn>
                        </div>
                        {/* Ítems de la columna */}
                        {prodItems.length > 0 && (
                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                            {prodItems.map((c) => (
                              <div key={c._idx}
                                onClick={() => openEditModal('credit', c._idx, c)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                                }}>
                                <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.client || '—'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700 }}>{formatGallons(parseFloat(c.gallons) || 0)}</span>
                                  <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {shift.credits.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#f59e0b', marginTop: 10 }}>
                Total Créditos: {formatCurrency(totalCreditsAmount)}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: PROMOCIONES ===== */}
        {activeTab === 'promotions' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="card-header" style={{ marginBottom: 0 }}>🎁 Promociones</div>
              <HelpBtn title="Promociones" steps={[
                'Las promociones son galones que se dan gratis como parte de una campaña o beneficio.',
                'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir una promoción.',
                'En "DNI / Placa" escribe el documento o la placa del vehículo que recibió la promo.',
                'Para editar o eliminar una promoción ya registrada, tócala para abrir la ventana.',
                'Estos galones sí aparecen en los contómetros pero no generan cobro en el cuadre.',
              ]} />
            </div>
            {(() => {
              const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };
              return (
                <div className="grid-4" style={{ gap: 10 }}>
                  {productOptions.map(({ value: product, label }) => {
                    const color = PROD_COLORS[product] || '#8b5cf6';
                    const prodItems = shift.promotions
                      .map((p, i) => ({ ...p, _idx: i }))
                      .filter((p) => p.product === product);
                    const prodGallons = prodItems.reduce((s, p) => s + (parseFloat(p.gallons) || 0), 0);
                    const prodTotal = prodItems.reduce((s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0);
                    return (
                      <div key={product} style={{
                        background: '#0f172a', borderRadius: 12,
                        padding: '14px 12px', borderTop: `3px solid ${color}`,
                      }}>
                        {/* Cabecera de la columna */}
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <ProductTag product={product} />
                          <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 2px' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            {prodItems.length === 0
                              ? 'Sin registros'
                              : `${prodItems.length} · ${formatGallons(prodGallons)}`}
                          </div>
                          <div style={{ fontWeight: 900, color: '#8b5cf6', fontSize: 16, marginBottom: 10 }}>
                            {formatCurrency(prodTotal)}
                          </div>
                          <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => openAddModal('promo', { product, dniPlate: '', gallons: 0 })}>
                            ➕ Agregar
                          </Btn>
                        </div>
                        {/* Ítems de la columna */}
                        {prodItems.length > 0 && (
                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                            {prodItems.map((p) => (
                              <div key={p._idx}
                                onClick={() => openEditModal('promo', p._idx, p)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                                }}>
                                <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.dniPlate || '—'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700 }}>{formatGallons(parseFloat(p.gallons) || 0)}</span>
                                  <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {shift.promotions.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#8b5cf6', marginTop: 10 }}>
                Total Promociones: {formatCurrency(totalPromosAmount)}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: DESCUENTOS ===== */}
        {activeTab === 'discounts' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="card-header" style={{ marginBottom: 0 }}>🔻 Descuentos</div>
              <HelpBtn title="Descuentos" steps={[
                'Un descuento es cuando vendes combustible a un precio menor al normal (precio especial).',
                'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir un descuento.',
                'Escribe el nombre del cliente y el precio especial acordado por galón.',
                'Para editar o eliminar un descuento ya registrado, tócalo para abrir la ventana.',
                'El sistema calcula automáticamente el total de los descuentos del turno.',
              ]} />
            </div>
            {(() => {
              const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };
              return (
                <div className="grid-4" style={{ gap: 10 }}>
                  {productOptions.map(({ value: product, label }) => {
                    const color = PROD_COLORS[product] || '#ef4444';
                    const prodItems = shift.discounts
                      .map((d, i) => ({ ...d, _idx: i }))
                      .filter((d) => d.product === product);
                    const prodGallons = prodItems.reduce((s, d) => s + (parseFloat(d.gallons) || 0), 0);
                    const prodTotal = prodItems.reduce((s, d) => s + (parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0), 0);
                    return (
                      <div key={product} style={{
                        background: '#0f172a', borderRadius: 12,
                        padding: '14px 12px', borderTop: `3px solid ${color}`,
                      }}>
                        {/* Cabecera de la columna */}
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <ProductTag product={product} />
                          <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 2px' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            {prodItems.length === 0
                              ? 'Sin registros'
                              : `${prodItems.length} · ${formatGallons(prodGallons)}`}
                          </div>
                          <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 16, marginBottom: 10 }}>
                            {formatCurrency(prodTotal)}
                          </div>
                          <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => openAddModal('discount', { product, client: '', gallons: 0, price: prices[product] || 0 })}>
                            ➕ Agregar
                          </Btn>
                        </div>
                        {/* Ítems de la columna */}
                        {prodItems.length > 0 && (
                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                            {prodItems.map((d) => (
                              <div key={d._idx}
                                onClick={() => openEditModal('discount', d._idx, d)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                                }}>
                                <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {d.client || '—'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700 }}>{formatGallons(parseFloat(d.gallons) || 0)}</span>
                                  <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {shift.discounts.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#ef4444', marginTop: 10 }}>
                Total Descuentos: {formatCurrency(totalDiscountsAmount)}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: GASTOS ===== */}
        {activeTab === 'expenses' && (
          <div>
            <div className="flex-between mb-2">
              <div className="card-header">🧾 Gastos</div>
              <Btn className="btn-sm"
                onClick={() => addItem('expenses', { detail: '', amount: 0 })}>
                ➕ Agregar
              </Btn>
            </div>
            {shift.expenses.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center' }}>Sin gastos registrados</p>
            )}
            {shift.expenses.map((e, i) => (
              <div key={i} className="grid-2 mb-1" style={{ alignItems: 'end' }}>
                <Input label="Detalle" value={e.detail}
                  onChange={(ev) => updateItem('expenses', i, 'detail', ev.target.value)} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                  <Input label="Monto S/" type="number" value={e.amount}
                    onChange={(ev) => updateItem('expenses', i, 'amount', ev.target.value)} />
                  <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
                    onClick={() => removeItem('expenses', i)}>🗑️</Btn>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#ef4444', marginTop: 12 }}>
              Total Gastos: {formatCurrency(totalExpenses)}
            </div>
          </div>
        )}

        {/* ===== TAB: PAGOS ADELANTADOS ===== */}
        {activeTab === 'advance' && (
          <div>
            <div className="flex-between mb-2">
              <div className="card-header">⏩ Pagos Adelantados</div>
              <Btn className="btn-sm"
                onClick={() => addItem('advancePayments', { amount: 0 })}>
                ➕ Agregar
              </Btn>
            </div>
            {shift.advancePayments.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center' }}>Sin pagos adelantados</p>
            )}
            {shift.advancePayments.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <Input label={`Pago adelantado #${i + 1}`} type="number" value={a.amount}
                  onChange={(e) => updateItem('advancePayments', i, 'amount', e.target.value)} />
                <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
                  onClick={() => removeItem('advancePayments', i)}>🗑️</Btn>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#6366f1', marginTop: 12 }}>
              Total Adelantos: {formatCurrency(totalAdvance)}
            </div>
          </div>
        )}

        {/* ===== TAB: ENTREGAS ===== */}
        {activeTab === 'deliveries' && (
          <div>
            <div className="flex-between mb-2">
              <div className="card-header">📥 Entregas de Dinero</div>
              <Btn className="btn-sm"
                onClick={() => update((s) => ({ ...s, deliveries: [...s.deliveries, ''] }))}>
                ➕ Agregar entrega
              </Btn>
            </div>
            {shift.deliveries.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
                Sin entregas registradas. Toca "Agregar entrega" para añadir.
              </p>
            )}
            {shift.deliveries.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <Input
                  label={`${i + 1}° Entrega`}
                  type="number"
                  value={d || ''}
                  placeholder="0.00"
                  onChange={(e) => {
                    const newDel = [...shift.deliveries];
                    newDel[i] = e.target.value;
                    update((s) => ({ ...s, deliveries: newDel }));
                  }}
                />
                <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
                  onClick={() => update((s) => ({ ...s, deliveries: s.deliveries.filter((_, idx) => idx !== i) }))}>
                  🗑️
                </Btn>
              </div>
            ))}
            <div style={{
              textAlign: 'right', fontSize: 20, fontWeight: 800, color: '#059669',
              marginTop: 16, padding: 16, background: '#0f172a', borderRadius: 12,
            }}>
              Total Entregado: {formatCurrency(totalDeliveries)}
            </div>
          </div>
        )}

        {/* ===== TAB: CUADRE DE TURNO ===== */}
        {activeTab === 'summary' && (
          <div>
            <div className="card-header">⚖️ Cuadre de Turno</div>

            {/* ── BLOQUE 1: LO QUE VENDISTE ── */}
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
                ⛽ LO QUE VENDISTE
              </div>
              {Object.entries(salesByProduct).map(([prod, data]) => (
                <div key={prod} className="summary-row summary-row-border">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProductTag product={prod} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
                  </span>
                  <span className="font-bold">{formatCurrency(data.amount)}</span>
                </div>
              ))}
              {isGLPShift && (shift.gasCylinders || []).filter(c => parseFloat(c.count) > 0).map((c, i) => (
                <div key={i} className="summary-row summary-row-border">
                  <span>🛢️ Balón {c.size} kg × {parseFloat(c.count) || 0}</span>
                  <span className="font-bold">{formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>TOTAL VENDIDO</span>
                <span style={{ fontWeight: 900, fontSize: 28, color: '#34d399' }}>{formatCurrency(totalSales)}</span>
              </div>
            </div>

            {/* ── BLOQUE 2: LO QUE NO ES EFECTIVO ── */}
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
                📤 LO QUE NO ES EFECTIVO (se descuenta)
              </div>
              {totalPayments > 0 && (
                <div className="summary-row summary-row-border">
                  <span>💳 Pagos electrónicos</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalPayments)}</span>
                </div>
              )}
              {totalCreditsAmount > 0 && (
                <div className="summary-row summary-row-border">
                  <span>📋 Créditos</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalCreditsAmount)}</span>
                </div>
              )}
              {totalPromosAmount > 0 && (
                <div className="summary-row summary-row-border">
                  <span>🎁 Promociones</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalPromosAmount)}</span>
                </div>
              )}
              {totalDiscountsAmount > 0 && (
                <div className="summary-row summary-row-border">
                  <span>🏷️ Descuentos</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalDiscountsAmount)}</span>
                </div>
              )}
              {totalExpenses > 0 && (
                <div className="summary-row summary-row-border">
                  <span>🧾 Gastos</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>− {formatCurrency(totalExpenses)}</span>
                </div>
              )}
              {totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses === 0 && (
                <div style={{ color: '#475569', textAlign: 'center', fontSize: 13, padding: '6px 0' }}>Sin deducciones</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Total a descontar</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#fbbf24' }}>
                  − {formatCurrency(totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses)}
                </span>
              </div>
            </div>

            {/* ── BLOQUE 3: EFECTIVO QUE DEBES ENTREGAR ── */}
            <div style={{
              background: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)',
              borderRadius: 12, padding: 20, marginBottom: 12,
              border: '2px solid #3b82f6',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: 1, marginBottom: 14, textAlign: 'center' }}>
                💵 EFECTIVO QUE DEBES ENTREGAR
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                <span>Total vendido</span>
                <span>{formatCurrency(totalSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                <span>Menos no-efectivo</span>
                <span>− {formatCurrency(totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses)}</span>
              </div>
              <div style={{ borderTop: '1px solid #1d4ed8', paddingTop: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>DEBES ENTREGAR</div>
                <div style={{ fontSize: 46, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expectedCash)}</div>
              </div>
            </div>

            {/* ── BLOQUE 4: LO QUE ENTREGASTE ── */}
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
                📥 LO QUE ENTREGASTE
              </div>
              {(shift.deliveries || []).filter(v => parseFloat(v) > 0).map((v, i) => (
                <div key={i} className="summary-row summary-row-border">
                  <span>Entrega #{i + 1}</span>
                  <span className="font-bold">{formatCurrency(parseFloat(v))}</span>
                </div>
              ))}
              {totalAdvance > 0 && (
                <div className="summary-row summary-row-border">
                  <span>Pagos adelantados</span>
                  <span className="font-bold">{formatCurrency(totalAdvance)}</span>
                </div>
              )}
              {totalDeliveries === 0 && totalAdvance === 0 && (
                <div style={{ color: '#475569', textAlign: 'center', fontSize: 13, padding: '6px 0' }}>Sin entregas registradas</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Total entregado</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: '#a78bfa' }}>{formatCurrency(totalDeliveries + totalAdvance)}</span>
              </div>
            </div>

            {/* ── CUADRE FINAL ── */}
            <div className={`cuadre-box ${Math.abs(difference) < 0.01 ? 'cuadre-ok' : 'cuadre-error'}`}>
              {Math.abs(difference) < 0.01 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 6 }}>TODO CUADRA</div>
                  <div style={{ fontSize: 13, color: '#6ee7b7', marginTop: 8 }}>
                    Entregaste exactamente lo que correspondía. ¡Buen trabajo!
                  </div>
                </div>
              ) : difference < 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>⚠️</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>FALTA DINERO</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', margin: '10px 0 6px' }}>{formatCurrency(Math.abs(difference))}</div>
                  <div style={{ fontSize: 13, color: '#fca5a5' }}>Falta este monto. Revisa tus entregas o agrega lo que falta.</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>⚠️</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>ENTREGASTE DE MÁS</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', margin: '10px 0 6px' }}>{formatCurrency(Math.abs(difference))}</div>
                  <div style={{ fontSize: 13, color: '#fca5a5' }}>Entregaste más de lo que correspondía. Verifica tus registros.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ===== MODAL: AGREGAR / EDITAR ÍTEM ===== */}
      {itemModal && (
        <div className="modal-overlay" onClick={() => setItemModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">
                {itemModal.idx === -1 ? '➕ Agregar' : '✏️ Editar'}{' '}
                {itemModal.type === 'payment' && `Pago — ${itemModal.data.method}`}
                {itemModal.type === 'credit' && `Crédito — ${itemModal.data.product}`}
                {itemModal.type === 'promo' && `Promoción — ${itemModal.data.product}`}
                {itemModal.type === 'discount' && `Descuento — ${itemModal.data.product}`}
              </div>
              <Btn variant="ghost" className="btn-icon" onClick={() => setItemModal(null)}>✕</Btn>
            </div>

            {/* ---- Campos: PAGO ---- */}
            {itemModal.type === 'payment' && (
              <div>
                <Select label="MÉTODO DE PAGO" value={itemModal.data.method}
                  onChange={(e) => setModalField('method', e.target.value)}
                  options={PAYMENT_METHODS} />
                <Input label="N° Referencia / Operación" value={itemModal.data.reference}
                  placeholder="Ej: 00123456"
                  onChange={(e) => setModalField('reference', e.target.value)} />
                <Input label="N° Factura (opcional)" value={itemModal.data.invoice}
                  placeholder="Ej: F001-123"
                  onChange={(e) => setModalField('invoice', e.target.value)} />
                <Input label="💰 Monto recibido (S/)" type="number" value={itemModal.data.amount}
                  placeholder="0.00"
                  onChange={(e) => setModalField('amount', e.target.value)}
                  style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
              </div>
            )}

            {/* ---- Campos: CRÉDITO ---- */}
            {itemModal.type === 'credit' && (
              <div>
                <Select label="PRODUCTO" value={itemModal.data.product}
                  onChange={(e) => setModalField('product', e.target.value)}
                  options={productOptions} />
                <Input label="Cliente / Empresa" value={itemModal.data.client}
                  placeholder="Nombre del cliente"
                  onChange={(e) => setModalField('client', e.target.value)} />
                <div className="grid-2">
                  <Input label="N° Vale" value={itemModal.data.voucher}
                    placeholder="Ej: V-001"
                    onChange={(e) => setModalField('voucher', e.target.value)} />
                  <Input label="N° Factura (opcional)" value={itemModal.data.invoice}
                    placeholder="Ej: F002-001"
                    onChange={(e) => setModalField('invoice', e.target.value)} />
                </div>
                <Input label="⛽ Galones despachados" type="number" value={itemModal.data.gallons}
                  placeholder="0.000"
                  onChange={(e) => setModalField('gallons', e.target.value)}
                  style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
                {(parseFloat(itemModal.data.gallons) || 0) > 0 && (
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#f59e0b', marginTop: -4, marginBottom: 8 }}>
                    ≈ {formatCurrency((parseFloat(itemModal.data.gallons) || 0) * (prices[itemModal.data.product] || 0))}
                  </div>
                )}
              </div>
            )}

            {/* ---- Campos: PROMOCIÓN ---- */}
            {itemModal.type === 'promo' && (
              <div>
                <Select label="PRODUCTO" value={itemModal.data.product}
                  onChange={(e) => setModalField('product', e.target.value)}
                  options={productOptions} />
                <Input label="DNI o Placa del vehículo" value={itemModal.data.dniPlate}
                  placeholder="Ej: ABC-123 o 12345678"
                  onChange={(e) => setModalField('dniPlate', e.target.value)} />
                <Input label="⛽ Galones entregados" type="number" value={itemModal.data.gallons}
                  placeholder="0.000"
                  onChange={(e) => setModalField('gallons', e.target.value)}
                  style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
                {(parseFloat(itemModal.data.gallons) || 0) > 0 && (
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#8b5cf6', marginTop: -4, marginBottom: 8 }}>
                    ≈ {formatCurrency((parseFloat(itemModal.data.gallons) || 0) * (prices[itemModal.data.product] || 0))}
                  </div>
                )}
              </div>
            )}

            {/* ---- Campos: DESCUENTO ---- */}
            {itemModal.type === 'discount' && (
              <div>
                <Select label="PRODUCTO" value={itemModal.data.product}
                  onChange={(e) => setModalField('product', e.target.value)}
                  options={productOptions} />
                <Input label="Cliente / Empresa" value={itemModal.data.client}
                  placeholder="Nombre del cliente"
                  onChange={(e) => setModalField('client', e.target.value)} />
                <div className="grid-2">
                  <Input label="⛽ Galones vendidos" type="number" value={itemModal.data.gallons}
                    placeholder="0.000"
                    onChange={(e) => setModalField('gallons', e.target.value)}
                    style={{ fontWeight: 800 }} />
                  <Input label="💰 Precio especial (S/ por galón)" type="number" value={itemModal.data.price}
                    placeholder={`Normal: ${prices[itemModal.data.product] || '—'}`}
                    onChange={(e) => setModalField('price', e.target.value)}
                    style={{ fontWeight: 800 }} />
                </div>
                {(parseFloat(itemModal.data.gallons) || 0) > 0 && (parseFloat(itemModal.data.price) || 0) > 0 && (
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#ef4444', marginBottom: 8 }}>
                    Total: {formatCurrency((parseFloat(itemModal.data.gallons) || 0) * (parseFloat(itemModal.data.price) || 0))}
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {itemModal.idx !== -1 && (
                <Btn variant="danger" style={{ padding: '12px 16px', flexShrink: 0 }}
                  onClick={handleModalDelete}>
                  🗑️
                </Btn>
              )}
              <Btn variant="ghost" className="btn-full" style={{ padding: 14 }}
                onClick={() => setItemModal(null)}>
                Cancelar
              </Btn>
              <Btn className="btn-full" style={{ padding: 14, fontWeight: 800 }}
                onClick={handleModalSave}>
                ✅ Guardar
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRMACIÓN DE CIERRE ===== */}
      {confirmClose && (
        <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              ¿Seguro que quieres terminar tu turno?
            </div>
            <p className="text-muted" style={{ marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
              Una vez cerrado, <strong>ya no podrás hacer cambios</strong> en los datos
              de este turno. Se generará un resumen para imprimir.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn
                variant="ghost"
                className="btn-full"
                style={{ padding: 14, fontSize: 15 }}
                onClick={() => setConfirmClose(false)}
              >
                ↩️ No, seguir trabajando
              </Btn>
              <Btn
                variant="danger"
                className="btn-full"
                style={{ padding: 14, fontSize: 15 }}
                onClick={handleConfirmClose}
              >
                ✅ Sí, cerrar turno
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE: Resumen Imprimible del Turno
// Se muestra después de cerrar el turno
// ============================================
const ShiftSummaryPrint = ({ shift, prices, onDismiss }) => {
  const balance = calcShiftBalance(shift, prices);
  const islandCfg = ISLANDS_CONFIG.find((i) => i.id.toString() === shift.island);
  const isGLP = islandCfg?.isGLP;
  const cuadra = Math.abs(balance.difference) < 0.01;

  return (
    <div>
      {/* Botones de acción — NO se imprimen */}
      <div className="flex-between mb-2 no-print">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
            ✅ Turno Cerrado
          </h2>
          <p className="text-muted">Revisa el resumen e imprímelo antes de salir</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn
            variant="success"
            style={{ padding: '12px 28px', fontSize: 15 }}
            onClick={() => window.print()}
          >
            🖨️ Imprimir
          </Btn>
          <Btn
            variant="ghost"
            style={{ padding: '12px 24px', fontSize: 15 }}
            onClick={onDismiss}
          >
            ⛽ Iniciar Nuevo Turno
          </Btn>
        </div>
      </div>

      {/* ======= ÁREA DE IMPRESIÓN ======= */}
      <div id="print-area">

        {/* Encabezado del reporte */}
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>⛽ GRIFO — Control de Ventas</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Resumen de Turno</div>
          </div>
          <div className="grid-2">
            <div style={{ padding: '6px 0' }}><strong>Trabajador:</strong> {shift.worker}</div>
            <div style={{ padding: '6px 0' }}><strong>Fecha:</strong> {shift.date}</div>
            <div style={{ padding: '6px 0' }}><strong>Turno:</strong> {shift.shift}</div>
            <div style={{ padding: '6px 0' }}><strong>Isla:</strong> {islandCfg?.name || `Isla ${shift.island}`}</div>
          </div>
        </Card>

        {/* Contómetros */}
        <Card>
          <div className="card-header">⛽ Lecturas de Contómetros</div>
          {islandCfg && islandCfg.faces.map((face) => (
            <div key={face.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                {face.label}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Inicio</th>
                    <th>Final</th>
                    <th>Galones</th>
                    <th>Total S/</th>
                  </tr>
                </thead>
                <tbody>
                  {face.dispensers.map((d) => {
                    const m = shift.meters[d.key] || { start: 0, end: null };
                    const gal = calcGallons(m.start, m.end);
                    return (
                      <tr key={d.key}>
                        <td>
                          <ProductTag product={d.product} />
                          {' '}
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{d.label}</span>
                        </td>
                        <td>{parseFloat(m.start || 0).toFixed(3)}</td>
                        <td style={{ color: '#34d399' }}>
                          {m.end !== null && m.end !== '' ? parseFloat(m.end).toFixed(3) : '—'}
                        </td>
                        <td className="font-bold text-primary">{gal.toFixed(3)}</td>
                        <td className="font-bold text-success">
                          {formatCurrency(gal * (prices[d.product] || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </Card>

        {/* Balones GLP */}
        {isGLP && (shift.gasCylinders || []).length > 0 && (
          <Card>
            <div className="card-header">🛢️ Balones GLP</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tamaño</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(shift.gasCylinders || []).map((c, i) => (
                  <tr key={i}>
                    <td>{c.size} kg</td>
                    <td>{parseFloat(c.count) || 0}</td>
                    <td>{formatCurrency(parseFloat(c.price) || 0)}</td>
                    <td className="font-bold text-success">
                      {formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Pagos electrónicos */}
        {shift.payments.length > 0 && (
          <Card>
            <div className="card-header">💳 Pagos Electrónicos</div>
            <table className="data-table">
              <thead>
                <tr><th>Método</th><th>Referencia</th><th>Factura</th><th>Monto S/</th></tr>
              </thead>
              <tbody>
                {shift.payments.map((p, i) => (
                  <tr key={i}>
                    <td>{p.method}</td>
                    <td>{p.reference || '—'}</td>
                    <td>{p.invoice || '—'}</td>
                    <td className="font-bold">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Créditos */}
        {shift.credits.length > 0 && (
          <Card>
            <div className="card-header">📄 Créditos</div>
            <table className="data-table">
              <thead>
                <tr><th>Producto</th><th>Cliente</th><th>Vale</th><th>Galones</th><th>Monto</th></tr>
              </thead>
              <tbody>
                {shift.credits.map((c, i) => (
                  <tr key={i}>
                    <td><ProductTag product={c.product} /></td>
                    <td>{c.client}</td>
                    <td>{c.voucher || '—'}</td>
                    <td>{formatGallons(parseFloat(c.gallons) || 0)}</td>
                    <td className="font-bold">
                      {formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Gastos */}
        {shift.expenses.length > 0 && (
          <Card>
            <div className="card-header">🧾 Gastos</div>
            <table className="data-table">
              <thead>
                <tr><th>Detalle</th><th>Monto S/</th></tr>
              </thead>
              <tbody>
                {shift.expenses.map((e, i) => (
                  <tr key={i}>
                    <td>{e.detail}</td>
                    <td className="font-bold text-danger">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Cuadre final */}
        <Card>
          <div className="card-header">⚖️ Cuadre Final</div>
          <div className="summary-section">
            {(() => {
              const expCash = balance.totalSales - balance.totalPayments - balance.totalCredits - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
              const totalNonCash = balance.totalPayments + balance.totalCredits + balance.totalPromos + balance.totalDiscounts + balance.totalExpenses;
              return (
                <>
                  {/* Bloque 1: Lo que vendiste */}
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>⛽ LO QUE VENDISTE</div>
                    {Object.entries(balance.salesByProd).map(([prod, data]) => (
                      <div key={prod} className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ProductTag product={prod} />
                          <span style={{ fontSize: 11, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
                        </span>
                        <span className="font-bold">{formatCurrency(data.amount)}</span>
                      </div>
                    ))}
                    {isGLP && balance.cylinderSales > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>🛢️ Balones GLP</span>
                        <span className="font-bold">{formatCurrency(balance.cylinderSales)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 6 }}>
                      <span style={{ fontWeight: 800 }}>TOTAL VENDIDO</span>
                      <span style={{ fontWeight: 900, fontSize: 20, color: '#34d399' }}>{formatCurrency(balance.totalSales)}</span>
                    </div>
                  </div>

                  {/* Bloque 2: Lo que no es efectivo */}
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>📤 LO QUE NO ES EFECTIVO</div>
                    {balance.totalPayments > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>💳 Pagos electrónicos</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(balance.totalPayments)}</span>
                      </div>
                    )}
                    {balance.totalCredits > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>📋 Créditos</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(balance.totalCredits)}</span>
                      </div>
                    )}
                    {balance.totalPromos > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>🎁 Promociones</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(balance.totalPromos)}</span>
                      </div>
                    )}
                    {balance.totalDiscounts > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>🏷️ Descuentos</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(balance.totalDiscounts)}</span>
                      </div>
                    )}
                    {balance.totalExpenses > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>🧾 Gastos</span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>− {formatCurrency(balance.totalExpenses)}</span>
                      </div>
                    )}
                    {totalNonCash === 0 && (
                      <div style={{ color: '#475569', textAlign: 'center', fontSize: 12, padding: '4px 0' }}>Sin deducciones</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 6 }}>
                      <span style={{ fontWeight: 700 }}>Total a descontar</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#fbbf24' }}>− {formatCurrency(totalNonCash)}</span>
                    </div>
                  </div>

                  {/* Bloque 3: Efectivo que debías entregar */}
                  <div style={{ background: '#172554', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid #3b82f6' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', marginBottom: 10, textAlign: 'center' }}>
                      💵 EFECTIVO QUE DEBÍAS ENTREGAR
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      <span>Total vendido</span><span>{formatCurrency(balance.totalSales)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                      <span>Menos no-efectivo</span><span>− {formatCurrency(totalNonCash)}</span>
                    </div>
                    <div style={{ textAlign: 'center', borderTop: '1px solid #1d4ed8', paddingTop: 10 }}>
                      <div style={{ fontSize: 34, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expCash)}</div>
                    </div>
                  </div>

                  {/* Bloque 4: Lo que entregaste */}
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>📥 LO QUE ENTREGASTE</div>
                    {(shift.deliveries || []).filter(v => parseFloat(v) > 0).map((v, i) => (
                      <div key={i} className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>Entrega #{i + 1}</span>
                        <span className="font-bold">{formatCurrency(parseFloat(v))}</span>
                      </div>
                    ))}
                    {balance.totalAdvance > 0 && (
                      <div className="summary-row summary-row-border" style={{ fontSize: 13 }}>
                        <span>Pagos adelantados</span>
                        <span className="font-bold">{formatCurrency(balance.totalAdvance)}</span>
                      </div>
                    )}
                    {balance.totalDeliveries === 0 && balance.totalAdvance === 0 && (
                      <div style={{ color: '#475569', textAlign: 'center', fontSize: 12, padding: '4px 0' }}>Sin entregas registradas</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 6 }}>
                      <span style={{ fontWeight: 700 }}>Total entregado</span>
                      <span style={{ fontWeight: 900, fontSize: 18, color: '#a78bfa' }}>{formatCurrency(balance.totalDeliveries + balance.totalAdvance)}</span>
                    </div>
                  </div>

                  {/* Cuadre final */}
                  <div className={`cuadre-box ${cuadra ? 'cuadre-ok' : 'cuadre-error'}`} style={{ marginTop: 4 }}>
                    {cuadra ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 36 }}>✅</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', marginTop: 6 }}>TURNO CUADRADO</div>
                        <div style={{ fontSize: 12, color: '#6ee7b7', marginTop: 6 }}>{shift.worker} — {shift.shift} — {shift.date}</div>
                        <div style={{ fontSize: 12, color: '#6ee7b7', marginTop: 4 }}>Entregaste exactamente lo que correspondía. ¡Buen trabajo!</div>
                      </div>
                    ) : balance.difference < 0 ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 36 }}>⚠️</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>FALTA DINERO</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', margin: '8px 0' }}>{formatCurrency(Math.abs(balance.difference))}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{shift.worker} — {shift.shift} — {shift.date}</div>
                        <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>Falta este monto. Revisa tus entregas.</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 36 }}>⚠️</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>ENTREGASTE DE MÁS</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', margin: '8px 0' }}>{formatCurrency(Math.abs(balance.difference))}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{shift.worker} — {shift.shift} — {shift.date}</div>
                        <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>Entregaste más de lo que correspondía.</div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* Botones al final — NO se imprimen */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
        <Btn
          variant="success"
          style={{ padding: '14px 36px', fontSize: 16 }}
          onClick={() => window.print()}
        >
          🖨️ Imprimir Resumen
        </Btn>
        <Btn
          variant="ghost"
          style={{ padding: '14px 28px', fontSize: 16 }}
          onClick={onDismiss}
        >
          ⛽ Iniciar Nuevo Turno
        </Btn>
      </div>
    </div>
  );
};

export default WorkerShiftPage;
