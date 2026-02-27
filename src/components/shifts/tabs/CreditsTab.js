import React from 'react';
import { Btn, HelpBtn, ProductTag } from '../../UIComponents';
import { formatCurrency, formatGallons } from '../../../utils/helpers';
import { PRODUCTS_LIST } from '../../../utils/constants';

const PROD_COLORS = { BIO: '#22c55e', REGULAR: '#3b82f6', PREMIUM: '#eab308', GLP: '#f97316' };

const CreditsTab = ({ shift, prices, calcs, actions }) => {
  const { totalCreditsAmount } = calcs;
  const { openAddModal, openEditModal } = actions;
  const productOptions = PRODUCTS_LIST.map((p) => ({ value: p, label: p }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>📄 Créditos</div>
        <HelpBtn title="Créditos" steps={[
          'Un crédito es gasolina que despachas pero NO cobras en el momento (se paga después).',
          'Cada columna es un tipo de combustible. Toca "➕ Agregar" para añadir un crédito.',
          'Escribe el nombre del cliente, el número de vale y los galones despachados.',
          'Para editar o eliminar un crédito ya registrado, tócalo para abrir la ventana.',
          'Al final verás el total de créditos en soles para que el admin lo verifique.',
        ]} />
      </div>
      <div className="grid-4" style={{ gap: 10 }}>
        {productOptions.map(({ value: product, label }) => {
          const color = PROD_COLORS[product] || '#6366f1';
          const prodItems = shift.credits
            .map((c, i) => ({ ...c, _idx: i }))
            .filter((c) => c.product === product);
          const prodGallons = prodItems.reduce((s, c) => s + (parseFloat(c.gallons) || 0), 0);
          const prodTotal = prodItems.reduce(
            (s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0
          );
          return (
            <div key={product} style={{
              background: '#0f172a', borderRadius: 12,
              padding: '14px 12px', borderTop: `3px solid ${color}`,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <ProductTag product={product} />
                <div style={{ fontWeight: 800, fontSize: 15, margin: '6px 0 2px' }}>{label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {prodItems.length === 0 ? 'Sin registros' : `${prodItems.length} · ${formatGallons(prodGallons)}`}
                </div>
                <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 16, marginBottom: 10 }}>
                  {formatCurrency(prodTotal)}
                </div>
                <Btn className="btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openAddModal('credit', { product, client: '', voucher: '', invoice: '', gallons: 0 })}>
                  ➕ Agregar
                </Btn>
              </div>
              {prodItems.length > 0 && (
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  {prodItems.map((c) => (
                    <div key={c._idx}
                      onClick={() => openEditModal('credit', c._idx, c)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 2px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
                      }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.client || '—'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{formatGallons(parseFloat(c.gallons) || 0)}</span>
                        <span style={{ fontSize: 10, color: '#475569' }}>✏️</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {shift.credits.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#f59e0b', marginTop: 10 }}>
          Total Créditos: {formatCurrency(totalCreditsAmount)}
        </div>
      )}
    </div>
  );
};

export default CreditsTab;
