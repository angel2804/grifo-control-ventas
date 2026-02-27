import React from 'react';
import { Btn, Input } from '../../UIComponents';
import { formatCurrency } from '../../../utils/helpers';

const DeliveriesTab = ({ shift, calcs, actions }) => {
  const { totalDeliveries } = calcs;
  const { update } = actions;

  return (
    <div>
      <div className="flex-between mb-2">
        <div className="card-header">📥 Entregas de Dinero</div>
        <Btn className="btn-sm"
          onClick={() => update((s) => ({ ...s, deliveries: [...s.deliveries, ''] }))}>
          ➕ Agregar entrega
        </Btn>
      </div>
      {shift.deliveries.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
          Sin entregas registradas. Toca "Agregar entrega" para añadir.
        </p>
      )}
      {shift.deliveries.map((d, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end' }}>
          <Input
            label={`${i + 1}° Entrega`}
            type="number"
            value={d || ''}
            placeholder="0.00"
            onChange={(e) => {
              const newDel = [...shift.deliveries];
              newDel[i] = e.target.value;
              update((s) => ({ ...s, deliveries: newDel }));
            }}
          />
          <Btn variant="danger" className="btn-icon" style={{ marginBottom: 12 }}
            onClick={() => update((s) => ({ ...s, deliveries: s.deliveries.filter((_, idx) => idx !== i) }))}>
            🗑️
          </Btn>
        </div>
      ))}
      <div style={{
        textAlign: 'right', fontSize: 20, fontWeight: 800, color: '#059669',
        marginTop: 16, padding: 16, background: '#0f172a', borderRadius: 12,
      }}>
        Total Entregado: {formatCurrency(totalDeliveries)}
      </div>
    </div>
  );
};

export default DeliveriesTab;
