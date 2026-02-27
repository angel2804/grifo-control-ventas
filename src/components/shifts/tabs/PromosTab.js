import React from 'react';
import { Btn, HelpBtn, ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons } from '../../../utils/helpers';

const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };

const PromosTab = ({ shift, prices, calcs, actions, islandConfig }) => {
  const { totalPromosAmount } = calcs;
  const { openAddModal, openEditModal } = actions;
  const products = islandConfig?.isGLP ? ['GLP'] : ['BIO', 'REGULAR', 'PREMIUM'];
  const gridClass = products.length >= 3 ? 'grid-3' : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>🎁 Promociones</div>
        <HelpBtn title="Promociones" steps={[
          'Las promociones son galones que se dan gratis como parte de una campaña o beneficio.',
          'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir una promoción.',
          'En "DNI / Placa" escribe el documento o la placa del vehículo que recibió la promo.',
          'Para editar o eliminar una promoción ya registrada, tócala para abrir la ventana.',
          'Estos galones sí aparecen en los contómetros pero no generan cobro en el cuadre.',
        ]} />
      </div>
      <div className={gridClass} style={{ gap: 10 }}>
        {products.map((product) => {
          const color = PROD_COLORS[product] || '#8b5cf6';
          const prodItems = shift.promotions
            .map((p, i) => ({ ...p, _idx: i }))
            .filter((p) => p.product === product);
          const prodGallons = prodItems.reduce((s, p) => s + (parseFloat(p.gallons) || 0), 0);
          const prodTotal = prodItems.reduce(
            (s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0
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
                <div style={{ fontWeight: 900, color: '#8b5cf6', fontSize: 16, marginBottom: 10 }}>
                  {formatCurrency(prodTotal)}
                </div>
                <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openAddModal('promo', { product, dniPlate: '', gallons: 0 })}>
                  ➕ Agregar
                </Btn>
              </div>
              {prodItems.length > 0 && (
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  {prodItems.map((p) => (
                    <div key={p._idx}
                      onClick={() => openEditModal('promo', p._idx, p)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 4px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                      }}>
                      <span style={{ fontSize: 13, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.dniPlate || '—'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{formatGallons(parseFloat(p.gallons) || 0)}</span>
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
      {shift.promotions.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#8b5cf6', marginTop: 10 }}>
          Total Promociones: {formatCurrency(totalPromosAmount)}
        </div>
      )}
    </div>
  );
};

export default PromosTab;
