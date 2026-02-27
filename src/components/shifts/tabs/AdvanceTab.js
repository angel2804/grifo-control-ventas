import React from 'react';
import { Btn, Input } from '../../UIComponents';
import { formatCurrency } from '../../../utils/helpers';

const AdvanceTab = ({ shift, calcs, actions }) => {
  const { totalAdvance } = calcs;
  const { addItem, removeItem, updateItem } = actions;

  return (
    <div>
      <div className="flex-between mb-2">
        <div className="card-header">⏩ Pagos Adelantados</div>
        <Btn className="btn-sm" onClick={() => addItem('advancePayments', { amount: 0 })}>
          ➕ Agregar
        </Btn>
      </div>
      {shift.advancePayments.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center' }}>Sin pagos adelantados</p>
      )}
      {shift.advancePayments.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end' }}>
          <Input label={`Pago adelantado #${i + 1}`} type="number" value={a.amount}
            onChange={(e) => updateItem('advancePayments', i, 'amount', e.target.value)} />
          <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
            onClick={() => removeItem('advancePayments', i)}>🗑️</Btn>
        </div>
      ))}
      <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#6366f1', marginTop: 12 }}>
        Total Adelantos: {formatCurrency(totalAdvance)}
      </div>
    </div>
  );
};

export default AdvanceTab;
