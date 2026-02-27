import React from 'react';
import { Card, Btn, ProductTag } from '../UIComponents';
import { formatCurrency, formatGallons, calcGallons, calcShiftBalance } from '../../utils/helpers';
import { ISLANDS_CONFIG } from '../../utils/constants';

const PRINT_STYLE = `
  @media print {
    @page { size: A4; margin: 8mm; }
    .no-print { display: none !important; }
    .summary-print-layout { flex-direction: row !important; }
    .summary-print-sidebar { position: static !important; width: 200px !important; flex-shrink: 0; }
    .card { margin-bottom: 4px !important; padding: 6px 10px !important; border-radius: 4px !important; page-break-inside: avoid; }
    .card-header { font-size: 10px !important; padding-bottom: 2px !important; margin-bottom: 5px !important; }
    .sum-data-grid { grid-template-columns: 1fr 1fr !important; gap: 4px !important; }
    .sum-item-row { font-size: 9px !important; padding: 2px 0 !important; }
    .data-table th, .data-table td { padding: 2px 4px !important; font-size: 8.5px !important; }
    .sum-header-bar { padding: 6px 10px !important; margin-bottom: 8px !important; }
    .sum-header-bar .worker-name { font-size: 13px !important; }
    .sum-header-bar .total-label { font-size: 8px !important; }
    .sum-header-bar .total-value { font-size: 16px !important; }
  }
`;

// Fila compacta de ítem (sin tabla completa)
const ItemRow = ({ left, right, sub, color }) => (
  <div className="sum-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
    <div>
      <span style={{ fontSize: 13, color: '#cbd5e1' }}>{left}</span>
      {sub && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>{sub}</span>}
    </div>
    <span style={{ fontWeight: 700, fontSize: 13, color: color || '#e2e8f0', whiteSpace: 'nowrap', marginLeft: 8 }}>{right}</span>
  </div>
);

const ShiftSummaryPrint = ({ shift, prices, onDismiss }) => {
  const balance       = calcShiftBalance(shift, prices);
  const islandCfg     = ISLANDS_CONFIG.find((i) => i.id.toString() === shift.island);
  const isGLP         = islandCfg?.isGLP;
  const cuadra        = Math.abs(balance.difference) < 0.01;
  const expCash       = balance.totalSales - balance.totalPayments - balance.totalCredits
    - balance.totalPromos - balance.totalDiscounts - balance.totalExpenses;
  const totalNonCash  = balance.totalPayments + balance.totalCredits
    + balance.totalPromos + balance.totalDiscounts + balance.totalExpenses;
  const totalDelivered = (balance.totalDeliveries || 0) + (balance.totalAdvance || 0);

  const hasSmallSections = shift.payments.length > 0 || shift.credits.length > 0
    || (shift.promotions || []).length > 0 || (shift.discounts || []).length > 0
    || shift.expenses.length > 0 || (isGLP && (shift.gasCylinders || []).length > 0);

  return (
    <div>
      <style>{PRINT_STYLE}</style>

      {/* Botones — no se imprimen */}
      <div className="flex-between mb-2 no-print">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>✅ Turno Cerrado</h2>
          <p className="text-muted">Revisa el resumen e imprímelo si necesitas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="success" style={{ padding: '12px 28px', fontSize: 15 }} onClick={() => window.print()}>
            🖨️ Imprimir
          </Btn>
          <Btn variant="ghost" style={{ padding: '12px 24px', fontSize: 15 }} onClick={onDismiss}>
            ⛽ Iniciar Nuevo Turno
          </Btn>
        </div>
      </div>

      <div id="print-area">

        {/* ── Cabecera compacta ── */}
        <div className="sum-header-bar" style={{
          background: '#0f172a', borderRadius: 12, padding: '12px 18px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '1px solid #1e293b', flexWrap: 'wrap', gap: 10,
        }}>
          <div>
            <div className="worker-name" style={{ fontSize: 20, fontWeight: 800 }}>⛽ {shift.worker}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {islandCfg?.name || `Isla ${shift.island}`} &middot; {shift.shift} &middot; {shift.date}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="total-label" style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.06em' }}>TOTAL VENDIDO</div>
            <div className="total-value" style={{ fontSize: 24, fontWeight: 900, color: '#34d399', lineHeight: 1.1 }}>{formatCurrency(balance.totalSales)}</div>
          </div>
        </div>

        {/* ── Layout principal: datos | resumen ── */}
        <div className="summary-print-layout" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Columna izquierda: datos ── */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>

            {/* Contómetros */}
            <Card style={{ marginBottom: 12 }}>
              <div className="card-header">⛽ Lecturas de Contómetros</div>
              {islandCfg?.faces?.map((face) => (
                <div key={face.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: 6 }}>{face.label}</div>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Inicio</th>
                        <th>Final</th>
                        <th>Gal.</th>
                        <th>S/</th>
                      </tr>
                    </thead>
                    <tbody>
                      {face.dispensers.map((d) => {
                        const m = shift.meters[d.key] || { start: 0, end: null };
                        const gal = calcGallons(m.start, m.end);
                        return (
                          <tr key={d.key}>
                            <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ProductTag product={d.product} />
                              <span style={{ fontSize: 11, color: '#64748b' }}>{d.label}</span>
                            </td>
                            <td>{parseFloat(m.start || 0).toFixed(3)}</td>
                            <td style={{ color: '#34d399' }}>
                              {m.end !== null && m.end !== '' ? parseFloat(m.end).toFixed(3) : '—'}
                            </td>
                            <td className="font-bold text-primary">{gal.toFixed(3)}</td>
                            <td className="font-bold text-success">{formatCurrency(gal * (prices[d.product] || 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </Card>

            {/* Grid 2 columnas para secciones pequeñas */}
            {hasSmallSections && (
              <div className="sum-data-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* Pagos electrónicos */}
                {shift.payments.length > 0 && (
                  <Card>
                    <div className="card-header">💳 Pagos ({shift.payments.length})</div>
                    {shift.payments.map((p, i) => (
                      <ItemRow key={i}
                        left={p.method}
                        sub={p.reference || p.invoice || ''}
                        right={formatCurrency(p.amount)}
                        color="#fbbf24"
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>{formatCurrency(balance.totalPayments)}</span>
                    </div>
                  </Card>
                )}

                {/* Créditos */}
                {shift.credits.length > 0 && (
                  <Card>
                    <div className="card-header">📋 Créditos ({shift.credits.length})</div>
                    {shift.credits.map((c, i) => (
                      <ItemRow key={i}
                        left={c.client || '—'}
                        sub={`${formatGallons(parseFloat(c.gallons) || 0)}`}
                        right={formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0))}
                        color="#fbbf24"
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>{formatCurrency(balance.totalCredits)}</span>
                    </div>
                  </Card>
                )}

                {/* Promociones */}
                {(shift.promotions || []).length > 0 && (
                  <Card>
                    <div className="card-header">🎁 Promos ({shift.promotions.length})</div>
                    {shift.promotions.map((p, i) => (
                      <ItemRow key={i}
                        left={p.dniPlate || '—'}
                        sub={`${formatGallons(parseFloat(p.gallons) || 0)}`}
                        right={formatCurrency((parseFloat(p.gallons) || 0) * (prices[p.product] || 0))}
                        color="#fbbf24"
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>{formatCurrency(balance.totalPromos)}</span>
                    </div>
                  </Card>
                )}

                {/* Descuentos */}
                {(shift.discounts || []).length > 0 && (
                  <Card>
                    <div className="card-header">🏷️ Descuentos ({shift.discounts.length})</div>
                    {shift.discounts.map((d, i) => (
                      <ItemRow key={i}
                        left={d.client || '—'}
                        sub={`${formatGallons(parseFloat(d.gallons) || 0)} · S/${d.price}`}
                        right={formatCurrency((parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)))}
                        color="#f97316"
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#f97316' }}>{formatCurrency(balance.totalDiscounts)}</span>
                    </div>
                  </Card>
                )}

                {/* Gastos */}
                {shift.expenses.length > 0 && (
                  <Card>
                    <div className="card-header">🧾 Gastos ({shift.expenses.length})</div>
                    {shift.expenses.map((e, i) => (
                      <ItemRow key={i} left={e.detail || '—'} right={formatCurrency(e.amount)} color="#ef4444" />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#ef4444' }}>{formatCurrency(balance.totalExpenses)}</span>
                    </div>
                  </Card>
                )}

                {/* Balones GLP */}
                {isGLP && (shift.gasCylinders || []).length > 0 && (
                  <Card>
                    <div className="card-header">🛢️ Balones GLP</div>
                    {(shift.gasCylinders || []).map((c, i) => (
                      <ItemRow key={i}
                        left={`${c.size} kg`}
                        sub={`× ${parseFloat(c.count) || 0}`}
                        right={formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}
                        color="#34d399"
                      />
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
                      <span style={{ fontWeight: 800, color: '#34d399' }}>{formatCurrency(balance.cylinderSales)}</span>
                    </div>
                  </Card>
                )}

              </div>
            )}
          </div>

          {/* ── Columna derecha: resumen fijo ── */}
          <div className="summary-print-sidebar" style={{ width: 248, flexShrink: 0, position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
            <Card>
              {/* Ventas por producto */}
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 10 }}>
                ⛽ VENTAS
              </div>
              {Object.entries(balance.salesByProd).map(([prod, data]) => (
                <div key={prod} className="flex-between" style={{ marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ProductTag product={prod} />
                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(data.amount)}</span>
                </div>
              ))}
              {isGLP && balance.cylinderSales > 0 && (
                <div className="flex-between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>🛢️ Balones</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(balance.cylinderSales)}</span>
                </div>
              )}

              {/* Deducciones */}
              {totalNonCash > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
                    📤 DEDUCCIONES
                  </div>
                  {balance.totalPayments > 0 && (
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>💳 Pagos</span>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(balance.totalPayments)}</span>
                    </div>
                  )}
                  {balance.totalCredits > 0 && (
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>📋 Créditos</span>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(balance.totalCredits)}</span>
                    </div>
                  )}
                  {balance.totalPromos > 0 && (
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>🎁 Promos</span>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(balance.totalPromos)}</span>
                    </div>
                  )}
                  {balance.totalDiscounts > 0 && (
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>🏷️ Descuentos</span>
                      <span style={{ color: '#f97316', fontWeight: 700 }}>−{formatCurrency(balance.totalDiscounts)}</span>
                    </div>
                  )}
                  {balance.totalExpenses > 0 && (
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>🧾 Gastos</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>−{formatCurrency(balance.totalExpenses)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Efectivo que debías entregar */}
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#1e3a5f)', borderRadius: 12, padding: '14px 16px', marginTop: 14, textAlign: 'center', border: '1px solid #3b82f6' }}>
                <div style={{ fontSize: 10, color: '#93c5fd', letterSpacing: '0.08em', marginBottom: 6 }}>💵 DEBES ENTREGAR</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expCash)}</div>
              </div>

              {/* Entregas realizadas */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
                  📥 ENTREGASTE
                </div>
                {(shift.deliveries || []).filter(v => parseFloat(v) > 0).length === 0 && balance.totalAdvance === 0 && (
                  <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '4px 0' }}>Sin entregas registradas</div>
                )}
                {(shift.deliveries || []).filter(v => parseFloat(v) > 0).map((v, i) => (
                  <div key={i} className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Entrega #{i + 1}</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(parseFloat(v) || 0)}</span>
                  </div>
                ))}
                {balance.totalAdvance > 0 && (
                  <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Pagos adelantados</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(balance.totalAdvance)}</span>
                  </div>
                )}
                {totalDelivered > 0 && (
                  <div className="flex-between" style={{ paddingTop: 6, marginTop: 4, borderTop: '1px solid #334155' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Total entregado</span>
                    <span style={{ fontWeight: 900, fontSize: 16, color: '#a78bfa' }}>{formatCurrency(totalDelivered)}</span>
                  </div>
                )}
              </div>

              {/* Resultado del cuadre */}
              <div style={{
                marginTop: 14, borderRadius: 12, padding: 14, textAlign: 'center',
                background: cuadra ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                border: `2px solid ${cuadra ? '#059669' : '#dc2626'}`,
              }}>
                {cuadra ? (
                  <>
                    <div style={{ fontSize: 32 }}>✅</div>
                    <div style={{ fontWeight: 800, color: '#34d399', fontSize: 16, marginTop: 6 }}>TURNO CUADRADO</div>
                    <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>¡Buen trabajo, {shift.worker.split(' ')[0]}!</div>
                  </>
                ) : balance.difference < 0 ? (
                  <>
                    <div style={{ fontSize: 32 }}>⚠️</div>
                    <div style={{ fontWeight: 800, color: '#f87171', fontSize: 15, marginTop: 4 }}>FALTA</div>
                    <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 28, lineHeight: 1.1, margin: '6px 0' }}>
                      {formatCurrency(Math.abs(balance.difference))}
                    </div>
                    <div style={{ fontSize: 11, color: '#fca5a5' }}>Revisa tus entregas</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32 }}>⚠️</div>
                    <div style={{ fontWeight: 800, color: '#f87171', fontSize: 15, marginTop: 4 }}>ENTREGASTE DE MÁS</div>
                    <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 28, lineHeight: 1.1, margin: '6px 0' }}>
                      {formatCurrency(Math.abs(balance.difference))}
                    </div>
                    <div style={{ fontSize: 11, color: '#fca5a5' }}>Entregaste más de lo correspondiente</div>
                  </>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Botones al final — no se imprimen */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        <Btn variant="success" style={{ padding: '14px 36px', fontSize: 16 }} onClick={() => window.print()}>
          🖨️ Imprimir Resumen
        </Btn>
        <Btn variant="ghost" style={{ padding: '14px 28px', fontSize: 16 }} onClick={onDismiss}>
          ⛽ Iniciar Nuevo Turno
        </Btn>
      </div>
    </div>
  );
};

export default ShiftSummaryPrint;
