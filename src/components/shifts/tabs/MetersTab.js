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
        <div key={island.id} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#475569',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, paddingLeft: 2,
          }}>
            {island.name}
          </div>

          {island.faces.map((face) => (
            <div key={face.id} style={{ marginBottom: 12 }}>
              {/* Etiqueta de cara */}
              <div style={{
                fontSize: 11, color: '#64748b', fontWeight: 600,
                marginBottom: 6, paddingLeft: 2, letterSpacing: '0.06em',
              }}>
                {face.label}
              </div>

              {face.dispensers.map((dispenser) => {
                const key = dispenser.key;
                const m = shift.meters[key] || { start: 0, end: null, product: dispenser.product };
                const gal = calcGallons(m.start, m.end);
                const total = gal * (prices[dispenser.product] || 0);
                return (
                  <div key={key} style={{
                    background: '#0f172a', borderRadius: 10,
                    padding: '12px 14px', marginBottom: 6,
                    border: '1px solid #1e293b',
                  }}>
                    {/* Fila superior: producto + inicio */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10, flexWrap: 'wrap', gap: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProductTag product={dispenser.product} />
                        <span style={{ fontSize: 12, color: '#64748b' }}>{dispenser.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                        🔒 <span style={{ color: '#94a3b8' }}>{parseFloat(m.start || 0).toFixed(3)}</span>
                      </span>
                    </div>

                    {/* Fila inferior: input final + galones + total */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: 10, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>Final:</span>
                      <input
                        className="input-field"
                        style={{ flex: '1 1 100px', minWidth: 100, maxWidth: 180, textAlign: 'right' }}
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={m.end !== null && m.end !== '' ? m.end : ''}
                        onChange={(e) => updateMeterEnd(key, e.target.value)}
                      />
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 13 }}>
                          {gal.toFixed(3)} gal
                        </span>
                        <span style={{ fontWeight: 800, color: '#34d399', fontSize: 13 }}>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      {/* Resumen de ventas */}
      <div style={{ marginTop: 8, padding: 16, background: '#0f172a', borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Resumen de Ventas</div>
        {Object.entries(salesByProduct).map(([prod, data]) => (
          <div key={prod} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
            <ProductTag product={prod} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
            <span className="font-bold text-success">{formatCurrency(data.amount)}</span>
          </div>
        ))}
        <div className="flex-between" style={{ paddingTop: 12, marginTop: 8 }}>
          <span className="font-extra-bold" style={{ fontSize: 15 }}>TOTAL CONTÓMETROS</span>
          <span className="font-extra-bold text-primary" style={{ fontSize: 20 }}>
            {formatCurrency(totalMeterSales)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MetersTab;
