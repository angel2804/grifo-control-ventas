// ============================================
// CONFIGURACIÓN DE PRECIOS INICIALES
// ============================================
export const INITIAL_PRICES = {
  BIO: 16.49,
  REGULAR: 14.49,
  PREMIUM: 17.29,
  GLP: 7.99,
};

// ============================================
// CONFIGURACIÓN DE ISLAS Y DISPENSADORES
// Isla 1: 2 caras × (2 BIO + 1 REG + 1 PREM) = 4 contómetros/cara
// Isla 2: igual que Isla 1
// Isla 3: 2 caras × 2 GLP = 2 contómetros/cara (también balones)
// ============================================
export const ISLANDS_CONFIG = [
  {
    id: 1,
    name: 'Isla 1',
    isGLP: false,
    faces: [
      {
        id: '1A',
        label: 'Cara A',
        dispensers: [
          { key: '1-1A-BIO-1', product: 'BIO', label: 'BIO #1' },
          { key: '1-1A-BIO-2', product: 'BIO', label: 'BIO #2' },
          { key: '1-1A-REGULAR', product: 'REGULAR', label: 'REGULAR' },
          { key: '1-1A-PREMIUM', product: 'PREMIUM', label: 'PREMIUM' },
        ],
      },
      {
        id: '1B',
        label: 'Cara B',
        dispensers: [
          { key: '1-1B-BIO-1', product: 'BIO', label: 'BIO #1' },
          { key: '1-1B-BIO-2', product: 'BIO', label: 'BIO #2' },
          { key: '1-1B-REGULAR', product: 'REGULAR', label: 'REGULAR' },
          { key: '1-1B-PREMIUM', product: 'PREMIUM', label: 'PREMIUM' },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Isla 2',
    isGLP: false,
    faces: [
      {
        id: '2A',
        label: 'Cara A',
        dispensers: [
          { key: '2-2A-BIO-1', product: 'BIO', label: 'BIO #1' },
          { key: '2-2A-BIO-2', product: 'BIO', label: 'BIO #2' },
          { key: '2-2A-REGULAR', product: 'REGULAR', label: 'REGULAR' },
          { key: '2-2A-PREMIUM', product: 'PREMIUM', label: 'PREMIUM' },
        ],
      },
      {
        id: '2B',
        label: 'Cara B',
        dispensers: [
          { key: '2-2B-BIO-1', product: 'BIO', label: 'BIO #1' },
          { key: '2-2B-BIO-2', product: 'BIO', label: 'BIO #2' },
          { key: '2-2B-REGULAR', product: 'REGULAR', label: 'REGULAR' },
          { key: '2-2B-PREMIUM', product: 'PREMIUM', label: 'PREMIUM' },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Isla 3 (GLP)',
    isGLP: true,
    faces: [
      {
        id: '3A',
        label: 'Cara A',
        dispensers: [
          { key: '3-3A-GLP-1', product: 'GLP', label: 'GLP #1' },
          { key: '3-3A-GLP-2', product: 'GLP', label: 'GLP #2' },
        ],
      },
      {
        id: '3B',
        label: 'Cara B',
        dispensers: [
          { key: '3-3B-GLP-1', product: 'GLP', label: 'GLP #1' },
          { key: '3-3B-GLP-2', product: 'GLP', label: 'GLP #2' },
        ],
      },
    ],
  },
];

// ============================================
// COLORES POR PRODUCTO
// ============================================
export const PRODUCT_COLORS = {
  BIO: { bg: '#065f46', text: '#ecfdf5', accent: '#34d399', light: '#d1fae5', className: 'tag-bio' },
  REGULAR: { bg: '#1e40af', text: '#eff6ff', accent: '#60a5fa', light: '#dbeafe', className: 'tag-regular' },
  PREMIUM: { bg: '#9f1239', text: '#fff1f2', accent: '#fb7185', light: '#ffe4e6', className: 'tag-premium' },
  GLP: { bg: '#b45309', text: '#fffbeb', accent: '#fbbf24', light: '#fef3c7', className: 'tag-glp' },
};

// ============================================
// LISTA DE PRODUCTOS
// ============================================
export const PRODUCTS_LIST = ['BIO', 'REGULAR', 'PREMIUM', 'GLP'];

// ============================================
// OPCIONES DE TURNO
// ============================================
export const SHIFT_OPTIONS = [
  { value: 'Mañana', label: 'Mañana' },
  { value: 'Tarde', label: 'Tarde' },
  { value: 'Noche', label: 'Noche' },
];

// ============================================
// MÉTODOS DE PAGO
// ============================================
export const PAYMENT_METHODS = [
  { value: 'VISA', label: 'VISA' },
  { value: 'YAPE', label: 'YAPE' },
  { value: 'Transferencia', label: 'Transferencia' },
];

// ============================================
// TAMAÑOS DE BALONES GLP (KG)
// ============================================
export const CYLINDER_SIZES = [
  { value: '5', label: '5 kg' },
  { value: '10', label: '10 kg' },
  { value: '15', label: '15 kg' },
  { value: '25', label: '25 kg' },
  { value: '45', label: '45 kg' },
];

// ============================================
// DÍAS DE LA SEMANA
// ============================================
export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Retorna el nombre del día actual en español
export const getCurrentDayOfWeek = () => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date().getDay()];
};

// ============================================
// USUARIO ADMINISTRADOR POR DEFECTO
// Cambia la contraseña desde la sección Usuarios
// ============================================
export const INITIAL_USERS = [
  { id: 1, name: 'Admin', username: 'admin', password: 'admin123', role: 'admin' },
];

export const DEMO_SHIFTS = [];
