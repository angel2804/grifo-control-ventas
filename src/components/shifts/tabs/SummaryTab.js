import React from 'react';
import { ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons } from '../../../utils/helpers';

const SummaryTab = ({ shift, calcs, isGLPShift }) => {
  const {
    salesByProduct, totalSales, totalPayments, totalCreditsAmount,
    totalPromosAmount, totalDiscountsAmount, totalExpenses,
    totalDeliveries, totalAdvance, totalCylindersAmount = 0, expectedCash, difference,
  } = calcs;

  const totalNonCash = totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses;
  const cuadra = Math.abs(difference) < 0.01;

  return (
    <div>
      <div className="card-header">⚖️ Cuadre de Turno</div>

      {/* ── VENTAS ── */}
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 10 }}>
        ⛽ VENTAS
      </div>
      {Object.entries(salesByProduct).map(([prod, data]) => (
        <div key={prod} className="flex-between" style={{ marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ProductTag product={prod} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency(data.amount)}</span>
        </div>
      ))}
      {isGLPShift && (shift.gasCylinders || []).filter(c => parseFloat(c.count) > 0).map((c, i) => (
        <div key={i} className="flex-between" style={{ marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>🛢️ Balón {c.size}kg × {parseFloat(c.count) || 0}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}</span>
        </div>
      ))}
      {isGLPShift && totalCylindersAmount > 0 && (
        <div className="flex-between" style={{ marginBottom: 5, paddingTop: 4, borderTop: '1px solid #1e293b' }}>
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>Total Balones</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b' }}>{formatCurrency(totalCylindersAmount)}</span>
        </div>
      )}
      <div className="flex-between" style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid #1e293b', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Total vendido</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: '#34d399' }}>{formatCurrency(totalSales)}</span>
      </div>

      {/* ── DEDUCCIONES (no efectivo) ── */}
      {totalNonCash > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
            📤 DEDUCCIONES (no es efectivo)
          </div>
          {totalPayments > 0 && (
            <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>💳 Pagos electrónicos</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(totalPayments)}</span>
            </div>
          )}
          {totalCreditsAmount > 0 && (
            <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>📋 Créditos</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(totalCreditsAmount)}</span>
            </div>
          )}
          {totalPromosAmount > 0 && (
            <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>🎁 Promociones</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>−{formatCurrency(totalPromosAmount)}</span>
            </div>
          )}
          {totalDiscountsAmount > 0 && (
            <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>🏷️ Descuentos</span>
              <span style={{ color: '#f97316', fontWeight: 700 }}>−{formatCurrency(totalDiscountsAmount)}</span>
            </div>
          )}
          {totalExpenses > 0 && (
            <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>🧾 Gastos</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>−{formatCurrency(totalExpenses)}</span>
            </div>
          )}
          <div className="flex-between" style={{ paddingTop: 6, marginTop: 4, borderTop: '1px solid #1e293b', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Total a descontar</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fbbf24' }}>−{formatCurrency(totalNonCash)}</span>
          </div>
        </>
      )}

      {/* ── ADELANTOS (suman a lo que debes entregar) ── */}
      {totalAdvance > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⏩ ADELANTOS RECIBIDOS (debes devolver)
          </div>
          <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>Dinero recibido por adelantado</span>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>+{formatCurrency(totalAdvance)}</span>
          </div>
          <div style={{ height: 1, background: '#1e293b', marginBottom: 16, marginTop: 4 }} />
        </>
      )}

      {/* ── EFECTIVO QUE DEBES ENTREGAR ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e3a5f 100%)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        textAlign: 'center', border: '1px solid #3b82f6',
      }}>
        <div style={{ fontSize: 10, color: '#93c5fd', letterSpacing: '0.08em', marginBottom: 6 }}>💵 DEBES ENTREGAR</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expectedCash)}</div>
        {totalAdvance > 0 && (
          <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 6 }}>
            Incluye S/{totalAdvance.toFixed(2)} de adelanto recibido
          </div>
        )}
      </div>

      {/* ── LO QUE ENTREGASTE ── */}
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
        📥 ENTREGASTE
      </div>
      {(shift.deliveries || []).filter(v => parseFloat(v) > 0).length === 0 && (
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '4px 0', marginBottom: 4 }}>Sin entregas registradas</div>
      )}
      {(shift.deliveries || []).filter(v => parseFloat(v) > 0).map((v, i) => (
        <div key={i} className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: '#94a3b8' }}>Entrega #{i + 1}</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(parseFloat(v) || 0)}</span>
        </div>
      ))}
      {totalDeliveries > 0 && (
        <div className="flex-between" style={{ paddingTop: 6, marginTop: 4, borderTop: '1px solid #334155', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Total entregado</span>
          <span style={{ fontWeight: 900, fontSize: 16, color: '#a78bfa' }}>{formatCurrency(totalDeliveries)}</span>
        </div>
      )}

      {/* ── RESULTADO ── */}
      <div style={{
        borderRadius: 12, padding: 14, textAlign: 'center',
        background: cuadra ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
        border: `2px solid ${cuadra ? '#059669' : '#dc2626'}`,
      }}>
        {cuadra ? (
          <>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 16, marginTop: 6 }}>TURNO CUADRADO</div>
            <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>¡Buen trabajo, {shift.worker.split(' ')[0]}!</div>
          </>
        ) : difference < 0 ? (
          <>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ fontWeight: 800, color: '#f87171', fontSize: 15, marginTop: 4 }}>FALTA</div>
            <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 28, lineHeight: 1.1, margin: '6px 0' }}>
              {formatCurrency(Math.abs(difference))}
            </div>
            <div style={{ fontSize: 11, color: '#fca5a5' }}>Revisa tus entregas o agrega lo que falta</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ fontWeight: 800, color: '#f87171', fontSize: 15, marginTop: 4 }}>ENTREGASTE DE MÁS</div>
            <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 28, lineHeight: 1.1, margin: '6px 0' }}>
              {formatCurrency(Math.abs(difference))}
            </div>
            <div style={{ fontSize: 11, color: '#fca5a5' }}>Entregaste más de lo que correspondía</div>
          </>
        )}
      </div>
    </div>
  );
};

export default SummaryTab;
