import React from 'react';
import { Btn, HelpBtn } from '../../UIComponents';
import { formatCurrency } from '../../../utils/helpers';

const PAYMENT_COLUMNS = [
  { method: 'VISA',          icon: '💳', color: '#6366f1' },
  { method: 'YAPE',          icon: '📱', color: '#a855f7' },
  { method: 'Transferencia', icon: '🏦', color: '#3b82f6' },
];

const PaymentsTab = ({ shift, calcs, actions }) => {
  const { totalPayments } = calcs;
  const { openAddModal, openEditModal } = actions;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>💳 Pagos Electrónicos</div>
        <HelpBtn title="Pagos Electrónicos" steps={[
          'Registra aquí los pagos que recibiste por VISA, YAPE o Transferencia.',
          'Cada fila es un método de pago. Toca "➕ Agregar" para añadir un nuevo pago.',
          'En "Referencia" escribe el número de operación. En "Monto" el dinero recibido.',
          'Para editar o eliminar un pago ya registrado, tócalo y aparecerá la ventana.',
          'Al terminar, el total aparece abajo en morado.',
        ]} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
        {PAYMENT_COLUMNS.map(({ method, icon, color }) => {
          const methodItems = shift.payments
            .map((p, i) => ({ ...p, _idx: i }))
            .filter((p) => p.method === method);
          const methodTotal = methodItems.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          return (
            <div key={method} style={{
              background: '#0f172a', borderRadius: 12,
              padding: '14px 12px', borderTop: `3px solid ${color}`,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, margin: '4px 0 2px' }}>{method}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {methodItems.length === 0 ? 'Sin registros' : `${methodItems.length} pago${methodItems.length !== 1 ? 's' : ''}`}
                </div>
                <div style={{ fontWeight: 900, color, fontSize: 18, marginBottom: 10 }}>
                  {formatCurrency(methodTotal)}
                </div>
                <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openAddModal('payment', { method, reference: '', invoice: '', amount: 0 })}>
                  ➕ Agregar
                </Btn>
              </div>
              {methodItems.length > 0 && (
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  {methodItems.map((p) => (
                    <div key={p._idx}
                      onClick={() => openEditModal('payment', p._idx, p)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                      }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.reference || '—'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{formatCurrency(parseFloat(p.amount) || 0)}</span>
                        <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {shift.payments.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#6366f1', marginTop: 10 }}>
          Total Pagos: {formatCurrency(totalPayments)}
        </div>
      )}
    </div>
  );
};

export default PaymentsTab;
