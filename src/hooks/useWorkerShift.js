import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  calcSalesByProduct, sumField, sumArray,
  createEmptyShift, getCarryoverMeters,
} from '../utils/helpers';
import { ISLANDS_CONFIG, SHIFT_OPTIONS } from '../utils/constants';

export function useWorkerShift() {
  const {
    currentUser, shifts, addShift, updateShift, closeShift,
    prices, lastClosedShift, setLastClosedShift,
  } = useApp();

  const [activeTab, setActiveTab] = useState('meters');

  // Turno abierto del trabajador actual
  const shift = shifts.find((s) => s.worker === currentUser.name && s.status === 'open');

  const update = useCallback(
    (updater) => { if (shift) updateShift(shift.id, updater); },
    [shift, updateShift]
  );

  // ---- CONFIGURACIÓN DE ISLA ----
  const islandConfig = useMemo(
    () => ISLANDS_CONFIG.find((isl) => isl.id.toString() === (shift?.island || '')),
    [shift]
  );

  // ---- CÁLCULOS ----
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
    if (!shift?.gasCylinders) return 0;
    return shift.gasCylinders.reduce(
      (s, c) => s + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0), 0
    );
  }, [shift]);

  const totalSales = useMemo(
    () => totalMeterSales + totalCylindersAmount,
    [totalMeterSales, totalCylindersAmount]
  );

  const totalPayments = useMemo(
    () => (shift ? sumField(shift.payments, 'amount') : 0), [shift]
  );

  const totalExpenses = useMemo(
    () => (shift ? sumField(shift.expenses, 'amount') : 0), [shift]
  );

  const totalAdvance = useMemo(
    () => (shift ? sumField(shift.advancePayments, 'amount') : 0), [shift]
  );

  const totalDeliveries = useMemo(
    () => (shift ? sumArray(shift.deliveries) : 0), [shift]
  );

  const totalCreditsAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.credits.reduce(
      (s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0
    );
  }, [shift, prices]);

  const totalPromosAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.promotions.reduce(
      (s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0
    );
  }, [shift, prices]);

  const totalDiscountsAmount = useMemo(() => {
    if (!shift) return 0;
    return shift.discounts.reduce(
      (s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)), 0
    );
  }, [shift, prices]);

  const expectedCash = totalSales - totalPayments - totalCreditsAmount - totalPromosAmount - totalDiscountsAmount - totalExpenses;
  const difference = totalDeliveries + totalPayments + totalAdvance - totalSales + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses;

  // ---- CRUD GENÉRICO ----
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
      meters: { ...s.meters, [meterKey]: { ...s.meters[meterKey], end: value } },
    }));
  };

  // ---- FORMULARIO DE INICIO ----
  const [startForm, setStartForm] = useState({
    island: ISLANDS_CONFIG[0].id.toString(),
    date: new Date().toISOString().split('T')[0],
    shift: 'Mañana',
  });

  const carryoverMeters = useMemo(
    () => getCarryoverMeters(shifts, startForm.island),
    [shifts, startForm.island]
  );

  const existingSlotConflict = useMemo(() =>
    shifts.some(
      (s) => s.island === startForm.island && s.date === startForm.date && s.shift === startForm.shift
    ),
    [shifts, startForm]
  );

  const shiftsForSelectedDate = useMemo(
    () => shifts.filter((s) => s.date === startForm.date),
    [shifts, startForm.date]
  );

  const maxShiftsPerDay = ISLANDS_CONFIG.length * SHIFT_OPTIONS.length;
  const isDayFull = shiftsForSelectedDate.length >= maxShiftsPerDay;

  // ---- CIERRE DE TURNO ----
  const [confirmClose, setConfirmClose] = useState(false);

  const handleConfirmClose = () => {
    setLastClosedShift({ ...shift });
    closeShift(shift.id);
    setConfirmClose(false);
  };

  // ---- MODAL DE ÍTEMS ----
  const [itemModal, setItemModal] = useState(null);

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

  // ---- INICIO DE TURNO ----
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

  const calcs = {
    salesByProduct, totalMeterSales, totalGallons, totalCylindersAmount,
    totalSales, totalPayments, totalExpenses, totalAdvance, totalDeliveries,
    totalCreditsAmount, totalPromosAmount, totalDiscountsAmount, expectedCash, difference,
  };

  const actions = { update, addItem, removeItem, updateItem, updateMeterEnd, openAddModal, openEditModal };

  return {
    currentUser, shift, prices, islandConfig,
    activeTab, setActiveTab,
    startForm, setStartForm,
    confirmClose, setConfirmClose,
    itemModal, setItemModal, setModalField, handleModalSave, handleModalDelete,
    handleConfirmClose, handleStartShift,
    carryoverMeters, existingSlotConflict, isDayFull,
    shiftsForSelectedDate, maxShiftsPerDay,
    lastClosedShift, setLastClosedShift,
    calcs, actions,
  };
}
