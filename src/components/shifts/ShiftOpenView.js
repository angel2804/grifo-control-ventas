import React from 'react';
import { Card, Btn, StatCard } from '../UIComponents';
import { formatCurrency, formatGallons, formatSignedCurrency } from '../../utils/helpers';
import MetersTab from './tabs/MetersTab';
import CylindersTab from './tabs/CylindersTab';
import PaymentsTab from './tabs/PaymentsTab';
import CreditsTab from './tabs/CreditsTab';
import PromosTab from './tabs/PromosTab';
import DiscountsTab from './tabs/DiscountsTab';
import ExpensesTab from './tabs/ExpensesTab';
import AdvanceTab from './tabs/AdvanceTab';
import DeliveriesTab from './tabs/DeliveriesTab';
import SummaryTab from './tabs/SummaryTab';

const ShiftOpenView = ({
  shift, prices, islandConfig,
  activeTab, setActiveTab,
  setConfirmClose,
  calcs, actions,
}) => {
  const isGLPShift = islandConfig?.isGLP || false;

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

  const tabDone = {
    meters:     Object.values(shift.meters).some((m) => m.end !== null && m.end !== '' && m.end !== undefined),
    cylinders:  (shift.gasCylinders || []).length > 0,
    payments:   shift.payments.length > 0,
    credits:    shift.credits.length > 0,
    promotions: shift.promotions.length > 0,
    discounts:  shift.discounts.length > 0,
    expenses:   shift.expenses.length > 0,
    advance:    shift.advancePayments.length > 0,
    deliveries: shift.deliveries.length > 0,
  };

  const { totalSales, totalGallons, totalDeliveries, difference } = calcs;

  const tabProps = { shift, prices, calcs, actions, islandConfig };

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

      {/* Tabs */}
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

      <Card>
        {activeTab === 'meters'     && <MetersTab    {...tabProps} />}
        {activeTab === 'cylinders'  && <CylindersTab {...tabProps} />}
        {activeTab === 'payments'   && <PaymentsTab  {...tabProps} />}
        {activeTab === 'credits'    && <CreditsTab   {...tabProps} />}
        {activeTab === 'promotions' && <PromosTab    {...tabProps} />}
        {activeTab === 'discounts'  && <DiscountsTab {...tabProps} />}
        {activeTab === 'expenses'   && <ExpensesTab  {...tabProps} />}
        {activeTab === 'advance'    && <AdvanceTab   {...tabProps} />}
        {activeTab === 'deliveries' && <DeliveriesTab {...tabProps} />}
        {activeTab === 'summary'    && <SummaryTab shift={shift} calcs={calcs} isGLPShift={isGLPShift} />}
      </Card>
    </div>
  );
};

export default ShiftOpenView;
