import React from 'react';
import { ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons } from '../../../utils/helpers';

const SummaryTab = ({ shift, calcs, isGLPShift }) => {
  const {
    salesByProduct, totalSales, totalPayments, totalCreditsAmount,
    totalPromosAmount, totalDiscountsAmount, totalExpenses,
    totalDeliveries, totalAdvance, expectedCash, difference,
  } = calcs;

  const totalNonCash = totalPayments + totalCreditsAmount + totalPromosAmount + totalDiscountsAmount + totalExpenses;

  return (
    <div>
      <div className="card-header">⚖️ Cuadre de Turno</div>

      {/* ── BLOQUE 1: LO QUE VENDISTE ── */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
          ⛽ LO QUE VENDISTE
        </div>
        {Object.entries(salesByProduct).map(([prod, data]) => (
          <div key={prod} className="summary-row summary-row-border">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProductTag product={prod} />
              <span style={{ fontSize: 12, color: '#64748b' }}>{formatGallons(data.gallons)}</span>
            </span>
            <span className="font-bold">{formatCurrency(data.amount)}</span>
          </div>
        ))}
        {isGLPShift && (shift.gasCylinders || []).filter(c => parseFloat(c.count) > 0).map((c, i) => (
          <div key={i} className="summary-row summary-row-border">
            <span>🛢️ Balón {c.size} kg × {parseFloat(c.count) || 0}</span>
            <span className="font-bold">{formatCurrency((parseFloat(c.count) || 0) * (parseFloat(c.price) || 0))}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>TOTAL VENDIDO</span>
          <span style={{ fontWeight: 900, fontSize: 28, color: '#34d399' }}>{formatCurrency(totalSales)}</span>
        </div>
      </div>

      {/* ── BLOQUE 2: LO QUE NO ES EFECTIVO ── */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
          📤 LO QUE NO ES EFECTIVO (se descuenta)
        </div>
        {totalPayments > 0 && (
          <div className="summary-row summary-row-border">
            <span>💳 Pagos electrónicos</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalPayments)}</span>
          </div>
        )}
        {totalCreditsAmount > 0 && (
          <div className="summary-row summary-row-border">
            <span>📋 Créditos</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalCreditsAmount)}</span>
          </div>
        )}
        {totalPromosAmount > 0 && (
          <div className="summary-row summary-row-border">
            <span>🎁 Promociones</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalPromosAmount)}</span>
          </div>
        )}
        {totalDiscountsAmount > 0 && (
          <div className="summary-row summary-row-border">
            <span>🏷️ Descuentos</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>− {formatCurrency(totalDiscountsAmount)}</span>
          </div>
        )}
        {totalExpenses > 0 && (
          <div className="summary-row summary-row-border">
            <span>🧾 Gastos</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>− {formatCurrency(totalExpenses)}</span>
          </div>
        )}
        {totalNonCash === 0 && (
          <div style={{ color: '#475569', textAlign: 'center', fontSize: 13, padding: '6px 0' }}>Sin deducciones</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Total a descontar</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fbbf24' }}>
            − {formatCurrency(totalNonCash)}
          </span>
        </div>
      </div>

      {/* ── BLOQUE 3: EFECTIVO QUE DEBES ENTREGAR ── */}
      <div style={{
        background: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)',
        borderRadius: 12, padding: 20, marginBottom: 12,
        border: '2px solid #3b82f6',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: 1, marginBottom: 14, textAlign: 'center' }}>
          💵 EFECTIVO QUE DEBES ENTREGAR
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
          <span>Total vendido</span>
          <span>{formatCurrency(totalSales)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
          <span>Menos no-efectivo</span>
          <span>− {formatCurrency(totalNonCash)}</span>
        </div>
        <div style={{ borderTop: '1px solid #1d4ed8', paddingTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>DEBES ENTREGAR</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{formatCurrency(expectedCash)}</div>
        </div>
      </div>

      {/* ── BLOQUE 4: LO QUE ENTREGASTE ── */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
          📥 LO QUE ENTREGASTE
        </div>
        {(shift.deliveries || []).filter(v => parseFloat(v) > 0).map((v, i) => (
          <div key={i} className="summary-row summary-row-border">
            <span>Entrega #{i + 1}</span>
            <span className="font-bold">{formatCurrency(parseFloat(v))}</span>
          </div>
        ))}
        {totalAdvance > 0 && (
          <div className="summary-row summary-row-border">
            <span>Pagos adelantados</span>
            <span className="font-bold">{formatCurrency(totalAdvance)}</span>
          </div>
        )}
        {totalDeliveries === 0 && totalAdvance === 0 && (
          <div style={{ color: '#475569', textAlign: 'center', fontSize: 13, padding: '6px 0' }}>Sin entregas registradas</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Total entregado</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#a78bfa' }}>{formatCurrency(totalDeliveries + totalAdvance)}</span>
        </div>
      </div>

      {/* ── CUADRE FINAL ── */}
      <div className={`cuadre-box ${Math.abs(difference) < 0.01 ? 'cuadre-ok' : 'cuadre-error'}`}>
        {Math.abs(difference) < 0.01 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 6 }}>TODO CUADRA</div>
            <div style={{ fontSize: 13, color: '#6ee7b7', marginTop: 8 }}>
              Entregaste exactamente lo que correspondía. ¡Buen trabajo!
            </div>
          </div>
        ) : difference < 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>FALTA DINERO</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', margin: '10px 0 6px' }}>{formatCurrency(Math.abs(difference))}</div>
            <div style={{ fontSize: 13, color: '#fca5a5' }}>Falta este monto. Revisa tus entregas o agrega lo que falta.</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fca5a5', marginTop: 6 }}>ENTREGASTE DE MÁS</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', margin: '10px 0 6px' }}>{formatCurrency(Math.abs(difference))}</div>
            <div style={{ fontSize: 13, color: '#fca5a5' }}>Entregaste más de lo que correspondía. Verifica tus registros.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTab;
