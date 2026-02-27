import React from 'react';
import { Btn, Input } from '../../UIComponents';
import { formatCurrency } from '../../../utils/helpers';

const ExpensesTab = ({ shift, calcs, actions }) => {
  const { totalExpenses } = calcs;
  const { addItem, removeItem, updateItem } = actions;

  return (
    <div>
      <div className="flex-between mb-2">
        <div className="card-header">🧾 Gastos</div>
        <Btn className="btn-sm" onClick={() => addItem('expenses', { detail: '', amount: 0 })}>
          ➕ Agregar
        </Btn>
      </div>
      {shift.expenses.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center' }}>Sin gastos registrados</p>
      )}
      {shift.expenses.map((e, i) => (
        <div key={i} className="grid-2 mb-1" style={{ alignItems: 'end' }}>
          <Input label="Detalle" value={e.detail}
            onChange={(ev) => updateItem('expenses', i, 'detail', ev.target.value)} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <Input label="Monto S/" type="number" value={e.amount}
              onChange={(ev) => updateItem('expenses', i, 'amount', ev.target.value)} />
            <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
              onClick={() => removeItem('expenses', i)}>🗑️</Btn>
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#ef4444', marginTop: 12 }}>
        Total Gastos: {formatCurrency(totalExpenses)}
      </div>
    </div>
  );
};

export default ExpensesTab;
