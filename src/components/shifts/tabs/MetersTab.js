import React from 'react';
import { ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons, calcGallons } from '../../../utils/helpers';
import { ISLANDS_CONFIG } from '../../../utils/constants';

const MetersTab = ({ shift, prices, calcs, actions }) => {
  const { salesByProduct, totalMeterSales } = calcs;
  const { updateMeterEnd } = actions;

  return (
    <div>
      <div className="card-header">⛽ Contómetros — Ingrese lecturas finales</div>
      {shift.hasCarryover && (
        <div style={{
          padding: '8px 12px', background: '#064e3b', borderRadius: 8,
          marginBottom: 12, fontSize: 13, color: '#6ee7b7',
          border: '1px solid #065f46',
        }}>
          ✅ Los contómetros iniciales fueron tomados automáticamente del turno anterior.
        </div>
      )}

      {ISLANDS_CONFIG.filter(
        (isl) => isl.id.toString() === shift.island || shift.island === ''
      ).map((island) => (
        <div key={island.id} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>
            {island.name}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cara</th>
                <th>Producto</th>
                <th>Inicio 🔒</th>
                <th>Final</th>
                <th>Galones</th>
                <th>Total S/</th>
              </tr>
            </thead>
            <tbody>
              {island.faces.map((face) =>
                face.dispensers.map((dispenser) => {
                  const key = dispenser.key;
                  const m = shift.meters[key] || { start: 0, end: null, product: dispenser.product };
                  const gal = calcGallons(m.start, m.end);
                  const total = gal * (prices[dispenser.product] || 0);
                  return (
                    <tr key={key}>
                      <td>{face.label}</td>
                      <td>
                        <ProductTag product={dispenser.product} />
                        {' '}
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{dispenser.label}</span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        🔒 {parseFloat(m.start || 0).toFixed(3)}
                      </td>
                      <td>
                        <input
                          className="input-field"
                          style={{ width: 130, MozAppearance: 'textfield' }}
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={m.end || ''}
                          onChange={(e) => updateMeterEnd(key, e.target.value)}
                        />
                      </td>
                      <td className="font-bold text-primary">{gal.toFixed(3)}</td>
                      <td className="font-bold text-success">{formatCurrency(total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Resumen de ventas */}
      <div style={{ marginTop: 16, padding: 16, background: '#0f172a', borderRadius: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Resumen de Ventas</div>
        {Object.entries(salesByProduct).map(([prod, data]) => (
          <div key={prod} className="flex-between" style={{ padding: '6px 0' }}>
            <ProductTag product={prod} />
            <span>{formatGallons(data.gallons)}</span>
            <span className="font-bold text-success">{formatCurrency(data.amount)}</span>
          </div>
        ))}
        <div className="flex-between" style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 8 }}>
          <span className="font-extra-bold" style={{ fontSize: 16 }}>TOTAL CONTÓMETROS</span>
          <span className="font-extra-bold text-primary" style={{ fontSize: 20 }}>
            {formatCurrency(totalMeterSales)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MetersTab;
