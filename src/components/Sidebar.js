import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Btn, RoleBadge } from './UIComponents';
import { calcShiftBalance } from '../utils/helpers';
import '../styles/sidebar.css';

// ============================================
// COMPONENTE: Sidebar
// Barra lateral de navegación.
// En mobile se muestra con botón hamburgesa.
// ============================================

const Sidebar = () => {
  const { currentUser, currentPage, setCurrentPage, logout, isAdmin, shifts, prices, verifiedReports } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cantidad de turnos cerrados con diferencia y aún no verificados
  const unbalancedCount = useMemo(() => {
    if (!isAdmin) return 0;
    const verifiedIds = new Set();
    verifiedReports.forEach(r => {
      if (r.type === 'shift') verifiedIds.add(r.shiftId);
      else if (r.type === 'day') (r.shiftReports || []).forEach(sr => verifiedIds.add(sr.shiftId));
    });
    return shifts.filter(s =>
      s.status === 'closed' &&
      !verifiedIds.has(s.id) &&
      Math.abs(calcShiftBalance(s, prices).difference) >= 0.01
    ).length;
  }, [isAdmin, shifts, prices, verifiedReports]);

  // Menú para administrador (sin Dashboard)
  const adminPages = [
    { key: 'live',     label: 'Vista en Vivo',  icon: '🔴' },
    { key: 'reports',  label: 'Reportes',        icon: '📊' },
    { key: 'verified', label: 'Verificados',     icon: '✅' },
    { key: 'prices',   label: 'Precios',         icon: '💲' },
    { key: 'meters',   label: 'Contómetros',     icon: '⛽' },
    { key: 'users',    label: 'Usuarios',        icon: '👤' },
    { key: 'shifts',   label: 'Turnos',          icon: '📋' },
  ];

  // Menú para grifero (sin Dashboard)
  const workerPages = [
    { key: 'shift',     label: 'Mi Turno',     icon: '⛽' },
    { key: 'myreports', label: 'Mis Reportes', icon: '📊' },
  ];

  const pages = isAdmin ? adminPages : workerPages;

  const handleNav = (key) => {
    setCurrentPage(key);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Botón hamburger (solo mobile) ── */}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {/* ── Overlay oscuro (solo mobile, cuando el sidebar está abierto) ── */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>

        {/* Botón cerrar (solo mobile) */}
        <button
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⛽</div>
          <div className="sidebar-logo-text">
            <h2>GRIFO</h2>
            <span>Control de Ventas</span>
          </div>
        </div>

        {/* Navegación */}
        <div className="sidebar-nav">
          {pages.map((page) => (
            <div
              key={page.key}
              className={`sidebar-item ${currentPage === page.key ? 'active' : ''}`}
              onClick={() => handleNav(page.key)}
            >
              <span>{page.icon}</span>
              {page.label}
              {page.key === 'reports' && unbalancedCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 900,
                  minWidth: 18, height: 18, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {unbalancedCount}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer con info del usuario */}
        <div className="sidebar-footer">
          <div className="sidebar-user-box">
            <div className="sidebar-user-name">{currentUser.name}</div>
            <div style={{ marginTop: 4 }}>
              <RoleBadge role={currentUser.role} />
            </div>
          </div>
<Btn variant="ghost" className="btn-full" onClick={logout}>
            🚪 Cerrar Sesión
          </Btn>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
