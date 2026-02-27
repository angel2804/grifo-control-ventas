import React from 'react';
import { Btn, HelpBtn, ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons } from '../../../utils/helpers';

const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };

const DiscountsTab = ({ shift, prices, calcs, actions, islandConfig }) => {
  const { totalDiscountsAmount } = calcs;
  const { openAddModal, openEditModal } = actions;
  const products = islandConfig?.isGLP ? ['GLP'] : ['BIO', 'REGULAR', 'PREMIUM'];
  const gridClass = products.length >= 3 ? 'grid-3' : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>🔻 Descuentos</div>
        <HelpBtn title="Descuentos" steps={[
          'Un descuento es cuando vendes combustible a un precio menor al normal (precio especial).',
          'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir un descuento.',
          'Escribe el nombre del cliente y el precio especial acordado por galón.',
          'Para editar o eliminar un descuento ya registrado, tócalo para abrir la ventana.',
          'El sistema calcula automáticamente el total de los descuentos del turno.',
        ]} />
      </div>
      <div className={gridClass} style={{ gap: 10 }}>
        {products.map((product) => {
          const color = PROD_COLORS[product] || '#ef4444';
          const prodItems = shift.discounts
            .map((d, i) => ({ ...d, _idx: i }))
            .filter((d) => d.product === product);
          const prodGallons = prodItems.reduce((s, d) => s + (parseFloat(d.gallons) || 0), 0);
          const prodTotal = prodItems.reduce(
            (s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[product] || 0) - (parseFloat(d.price) || 0)), 0
          );
          return (
            <div key={product} style={{
              background: '#0f172a', borderRadius: 12,
              padding: '14px 12px', borderTop: `3px solid ${color}`,
              marginBottom: gridClass ? 0 : 10,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <ProductTag product={product} />
                <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 2px' }}>{product}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {prodItems.length === 0 ? 'Sin registros' : `${prodItems.length} · ${formatGallons(prodGallons)}`}
                </div>
                <div style={{ fontWeight: 900, color: '#ef4444', fontSize: 16, marginBottom: 10 }}>
                  {formatCurrency(prodTotal)}
                </div>
                <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openAddModal('discount', { product, client: '', gallons: 0, price: prices[product] || 0 })}>
                  ➕ Agregar
                </Btn>
              </div>
              {prodItems.length > 0 && (
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  {prodItems.map((d) => (
                    <div key={d._idx}
                      onClick={() => openEditModal('discount', d._idx, d)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 4px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                      }}>
                      <span style={{ fontSize: 13, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.client || '—'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{formatGallons(parseFloat(d.gallons) || 0)}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>✏️</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {shift.discounts.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#ef4444', marginTop: 10 }}>
          Total Descuentos: {formatCurrency(totalDiscountsAmount)}
        </div>
      )}
    </div>
  );
};

export default DiscountsTab;
