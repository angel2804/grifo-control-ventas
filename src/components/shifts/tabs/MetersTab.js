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

      {/* Layout: izquierda contómetros | derecha resumen sticky */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

        {/* ── Columna izquierda: contómetros con scroll ── */}
        <div style={{ flex: '1 1 0', minWidth: 0, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
          {ISLANDS_CONFIG.filter(
            (isl) => isl.id.toString() === shift.island || shift.island === ''
          ).map((island) => (
            <div key={island.id} style={{ marginBottom: 16 }}>

              {/* Nombre de isla */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#475569',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 8, paddingLeft: 2,
              }}>
                {island.name}
              </div>

              {/* Cara A y Cara B lado a lado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {island.faces.map((face) => (
                  <div key={face.id} style={{
                    background: '#0c1420', borderRadius: 10,
                    border: '1px solid #1e293b', overflow: 'hidden',
                  }}>
                    {/* Header de cara */}
                    <div style={{
                      background: '#1e293b', padding: '6px 10px',
                      fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      letterSpacing: '0.06em',
                    }}>
                      {face.label}
                    </div>

                    {/* Dispensadores */}
                    <div style={{ padding: '8px 8px 4px' }}>
                      {face.dispensers.map((dispenser) => {
                        const key = dispenser.key;
                        const m = shift.meters[key] || { start: 0, end: null, product: dispenser.product };
                        const gal = calcGallons(m.start, m.end);
                        const total = gal * (prices[dispenser.product] || 0);
                        return (
                          <div key={key} style={{
                            marginBottom: 8, paddingBottom: 8,
                            borderBottom: '1px solid #1e293b',
                          }}>
                            {/* Producto + inicio */}
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', marginBottom: 5,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ProductTag product={dispenser.product} />
                                <span style={{ fontSize: 10, color: '#64748b' }}>{dispenser.label}</span>
                              </div>
                              <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                                🔒 <span style={{ color: '#94a3b8' }}>{parseFloat(m.start || 0).toFixed(2)}</span>
                              </span>
                            </div>

                            {/* Input final + total */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                className="input-field"
                                style={{ flex: 1, minWidth: 0, textAlign: 'right', padding: '5px 6px', fontSize: 12 }}
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={m.end !== null && m.end !== '' ? m.end : ''}
                                onChange={(e) => updateMeterEnd(key, e.target.value)}
                              />
                            </div>
                            {gal > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 700 }}>
                                  {gal.toFixed(3)} gal
                                </span>
                                <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700 }}>
                                  {formatCurrency(total)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

        {/* ── Columna derecha: resumen sticky ── */}
        <div style={{ width: 168, flexShrink: 0, position: 'sticky', top: 8, alignSelf: 'flex-start' }}>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 12 }}>
              📊 GALONES
            </div>

            {Object.keys(salesByProduct).length === 0 && (
              <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '8px 0' }}>
                Sin lecturas aún
              </div>
            )}

            {Object.entries(salesByProduct).map(([prod, data]) => (
              <div key={prod} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <ProductTag product={prod} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>
                  {formatGallons(data.gallons)}
                </div>
                <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>
                  {formatCurrency(data.amount)}
                </div>
              </div>
            ))}

            <div style={{ paddingTop: 10, borderTop: '1px solid #334155' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#6366f1' }}>
                {formatCurrency(totalMeterSales)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MetersTab;
