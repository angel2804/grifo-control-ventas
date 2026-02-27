import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import PricesPage from './pages/PricesPage';
import MetersPage from './pages/MetersPage';
import UsersPage from './pages/UsersPage';
import ShiftsPage from './pages/ShiftsPage';
import WorkerShiftPage from './pages/WorkerShiftPage';
import ReportsPage from './pages/ReportsPage';
import LiveIslandPage from './pages/LiveIslandPage';
import VerifyReportPage from './pages/VerifyReportPage';
import VerifiedReportsPage from './pages/VerifiedReportsPage';
import BackupsPage from './pages/BackupsPage';
import SchedulePage from './pages/SchedulePage';
import WorkerSchedulePage from './pages/WorkerSchedulePage';
import CreditsPage from './pages/CreditsPage';

// ============================================
// COMPONENTE PRINCIPAL: App
// Controla qué página mostrar según el estado
// ============================================

const AppContent = () => {
  const { currentUser, currentPage, isAdmin, loading } = useApp();

  // Mientras Firestore carga los datos iniciales
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16, background: '#0f172a',
      }}>
        <div style={{ fontSize: 48 }}>⛽</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>GRIFO — Control de Ventas</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Conectando con el servidor...</div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar login
  if (!currentUser) {
    return <LoginPage />;
  }

  // Renderizar la página según la selección del menú
  const renderPage = () => {
    switch (currentPage) {
      // Páginas solo para ADMIN
      case 'live':
        return isAdmin ? <LiveIslandPage /> : null;
      case 'prices':
        return isAdmin ? <PricesPage /> : null;
      case 'meters':
        return isAdmin ? <MetersPage /> : null;
      case 'users':
        return isAdmin ? <UsersPage /> : null;
      case 'shifts':
        return isAdmin ? <ShiftsPage /> : null;
      case 'reports':
        return <ReportsPage />;
      case 'verify':
        return isAdmin ? <VerifyReportPage /> : null;
      case 'verified':
        return isAdmin ? <VerifiedReportsPage /> : null;
      case 'backups':
        return isAdmin ? <BackupsPage /> : null;
      case 'schedule':
        return isAdmin ? <SchedulePage /> : null;
      case 'credits':
        return isAdmin ? <CreditsPage /> : null;

      // Páginas solo para GRIFERO
      case 'shift':
        return !isAdmin ? <WorkerShiftPage /> : null;
      case 'myreports':
        return !isAdmin ? <ReportsPage filterWorker={currentUser.name} /> : null;
      case 'mySchedule':
        return !isAdmin ? <WorkerSchedulePage /> : null;

      default:
        return isAdmin ? <ReportsPage /> : <WorkerShiftPage />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
};

// Envolvemos todo con el AppProvider
const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
