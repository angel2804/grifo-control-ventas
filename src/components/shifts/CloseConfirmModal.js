import React from 'react';
import { Btn } from '../UIComponents';
import { formatCurrency } from '../../utils/helpers';

const CloseConfirmModal = ({ confirmClose, setConfirmClose, handleConfirmClose, shift, calcs, isGLPShift }) => {
  if (!confirmClose) return null;

  const {
    salesByProduct = {}, totalSales = 0, totalPayments = 0,
    totalCreditsAmount = 0, totalPromosAmount = 0, totalDiscountsAmount = 0,
    totalExpenses = 0, totalAdvance = 0, totalDeliveries = 0,
    totalCylindersAmount = 0, expectedCash = 0, difference = 0,
  } = calcs || {};

  const cuadra = Math.abs(difference) < 0.01;
  const totalNonCash = totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses;

  return (
    <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🔴</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>¿Cerrar turno?</div>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
            Una vez cerrado <strong>no podrás hacer cambios</strong>. Verifica el cuadre antes de confirmar.
          </p>
        </div>

        {/* ── Resumen de cuadre ── */}
        <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #1e293b' }}>

          {/* Ventas */}
          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⛽ VENTAS
          </div>
          {Object.entries(salesByProduct).map(([prod, data]) => (
            <div key={prod} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: '#94a3b8' }}>{prod}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(data.amount)}</span>
            </div>
          ))}
          {isGLPShift && totalCylindersAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: '#94a3b8' }}>🛢️ Balones GLP</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalCylindersAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, paddingTop: 6, borderTop: '1px solid #1e293b', marginTop: 4 }}>
            <span>Total vendido</span>
            <span style={{ color: '#34d399' }}>{formatCurrency(totalSales)}</span>
          </div>

          {/* Deducciones */}
          {totalNonCash > 0 && (
            <>
              <div style={{ height: 1, background: '#1e293b', margin: '10px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 6 }}>
                📤 DEDUCCIONES
              </div>
              {totalPayments > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8' }}>💳 Pagos electrón.</span>
                  <span style={{ color: '#fbbf24' }}>−{formatCurrency(totalPayments)}</span>
                </div>
              )}
              {totalCreditsAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8' }}>📋 Créditos</span>
                  <span style={{ color: '#fbbf24' }}>−{formatCurrency(totalCreditsAmount)}</span>
                </div>
              )}
              {totalPromosAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8' }}>🎁 Promos</span>
                  <span style={{ color: '#fbbf24' }}>−{formatCurrency(totalPromosAmount)}</span>
                </div>
              )}
              {totalDiscountsAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8' }}>🏷️ Descuentos</span>
                  <span style={{ color: '#f97316' }}>−{formatCurrency(totalDiscountsAmount)}</span>
                </div>
              )}
              {totalExpenses > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8' }}>🧾 Gastos</span>
                  <span style={{ color: '#ef4444' }}>−{formatCurrency(totalExpenses)}</span>
                </div>
              )}
            </>
          )}

          {/* Adelantos */}
          {totalAdvance > 0 && (
            <>
              <div style={{ height: 1, background: '#1e293b', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#94a3b8' }}>⏩ Adelanto recibido</span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>+{formatCurrency(totalAdvance)}</span>
              </div>
            </>
          )}

          {/* Debes entregar */}
          <div style={{
            background: 'linear-gradient(135deg,#1e1b4b,#1e3a5f)',
            borderRadius: 10, padding: '12px 14px', marginTop: 12,
            textAlign: 'center', border: '1px solid #3b82f6',
          }}>
            <div style={{ fontSize: 10, color: '#93c5fd', letterSpacing: '0.08em', marginBottom: 4 }}>💵 DEBES ENTREGAR</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expectedCash)}</div>
          </div>

          {/* Entregas */}
          <div style={{ height: 1, background: '#1e293b', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#94a3b8' }}>📥 Total entregado</span>
            <span style={{ fontWeight: 800, color: '#a78bfa' }}>{formatCurrency(totalDeliveries)}</span>
          </div>

          {/* Resultado */}
          <div style={{
            marginTop: 10, borderRadius: 8, padding: '10px 12px', textAlign: 'center',
            background: cuadra ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
            border: `2px solid ${cuadra ? '#059669' : '#dc2626'}`,
          }}>
            {cuadra ? (
              <>
                <div style={{ fontSize: 22 }}>✅</div>
                <div style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>TURNO CUADRADO</div>
              </>
            ) : difference < 0 ? (
              <>
                <div style={{ fontSize: 22 }}>⚠️</div>
                <div style={{ fontWeight: 800, color: '#f87171', fontSize: 13 }}>FALTA {formatCurrency(Math.abs(difference))}</div>
                <div style={{ fontSize: 11, color: '#fca5a5' }}>Considera agregar lo que falta antes de cerrar</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22 }}>⚠️</div>
                <div style={{ fontWeight: 800, color: '#f87171', fontSize: 13 }}>ENTREGASTE DE MÁS {formatCurrency(Math.abs(difference))}</div>
                <div style={{ fontSize: 11, color: '#fca5a5' }}>Verifica tus registros antes de cerrar</div>
              </>
            )}
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" className="btn-full" style={{ padding: 14, fontSize: 14 }}
            onClick={() => setConfirmClose(false)}>
            ↩️ No, seguir trabajando
          </Btn>
          <Btn variant="danger" className="btn-full" style={{ padding: 14, fontSize: 14 }}
            onClick={handleConfirmClose}>
            ✅ Sí, cerrar turno
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default CloseConfirmModal;
