import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, StatCard, ProductTag, StatusBadge } from '../components/UIComponents';
import { formatCurrency, formatGallons, calcGallons, getTodayDate } from '../utils/helpers';

// ============================================
// PÁGINA: Dashboard
// Muestra resumen del día: ventas, galones,
// turnos y precios actuales
// ============================================

const DashboardPage = () => {
  const { shifts, prices } = useApp();
  const today = getTodayDate();
  const todayShifts = shifts.filter((s) => s.date === today);

  // Calcular total de ventas del día (contómetros + balones)
  const totalSales = useMemo(() => {
    return todayShifts.reduce((sum, shift) => {
      const meterTotal = Object.values(shift.meters).reduce((s, m) => {
        const gal = calcGallons(m.start, m.end);
        return s + gal * (prices[m.product] || 0);
      }, 0);
      const cylinderTotal = (shift.gasCylinders || []).reduce(
        (s, c) => s + (parseFloat(c.count) || 0) * (parseFloat(c.price) || 0), 0
      );
      return sum + meterTotal + cylinderTotal;
    }, 0);
  }, [todayShifts, prices]);

  // Calcular total de galones del día
  const totalGallons = useMemo(() => {
    return todayShifts.reduce((sum, shift) => {
      return sum + Object.entries(shift.meters).reduce((s, [, m]) => {
        return s + calcGallons(m.start, m.end);
      }, 0);
    }, 0);
  }, [todayShifts]);

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
        Dashboard
      </h2>
      <p className="text-muted mb-3">Resumen del día: {today}</p>

      {/* Tarjetas de estadísticas */}
      <div className="grid-4">
        <StatCard label="Ventas del día" value={formatCurrency(totalSales)} color="#6366f1" />
        <StatCard label="Galones vendidos" value={formatGallons(totalGallons)} color="#8b5cf6" />
        <StatCard label="Turnos hoy" value={todayShifts.length} color="#059669" />
        <StatCard
          label="Turnos abiertos"
          value={todayShifts.filter((s) => s.status === 'open').length}
          color="#f59e0b"
        />
      </div>

      <div className="grid-2 mt-2">
        {/* Precios actuales */}
        <Card title="Precios Actuales" icon="💲">
          {Object.entries(prices).map(([prod, price]) => (
            <div
              key={prod}
              className="flex-between"
              style={{ padding: '10px 0', borderBottom: '1px solid #1e293b' }}
            >
              <ProductTag product={prod} />
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                {formatCurrency(price)}
              </span>
            </div>
          ))}
        </Card>

        {/* Turnos recientes */}
        <Card title="Turnos Recientes" icon="📋">
          {shifts
            .slice(-5)
            .reverse()
            .map((s) => (
              <div
                key={s.id}
                className="flex-between"
                style={{ padding: '10px 0', borderBottom: '1px solid #1e293b' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {s.worker || 'Sin asignar'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {s.date} — {s.shift}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          {shifts.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>
              No hay turnos registrados
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
