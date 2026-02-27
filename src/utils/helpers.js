import { ISLANDS_CONFIG } from './constants';

// ============================================
// FORMATO DE MONEDA (SOLES)
// ============================================
export const formatCurrency = (n) => {
  const num = parseFloat(n);
  return `S/ ${(isNaN(num) || !isFinite(num) ? 0 : num).toFixed(2)}`;
};

// ============================================
// FORMATO DE MONEDA CON SIGNO (+/-)
// Para mostrar diferencias y cuadres
// ============================================
export const formatSignedCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num) || !isFinite(num) || Math.abs(num) < 0.01) return 'S/ 0.00';
  const sign = num > 0 ? '+' : '-';
  return `${sign}S/ ${Math.abs(num).toFixed(2)}`;
};

// ============================================
// FORMATO DE GALONES
// ============================================
export const formatGallons = (n) => {
  const num = parseFloat(n);
  return `${(isNaN(num) || !isFinite(num) ? 0 : num).toFixed(3)} gal`;
};

// ============================================
// CÁLCULO DE GALONES VENDIDOS
// Galones = Contómetro Final - Contómetro Inicio
// ============================================
export const calcGallons = (start, end) => {
  if (end === null || end === '' || end === undefined || start === null) return 0;
  const result = parseFloat(end) - parseFloat(start);
  if (isNaN(result) || !isFinite(result)) return 0;
  return Math.max(0, result);
};

// ============================================
// GENERAR CONTÓMETROS VACÍOS PARA TODAS LAS
// ISLAS, CARAS Y DISPENSADORES
// Cada metro guarda su producto para facilitar
// los cálculos sin tener que parsear la clave
// ============================================
export const generateMeters = () => {
  const meters = {};
  ISLANDS_CONFIG.forEach((island) => {
    island.faces.forEach((face) => {
      face.dispensers.forEach((dispenser) => {
        meters[dispenser.key] = {
          start: 0,
          end: null,
          product: dispenser.product,
        };
      });
    });
  });
  return meters;
};

// ============================================
// CREAR UN TURNO VACÍO
// ============================================
export const createEmptyShift = () => ({
  id: Date.now(),
  worker: '',
  island: '',
  date: new Date().toISOString().split('T')[0],
  shift: 'Mañana',
  meters: generateMeters(),
  payments: [],        // { method, reference, invoice, amount }
  credits: [],         // { product, client, voucher, invoice, gallons }
  promotions: [],      // { product, dniPlate, gallons }
  discounts: [],       // { product, client, gallons, price }
  expenses: [],        // { detail, amount }
  advancePayments: [], // { amount }
  deliveries: [],
  gasCylinders: [],    // { size, count, price }  — solo Isla 3 GLP
  hasCarryover: false,
  status: 'open',
});

// ============================================
// CALCULAR VENTAS POR PRODUCTO DE UN TURNO
// Usa m.product (guardado en el metro) para
// evitar parsear la clave manualmente
// Solo incluye metros con galones > 0
// ============================================
export const calcSalesByProduct = (shift, prices) => {
  const result = {};
  Object.entries(shift.meters).forEach(([, m]) => {
    const prod = m.product;
    if (!prod) return;
    const gal = calcGallons(m.start, m.end);
    if (gal === 0) return;
    if (!result[prod]) result[prod] = { gallons: 0, amount: 0 };
    result[prod].gallons += gal;
    result[prod].amount += gal * (prices[prod] || 0);
  });
  return result;
};

// ============================================
// CALCULAR BALANCE COMPLETO DE UN TURNO
// Devuelve todos los totales y la diferencia
// ============================================
export const calcShiftBalance = (shift, prices) => {
  const salesByProd = calcSalesByProduct(shift, prices);
  const meterSales = Object.values(salesByProd).reduce((s, v) => s + v.amount, 0);

  const cylinderSales = (shift.gasCylinders || []).reduce(
    (s, c) => s + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0),
    0
  );
  const totalSales = meterSales + cylinderSales;

  const totalPayments = sumField(shift.payments, 'amount');
  const totalExpenses = sumField(shift.expenses, 'amount');
  const totalAdvance = sumField(shift.advancePayments, 'amount');
  const totalDeliveries = sumArray(shift.deliveries);

  const totalCredits = (shift.credits || []).reduce(
    (s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0),
    0
  );
  const totalPromos = (shift.promotions || []).reduce(
    (s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0),
    0
  );
  const totalDiscounts = (shift.discounts || []).reduce(
    (s, d) => s + (parseFloat(d.gallons) || 0) * (parseFloat(d.price) || 0),
    0
  );

  const difference =
    totalDeliveries + totalPayments + totalAdvance - totalSales +
    totalCredits + totalPromos + totalDiscounts + totalExpenses;

  return {
    salesByProd,
    meterSales,
    cylinderSales,
    totalSales,
    totalPayments,
    totalExpenses,
    totalAdvance,
    totalDeliveries,
    totalCredits,
    totalPromos,
    totalDiscounts,
    difference,
  };
};

// ============================================
// CALCULAR TOTAL DE VENTAS DE UN TURNO
// (contómetros + balones)
// ============================================
export const calcShiftTotal = (shift, prices) => {
  return calcShiftBalance(shift, prices).totalSales;
};

// ============================================
// SUMAR ARRAY DE OBJETOS POR UN CAMPO
// ============================================
export const sumField = (arr, field) => {
  return (arr || []).reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
};

// ============================================
// SUMAR ARRAY DE NÚMEROS
// ============================================
export const sumArray = (arr) => {
  return (arr || []).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
};

// ============================================
// OBTENER FECHA DE HOY EN FORMATO YYYY-MM-DD
// ============================================
export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// ============================================
// OBTENER CONTÓMETROS DE ARRASTRE DEL ÚLTIMO
// TURNO CERRADO PARA UNA ISLA ESPECÍFICA
// El valor final del turno anterior se convierte
// en el valor inicial del nuevo turno
// ============================================
export const getCarryoverMeters = (shifts, islandId) => {
  const islandStr = islandId.toString();
  const closedForIsland = shifts.filter(
    (s) => s.island === islandStr && s.status === 'closed'
  );
  if (closedForIsland.length === 0) return {};

  const SHIFT_ORD = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };
  const lastShift = [...closedForIsland].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date); // fecha más reciente primero
    return (SHIFT_ORD[b.shift] ?? 99) - (SHIFT_ORD[a.shift] ?? 99); // turno más reciente primero
  })[0];

  const carryover = {};
  Object.entries(lastShift.meters).forEach(([key, m]) => {
    if (key.startsWith(`${islandStr}-`)) {
      const endValue =
        m.end !== null && m.end !== '' && m.end !== undefined
          ? parseFloat(m.end)
          : parseFloat(m.start) || 0;
      carryover[key] = { start: endValue, end: null, product: m.product };
    }
  });
  return carryover;
};
