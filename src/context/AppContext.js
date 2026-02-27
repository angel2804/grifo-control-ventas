import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_PRICES, INITIAL_USERS, DEMO_SHIFTS } from '../utils/constants';

// ============================================
// CONTEXTO GLOBAL DE LA APLICACIÓN
// Los datos compartidos (turnos, precios,
// usuarios, reportes) se sincronizan en tiempo
// real con Firebase Firestore.
// La sesión (usuario/página) sigue en localStorage.
// ============================================

const AppContext = createContext();

const loadStorage = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  // ── Sesión local (no necesitan sincronizarse entre dispositivos) ──
  const [currentUser, setCurrentUser] = useState(() => loadStorage('grifo_user', null));
  const [currentPage, setCurrentPage] = useState(() => loadStorage('grifo_page', 'dashboard'));

  // ── Datos sincronizados desde Firestore ──
  const [prices, setPrices] = useState(INITIAL_PRICES);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [verifiedReports, setVerifiedReports] = useState([]);

  // ── Loading: espera a que el seed y los usuarios estén listos ──
  const [seeded, setSeeded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const loading = !seeded || !usersLoaded;

  // ── Estado local de UI (no persiste) ──
  const [lastClosedShift, setLastClosedShift] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);

  // ---- Persistir sesión en localStorage ----
  useEffect(() => { localStorage.setItem('grifo_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('grifo_page', JSON.stringify(currentPage)); }, [currentPage]);

  // ---- Sembrar datos iniciales si Firestore está vacío ----
  useEffect(() => {
    const seed = async () => {
      const pricesSnap = await getDoc(doc(db, 'config', 'prices'));
      if (!pricesSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'config', 'prices'), INITIAL_PRICES);
        INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', String(u.id)), u));
        DEMO_SHIFTS.forEach(s => batch.set(doc(db, 'shifts', String(s.id)), s));
        await batch.commit();
      }
      setSeeded(true); // Seed terminó (con o sin escritura)
    };
    seed();
  }, []);

  // ---- Listeners en tiempo real ----

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'prices'), snap => {
      if (snap.exists()) setPrices(snap.data());
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => d.data()));
      setUsersLoaded(true); // Usuarios recibidos (aunque sea vacío al inicio)
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'shifts'), snap => {
      setShifts(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'verifiedReports'), snap => {
      setVerifiedReports(snap.docs.map(d => d.data()));
    });
  }, []);

  // ---- Autenticación ----

  const login = (user) => {
    setCurrentUser(user);
    setCurrentPage(user.role === 'admin' ? 'reports' : 'shift');
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  // ---- Precios ----

  const savePrices = (newPrices) => {
    setDoc(doc(db, 'config', 'prices'), newPrices);
  };

  // ---- Turnos ----

  const addShift = (shift) => {
    setDoc(doc(db, 'shifts', String(shift.id)), shift);
  };

  const updateShift = (shiftId, updater) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) setDoc(doc(db, 'shifts', String(shiftId)), updater(shift));
  };

  const closeShift = (shiftId) => {
    updateDoc(doc(db, 'shifts', String(shiftId)), { status: 'closed' });
  };

  // ---- Reportes verificados ----

  const addVerifiedReport = (report) => {
    setDoc(doc(db, 'verifiedReports', String(report.id)), report);
  };

  const updateVerifiedReport = (id, updater) => {
    const report = verifiedReports.find(r => r.id === id);
    if (report) setDoc(doc(db, 'verifiedReports', String(id)), updater(report));
  };

  const deleteVerifiedReport = (id) => {
    deleteDoc(doc(db, 'verifiedReports', String(id)));
  };

  // ---- Usuarios ----

  const addUser = (user) => {
    const newUser = { ...user, id: Date.now() };
    setDoc(doc(db, 'users', String(newUser.id)), newUser);
  };

  const editUser = (userId, data) => {
    updateDoc(doc(db, 'users', String(userId)), data);
  };

  const deleteUser = (userId) => {
    deleteDoc(doc(db, 'users', String(userId)));
  };

  // ---- Resetear todos los datos ----

  const resetAllData = async () => {
    const batch = writeBatch(db);
    shifts.forEach(s => batch.delete(doc(db, 'shifts', String(s.id))));
    verifiedReports.forEach(r => batch.delete(doc(db, 'verifiedReports', String(r.id))));
    users.forEach(u => batch.delete(doc(db, 'users', String(u.id))));
    batch.set(doc(db, 'config', 'prices'), INITIAL_PRICES);
    INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', String(u.id)), u));
    DEMO_SHIFTS.forEach(s => batch.set(doc(db, 'shifts', String(s.id)), s));
    await batch.commit();
  };

  const isAdmin = currentUser?.role === 'admin';

  const value = {
    currentUser,
    currentPage,
    prices,
    users,
    shifts,
    isAdmin,
    loading,
    lastClosedShift,
    setLastClosedShift,
    verifiedReports,
    verifyTarget,
    setVerifyTarget,
    addVerifiedReport,
    updateVerifiedReport,
    deleteVerifiedReport,
    setCurrentPage,
    setPrices: savePrices,
    login,
    logout,
    addShift,
    updateShift,
    closeShift,
    addUser,
    editUser,
    deleteUser,
    resetAllData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
