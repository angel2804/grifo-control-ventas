import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_PRICES, INITIAL_USERS, DEMO_SHIFTS } from '../utils/constants';

// ============================================
// CONTEXTO GLOBAL DE LA APLICACIÓN
// ============================================

const AppContext = createContext();

const loadStorage = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

// Escribe documentos en Firestore en lotes de 499 (límite Firestore = 500)
const batchWrite = async (items) => {
  for (let i = 0; i < items.length; i += 499) {
    const batch = writeBatch(db);
    items.slice(i, i + 499).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }
};

// Borra documentos en Firestore en lotes de 499
const batchDelete = async (refs) => {
  for (let i = 0; i < refs.length; i += 499) {
    const batch = writeBatch(db);
    refs.slice(i, i + 499).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  // ── Sesión local ──
  const [currentUser, setCurrentUser] = useState(() => loadStorage('grifo_user', null));
  const [currentPage, setCurrentPage] = useState(() => loadStorage('grifo_page', 'dashboard'));

  // ── Datos sincronizados desde Firestore ──
  const [prices, setPrices] = useState(INITIAL_PRICES);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [creditPayments, setCreditPayments] = useState([]);
  const [creditImports, setCreditImports] = useState([]);
  const [creditVerifications, setCreditVerifications] = useState({});
  const [verifiedReports, setVerifiedReports] = useState([]);
  const [backups, setBackups] = useState([]);

  // ── Loading ──
  const [seeded, setSeeded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [backupsLoaded, setBackupsLoaded] = useState(false);
  const loading = !seeded || !usersLoaded;

  // ── UI state ──
  const [lastClosedShift, setLastClosedShift] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);

  // ── Control auto-backup (1 vez por sesión) ──
  const autoBackupDone = useRef(false);

  // ---- Persistir sesión ----
  useEffect(() => { localStorage.setItem('grifo_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('grifo_page', JSON.stringify(currentPage)); }, [currentPage]);

  // ---- Seed inicial ----
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
      setSeeded(true);
    };
    seed();
  }, []);

  // ---- Listeners Firestore ----
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'prices'), snap => {
      if (snap.exists()) setPrices(snap.data());
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => d.data()));
      setUsersLoaded(true);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'shifts'), snap => {
      setShifts(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'schedules'), snap => {
      setSchedules(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'creditPayments'), snap => {
      setCreditPayments(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'creditImports'), snap => {
      setCreditImports(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'creditVerifications'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setCreditVerifications(map);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'verifiedReports'), snap => {
      setVerifiedReports(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'backups'), snap => {
      setBackups(snap.docs.map(d => d.data()).sort((a, b) => b.id - a.id));
      setBackupsLoaded(true);
    });
  }, []);

  // ---- Auto-backup diario (se ejecuta cuando el admin abre la app) ----
  useEffect(() => {
    if (!seeded || !backupsLoaded || !currentUser || currentUser.role !== 'admin') return;
    if (autoBackupDone.current) return;
    if (shifts.length === 0 && verifiedReports.length === 0) { autoBackupDone.current = true; return; }

    const today = new Date().toLocaleDateString('en-CA');
    const hasToday = backups.some(b => b.createdAt?.startsWith(today));
    if (hasToday) { autoBackupDone.current = true; return; }

    autoBackupDone.current = true;
    const id = Date.now();
    const label = `Auto — ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const backupDoc = {
      id, createdAt: new Date().toISOString(), label, auto: true,
      shiftsCount: shifts.length, reportsCount: verifiedReports.length,
      prices, users, shifts, verifiedReports,
    };

    setDoc(doc(db, 'backups', String(id)), backupDoc)
      .then(() => {
        // Mantener solo los 7 backups más recientes
        const all = [...backups, backupDoc].sort((a, b) => b.id - a.id);
        if (all.length > 7) {
          return batchDelete(all.slice(7).map(b => doc(db, 'backups', String(b.id))));
        }
      })
      .catch(err => console.warn('Auto-backup falló:', err));
  }, [seeded, backupsLoaded, currentUser?.id, backups.length, shifts.length, verifiedReports.length]); // eslint-disable-line

  // ---- Autenticación ----
  const login = (user) => {
    autoBackupDone.current = false; // Resetear para la nueva sesión
    setCurrentUser(user);
    setCurrentPage(user.role === 'admin' ? 'reports' : 'shift');
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  // ---- Precios ----
  const savePrices = (newPrices) => setDoc(doc(db, 'config', 'prices'), newPrices);

  // ---- Turnos ----
  const addShift = (shift) => setDoc(doc(db, 'shifts', String(shift.id)), shift);

  const updateShift = (shiftId, updater) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) setDoc(doc(db, 'shifts', String(shiftId)), updater(shift));
  };

  const closeShift = (shiftId) => updateDoc(doc(db, 'shifts', String(shiftId)), { status: 'closed' });

  // ---- Reportes verificados ----
  const addVerifiedReport = (report) => setDoc(doc(db, 'verifiedReports', String(report.id)), report);

  const updateVerifiedReport = (id, updater) => {
    const report = verifiedReports.find(r => r.id === id);
    if (report) setDoc(doc(db, 'verifiedReports', String(id)), updater(report));
  };

  const deleteVerifiedReport = (id) => deleteDoc(doc(db, 'verifiedReports', String(id)));

  // ---- Usuarios ----
  const addUser = (user) => {
    const newUser = { ...user, id: Date.now() };
    setDoc(doc(db, 'users', String(newUser.id)), newUser);
  };

  const editUser = (userId, data) => updateDoc(doc(db, 'users', String(userId)), data);
  const deleteUser = (userId) => deleteDoc(doc(db, 'users', String(userId)));

  // ---- Créditos: pagos e importaciones ----
  // ---- Verificaciones de créditos ----
  const toggleCreditVerification = (txId) => {
    const safeId = String(txId).replace(/\//g, '_');
    const ref = doc(db, 'creditVerifications', safeId);
    if (creditVerifications[safeId]) {
      return deleteDoc(ref);
    }
    return setDoc(ref, { txId: safeId, verifiedAt: new Date().toISOString(), verifiedBy: currentUser?.name || 'Admin' });
  };

  // ---- Edición de créditos ----
  // Edita un crédito dentro de un turno
  const updateShiftCredit = (shiftId, creditIdx, updatedCredit) => {
    updateShift(shiftId, (shift) => ({
      ...shift,
      credits: (shift.credits || []).map((c, i) => (i === creditIdx ? { ...c, ...updatedCredit } : c)),
    }));
  };

  // Edita un crédito importado
  const updateCreditImport = (id, data) =>
    setDoc(doc(db, 'creditImports', String(id)), data, { merge: true });

  // Elimina un crédito específico de un turno (por índice)
  const deleteShiftCredit = (shiftId, creditIdx) => {
    updateShift(shiftId, (shift) => ({
      ...shift,
      credits: (shift.credits || []).filter((_, i) => i !== creditIdx),
    }));
  };

  // Renombra un cliente en todos sus créditos, importaciones y pagos
  const renameClient = async (oldName, newName) => {
    const newUpper = newName.toUpperCase().trim();
    const writes = [];

    shifts.forEach(shift => {
      const hasOld = (shift.credits || []).some(
        c => (c.client || '').toUpperCase().trim() === oldName
      );
      if (hasOld) {
        writes.push({
          ref: doc(db, 'shifts', String(shift.id)),
          data: {
            ...shift,
            credits: (shift.credits || []).map(c =>
              (c.client || '').toUpperCase().trim() === oldName
                ? { ...c, client: newUpper }
                : c
            ),
          },
        });
      }
    });

    creditImports.forEach(imp => {
      if ((imp.clientName || '').toUpperCase().trim() === oldName) {
        writes.push({ ref: doc(db, 'creditImports', String(imp.id)), data: { ...imp, clientName: newUpper } });
      }
    });

    creditPayments.forEach(pmt => {
      if ((pmt.clientName || '').toUpperCase().trim() === oldName) {
        writes.push({ ref: doc(db, 'creditPayments', String(pmt.id)), data: { ...pmt, clientName: newUpper } });
      }
    });

    await batchWrite(writes);
  };

  const addCreditPayment = (data) => {
    const id = Date.now();
    return setDoc(doc(db, 'creditPayments', String(id)), {
      ...data,
      id,
      clientName: (data.clientName || '').toUpperCase().trim(),
      createdAt: new Date().toISOString(),
    });
  };

  const addCreditImports = async (imports) => {
    const items = imports.map((imp, i) => {
      const id = Date.now() + i;
      return { ref: doc(db, 'creditImports', String(id)), data: { ...imp, id } };
    });
    await batchWrite(items);
  };

  const deleteCreditImport = (id) => deleteDoc(doc(db, 'creditImports', String(id)));

  // ---- Horarios ----
  const setSchedule = (workerId, workerName, entries) =>
    setDoc(doc(db, 'schedules', String(workerId)), { id: workerId, workerId, workerName, entries });

  const deleteSchedule = (workerId) => deleteDoc(doc(db, 'schedules', String(workerId)));

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

  // ============================================
  // ── SISTEMA DE COPIAS DE SEGURIDAD ──
  // ============================================

  // Crear backup manualmente
  const createBackup = async (label) => {
    const id = Date.now();
    const fmt = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const backupDoc = {
      id,
      createdAt: new Date().toISOString(),
      label: label || `Manual — ${fmt} ${time}`,
      auto: false,
      shiftsCount: shifts.length,
      reportsCount: verifiedReports.length,
      prices, users, shifts, verifiedReports,
    };
    await setDoc(doc(db, 'backups', String(id)), backupDoc);
    // Mantener solo los 7 más recientes
    const all = [...backups, backupDoc].sort((a, b) => b.id - a.id);
    if (all.length > 7) {
      await batchDelete(all.slice(7).map(b => doc(db, 'backups', String(b.id))));
    }
  };

  // Restaurar desde backup de Firestore
  const restoreFromBackup = async (backupId) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) throw new Error('Backup no encontrado');
    await _applyRestore(backup);
  };

  // Aplicar restauración (compartido por Firestore y JSON)
  const _applyRestore = async (data) => {
    // 1. Borrar datos actuales
    const refsToDelete = [
      ...shifts.map(s => doc(db, 'shifts', String(s.id))),
      ...verifiedReports.map(r => doc(db, 'verifiedReports', String(r.id))),
      ...users.map(u => doc(db, 'users', String(u.id))),
    ];
    await batchDelete(refsToDelete);

    // 2. Escribir datos del backup
    const refsToWrite = [
      { ref: doc(db, 'config', 'prices'), data: data.prices || INITIAL_PRICES },
      ...(data.users || []).map(u => ({ ref: doc(db, 'users', String(u.id)), data: u })),
      ...(data.shifts || []).map(s => ({ ref: doc(db, 'shifts', String(s.id)), data: s })),
      ...(data.verifiedReports || []).map(r => ({ ref: doc(db, 'verifiedReports', String(r.id)), data: r })),
    ];
    await batchWrite(refsToWrite);
  };

  // Exportar todos los datos como archivo JSON
  const exportToJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      prices, users, shifts, verifiedReports,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grifo-backup-${new Date().toLocaleDateString('en-CA')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar y restaurar desde archivo JSON
  const importFromJson = async (jsonString) => {
    const data = JSON.parse(jsonString);
    if (!data.prices || !Array.isArray(data.users) || !Array.isArray(data.shifts)) {
      throw new Error('Archivo JSON inválido o corrupto');
    }
    await _applyRestore(data);
  };

  // ============================================

  const isAdmin = currentUser?.role === 'admin';

  const value = {
    currentUser, currentPage, prices, users, shifts, schedules,
    creditPayments, creditImports, creditVerifications,
    isAdmin, loading,
    lastClosedShift, setLastClosedShift,
    verifiedReports, verifyTarget, setVerifyTarget,
    backups, backupsLoaded,
    addVerifiedReport, updateVerifiedReport, deleteVerifiedReport,
    setCurrentPage, setPrices: savePrices,
    login, logout,
    addShift, updateShift, closeShift,
    addUser, editUser, deleteUser,
    setSchedule, deleteSchedule,
    addCreditPayment, addCreditImports, deleteCreditImport, updateCreditImport,
    toggleCreditVerification, updateShiftCredit, deleteShiftCredit, renameClient,
    resetAllData,
    createBackup, restoreFromBackup, exportToJson, importFromJson,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
