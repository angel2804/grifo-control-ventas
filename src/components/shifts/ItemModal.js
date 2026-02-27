import React from 'react';
import { Btn, Input, Select } from '../UIComponents';
import { formatCurrency } from '../../utils/helpers';
import { PAYMENT_METHODS, PRODUCTS_LIST } from '../../utils/constants';

const ItemModal = ({ itemModal, setItemModal, setModalField, handleModalSave, handleModalDelete, prices, isGLP }) => {
  const productOptions = (isGLP ? PRODUCTS_LIST : PRODUCTS_LIST.filter(p => p !== 'GLP'))
    .map((p) => ({ value: p, label: p }));
  if (!itemModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setItemModal(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">
            {itemModal.idx === -1 ? '➕ Agregar' : '✏️ Editar'}{' '}
            {itemModal.type === 'payment' && `Pago — ${itemModal.data.method}`}
            {itemModal.type === 'credit' && `Crédito — ${itemModal.data.product}`}
            {itemModal.type === 'promo' && `Promoción — ${itemModal.data.product}`}
            {itemModal.type === 'discount' && `Descuento — ${itemModal.data.product}`}
          </div>
          <Btn variant="ghost" className="btn-icon" onClick={() => setItemModal(null)}>✕</Btn>
        </div>

        {/* ---- Campos: PAGO ---- */}
        {itemModal.type === 'payment' && (
          <div>
            <Select label="MÉTODO DE PAGO" value={itemModal.data.method}
              onChange={(e) => setModalField('method', e.target.value)}
              options={PAYMENT_METHODS} />
            <Input label="N° Referencia / Operación" value={itemModal.data.reference}
              placeholder="Ej: 00123456"
              onChange={(e) => setModalField('reference', e.target.value)} />
            <Input label="N° Factura (opcional)" value={itemModal.data.invoice}
              placeholder="Ej: F001-123"
              onChange={(e) => setModalField('invoice', e.target.value)} />
            <Input label="💰 Monto recibido (S/)" type="number" value={itemModal.data.amount}
              placeholder="0.00"
              onChange={(e) => setModalField('amount', e.target.value)}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
          </div>
        )}

        {/* ---- Campos: CRÉDITO ---- */}
        {itemModal.type === 'credit' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />
            <Input label="Cliente / Empresa" value={itemModal.data.client}
              placeholder="Nombre del cliente"
              onChange={(e) => setModalField('client', e.target.value)} />
            <div className="grid-2">
              <Input label="N° Vale" value={itemModal.data.voucher}
                placeholder="Ej: V-001"
                onChange={(e) => setModalField('voucher', e.target.value)} />
              <Input label="N° Factura (opcional)" value={itemModal.data.invoice}
                placeholder="Ej: F002-001"
                onChange={(e) => setModalField('invoice', e.target.value)} />
            </div>
            <Input label="⛽ Galones despachados" type="number" value={itemModal.data.gallons}
              placeholder="0.000"
              onChange={(e) => setModalField('gallons', e.target.value)}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
            {(parseFloat(itemModal.data.gallons) || 0) > 0 && (
              <div style={{ textAlign: 'right', fontSize: 13, color: '#f59e0b', marginTop: -4, marginBottom: 8 }}>
                ≈ {formatCurrency((parseFloat(itemModal.data.gallons) || 0) * (prices[itemModal.data.product] || 0))}
              </div>
            )}
          </div>
        )}

        {/* ---- Campos: PROMOCIÓN ---- */}
        {itemModal.type === 'promo' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />
            <Input label="DNI o Placa del vehículo" value={itemModal.data.dniPlate}
              placeholder="Ej: ABC-123 o 12345678"
              onChange={(e) => setModalField('dniPlate', e.target.value)} />
            <Input label="⛽ Galones entregados" type="number" value={itemModal.data.gallons}
              placeholder="0.000"
              onChange={(e) => setModalField('gallons', e.target.value)}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
            {(parseFloat(itemModal.data.gallons) || 0) > 0 && (
              <div style={{ textAlign: 'right', fontSize: 13, color: '#8b5cf6', marginTop: -4, marginBottom: 8 }}>
                ≈ {formatCurrency((parseFloat(itemModal.data.gallons) || 0) * (prices[itemModal.data.product] || 0))}
              </div>
            )}
          </div>
        )}

        {/* ---- Campos: DESCUENTO ---- */}
        {itemModal.type === 'discount' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />
            <Input label="Cliente / Empresa" value={itemModal.data.client}
              placeholder="Nombre del cliente"
              onChange={(e) => setModalField('client', e.target.value)} />
            <div className="grid-2">
              <Input label="⛽ Galones vendidos" type="number" value={itemModal.data.gallons}
                placeholder="0.000"
                onChange={(e) => setModalField('gallons', e.target.value)}
                style={{ fontWeight: 800 }} />
              <Input label="💰 Precio especial (S/ por galón)" type="number" value={itemModal.data.price}
                placeholder={`Normal: ${prices[itemModal.data.product] || '—'}`}
                onChange={(e) => setModalField('price', e.target.value)}
                style={{ fontWeight: 800 }} />
            </div>
            {(parseFloat(itemModal.data.gallons) || 0) > 0 && (parseFloat(itemModal.data.price) || 0) > 0 && (() => {
              const normalPrice = prices[itemModal.data.product] || 0;
              const diff = Math.max(0, normalPrice - (parseFloat(itemModal.data.price) || 0));
              const total = (parseFloat(itemModal.data.gallons) || 0) * diff;
              return (
                <div style={{ textAlign: 'right', fontSize: 13, color: '#ef4444', marginBottom: 8 }}>
                  Descuento: {formatCurrency(diff)}/gal &rarr; Total: {formatCurrency(total)}
                </div>
              );
            })()}
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {itemModal.idx !== -1 && (
            <Btn variant="danger" style={{ padding: '12px 16px', flexShrink: 0 }}
              onClick={handleModalDelete}>
              🗑️
            </Btn>
          )}
          <Btn variant="ghost" className="btn-full" style={{ padding: 14 }}
            onClick={() => setItemModal(null)}>
            Cancelar
          </Btn>
          <Btn className="btn-full" style={{ padding: 14, fontWeight: 800 }}
            onClick={handleModalSave}>
            ✅ Guardar
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default ItemModal;
