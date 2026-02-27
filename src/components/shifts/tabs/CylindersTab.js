import React from 'react';
import { Btn, Input, Select } from '../../UIComponents';
import { formatCurrency } from '../../../utils/helpers';
import { CYLINDER_SIZES } from '../../../utils/constants';

const CylindersTab = ({ shift, calcs, actions }) => {
  const { totalCylindersAmount } = calcs;
  const { addItem, removeItem, updateItem } = actions;

  return (
    <div>
      <div className="flex-between mb-2">
        <div className="card-header">🛢️ Balones de GLP</div>
        <Btn className="btn-sm" onClick={() => addItem('gasCylinders', { size: '10', count: 0, price: 0 })}>
          ➕ Agregar
        </Btn>
      </div>
      {(!shift.gasCylinders || shift.gasCylinders.length === 0) && (
        <p className="text-muted" style={{ textAlign: 'center' }}>Sin balones registrados</p>
      )}
      {(shift.gasCylinders || []).map((c, i) => (
        <div key={i} className="grid-3 mb-1" style={{ alignItems: 'end' }}>
          <Select
            label="TAMAÑO"
            value={c.size}
            onChange={(e) => updateItem('gasCylinders', i, 'size', e.target.value)}
            options={CYLINDER_SIZES}
          />
          <Input
            label="CANTIDAD"
            type="number"
            value={c.count}
            onChange={(e) => updateItem('gasCylinders', i, 'count', e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <Input
              label="PRECIO UNIT. S/"
              type="number"
              value={c.price}
              onChange={(e) => updateItem('gasCylinders', i, 'price', e.target.value)}
            />
            <Btn
              variant="danger"
              className="btn-icon"
              style={{ marginBottom: 12 }}
              onClick={() => removeItem('gasCylinders', i)}
            >
              🗑️
            </Btn>
          </div>
        </div>
      ))}
      {(shift.gasCylinders || []).length > 0 && (
        <div style={{ marginTop: 12, padding: 12, background: '#0f172a', borderRadius: 10 }}>
          {(shift.gasCylinders || []).map((c, i) => (
            <div key={i} className="flex-between" style={{ padding: '4px 0', fontSize: 14 }}>
              <span>Balón {c.size} kg × {parseFloat(c.count) || 0} unid.</span>
              <span className="font-bold text-success">
                {formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}
              </span>
            </div>
          ))}
          <div className="flex-between" style={{ borderTop: '1px solid #334155', paddingTop: 10, marginTop: 8 }}>
            <span className="font-extra-bold">TOTAL BALONES</span>
            <span className="font-extra-bold" style={{ fontSize: 20, color: '#f59e0b' }}>
              {formatCurrency(totalCylindersAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CylindersTab;
