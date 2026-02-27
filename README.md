# ⛽ GRIFO - Control de Ventas por Turno

Sistema web para control de ventas de un grifo (gasolinera), basado en contómetros de dispensadores.

---

## 📋 REQUISITOS PREVIOS

Necesitas tener instalado en tu computadora:

1. **Node.js** (versión 16 o superior)
   - Descarga: https://nodejs.org/
   - Descarga la versión LTS (la de la izquierda)
   - Instálalo dándole "Siguiente" a todo

2. **Visual Studio Code**
   - Descarga: https://code.visualstudio.com/

---

## 🚀 PASOS PARA EJECUTAR EL PROYECTO

### Paso 1: Descomprimir el ZIP
Descomprime el archivo `grifo-control-ventas.zip` en una carpeta de tu preferencia.

### Paso 2: Abrir en VS Code
- Abre Visual Studio Code
- Ve a `Archivo > Abrir Carpeta`
- Selecciona la carpeta `grifo-app`

### Paso 3: Abrir la Terminal
- En VS Code, ve a `Terminal > Nueva Terminal`
  (o presiona Ctrl + Ñ)

### Paso 4: Instalar dependencias
Escribe en la terminal:
```
npm install
```
Espera a que termine (puede tomar 1-2 minutos).

### Paso 5: Ejecutar la aplicación
Escribe en la terminal:
```
npm start
```
Se abrirá automáticamente en tu navegador en: http://localhost:3000

---

## 👤 CREDENCIALES DE PRUEBA

| Usuario   | Contraseña  | Rol           |
|-----------|-------------|---------------|
| admin     | admin123    | Administrador |
| carlos    | carlos123   | Grifero       |
| maria     | maria123    | Grifero       |

---

## 📂 ESTRUCTURA DEL PROYECTO

```
grifo-app/
├── public/
│   └── index.html              ← Página HTML base
├── src/
│   ├── components/
│   │   ├── UIComponents.js     ← Componentes reutilizables (Card, Input, Modal, etc.)
│   │   └── Sidebar.js          ← Barra lateral de navegación
│   ├── context/
│   │   └── AppContext.js       ← Estado global (usuarios, turnos, precios)
│   ├── pages/
│   │   ├── LoginPage.js        ← Página de inicio de sesión
│   │   ├── DashboardPage.js    ← Dashboard con resumen
│   │   ├── PricesPage.js       ← Gestión de precios (admin)
│   │   ├── MetersPage.js       ← Contómetros de inicio (admin)
│   │   ├── UsersPage.js        ← Gestión de usuarios (admin)
│   │   ├── ShiftsPage.js       ← Gestión de turnos (admin)
│   │   ├── WorkerShiftPage.js  ← Turno del grifero (registro completo)
│   │   └── ReportsPage.js      ← Reportes y detalle de turnos
│   ├── styles/
│   │   ├── global.css          ← Estilos generales
│   │   ├── sidebar.css         ← Estilos de la barra lateral
│   │   └── login.css           ← Estilos de la página de login
│   ├── utils/
│   │   ├── constants.js        ← Configuración (precios, islas, productos)
│   │   └── helpers.js          ← Funciones de cálculo y formato
│   ├── App.js                  ← Componente principal
│   └── index.js                ← Punto de entrada
└── package.json                ← Dependencias del proyecto
```

---

## 🧠 EXPLICACIÓN POR ARCHIVO

### `utils/constants.js`
Aquí están todos los datos de configuración:
- Precios iniciales de BIO, REGULAR, PREMIUM, GLP
- Configuración de islas (cuántas caras, qué productos)
- Colores de cada producto
- Usuarios de demostración

### `utils/helpers.js`
Funciones que hacen los cálculos:
- `calcGallons(inicio, final)` → Calcula galones vendidos
- `formatCurrency(numero)` → Formatea a soles: "S/ 100.00"
- `calcSalesByProduct(turno, precios)` → Ventas por producto
- `createEmptyShift()` → Crea un turno vacío

### `context/AppContext.js`
Maneja el estado global de la app (como una "memoria central"):
- Usuario logueado
- Lista de precios
- Lista de usuarios
- Lista de turnos
- Funciones para agregar, editar y eliminar datos

### `components/UIComponents.js`
Piezas reutilizables de la interfaz:
- `Card` → Tarjeta contenedora
- `Input` → Campo de texto
- `Select` → Selector desplegable
- `Btn` → Botón con variantes
- `Modal` → Ventana emergente
- `StatCard` → Tarjeta de estadística
- `ProductTag` → Etiqueta de producto con color

### `pages/WorkerShiftPage.js` (EL MÁS IMPORTANTE)
Es la página donde el grifero registra TODO su turno:
- Contómetros finales
- Pagos (VISA, YAPE, Transferencia)
- Créditos, Promociones, Descuentos
- Gastos, Pagos adelantados
- Entregas de dinero (hasta 10)
- Cuadre automático (verde = OK, rojo = diferencia)

---

## ⚙️ CÓMO FUNCIONA EL FLUJO

1. **Admin** crea un turno → asigna trabajador + isla + fecha
2. **Admin** configura contómetros de INICIO
3. **Grifero** entra con su cuenta → ve "Mi Turno"
4. **Grifero** ingresa contómetro FINAL de cada producto
5. El sistema calcula automáticamente: galones × precio = venta
6. **Grifero** registra pagos, créditos, gastos, entregas
7. El sistema muestra el CUADRE automáticamente

---

## ❓ PROBLEMAS COMUNES

**"npm: command not found"**
→ Instala Node.js desde https://nodejs.org/ y reinicia VS Code.

**La página no carga**
→ Asegúrate de estar en la carpeta correcta (grifo-app) y que `npm install` terminó sin errores.

**"Module not found"**
→ Ejecuta `npm install` otra vez.
