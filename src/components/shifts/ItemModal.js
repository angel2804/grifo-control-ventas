import React, { useMemo } from 'react';
import { Btn, Input, Select } from '../UIComponents';
import { formatCurrency } from '../../utils/helpers';
import { PAYMENT_METHODS, PRODUCTS_LIST } from '../../utils/constants';
import { useAllClients } from '../../hooks/useAllClients';
import ClientAutocomplete from '../credits/ClientAutocomplete';
import { useApp } from '../../context/AppContext';

const DupWarning = ({ msg }) => (
  <div style={{
    color: '#fbbf24', background: '#1a1200', border: '1px solid #713f12',
    borderRadius: 6, padding: '7px 10px', fontSize: 12, marginTop: -8, marginBottom: 10,
  }}>
    ⚠️ {msg} — ¿Deseas continuar?
  </div>
);

// ============================================
// COMPONENTE: ItemModal
// Modal para agregar / editar ítems de turno:
// pagos, créditos, promociones, descuentos.
// - Créditos y descuentos: cliente en MAYÚSCULAS
//   con autocompletado de clientes registrados.
// - Vale y factura siempre en MAYÚSCULAS.
// ============================================

const ItemModal = ({ itemModal, setItemModal, setModalField, handleModalSave, handleModalDelete, prices, isGLP }) => {
  const productOptions = (isGLP ? PRODUCTS_LIST : PRODUCTS_LIST.filter((p) => p !== 'GLP'))
    .map((p) => ({ value: p, label: p }));

  const allClients = useAllClients();
  const { shifts, creditImports } = useApp();

  // Detectar vales/facturas duplicados (solo en créditos)
  const voucherDup = useMemo(() => {
    if (itemModal?.type !== 'credit') return null;
    const v = (itemModal?.data?.voucher || '').trim().toUpperCase();
    if (!v) return null;
    for (const s of shifts) {
      for (const c of (s.credits || [])) {
        if ((c.voucher || '').toUpperCase() === v) return `Vale ya registrado en turno del ${s.date} — ${s.worker || ''}`;
      }
    }
    for (const imp of (creditImports || [])) {
      if ((imp.voucher || '').toUpperCase() === v) return `Vale ya registrado en crédito importado de ${(imp.clientName || '').toUpperCase()}`;
    }
    return null;
  }, [itemModal?.data?.voucher, itemModal?.type, shifts, creditImports]);

  const invoiceDup = useMemo(() => {
    if (itemModal?.type !== 'credit') return null;
    const inv = (itemModal?.data?.invoice || '').trim().toUpperCase();
    if (!inv) return null;
    for (const s of shifts) {
      for (const c of (s.credits || [])) {
        if ((c.invoice || '').toUpperCase() === inv) return `Factura ya registrada en turno del ${s.date} — ${s.worker || ''}`;
      }
    }
    for (const imp of (creditImports || [])) {
      if ((imp.invoice || '').toUpperCase() === inv) return `Factura ya registrada en crédito importado de ${(imp.clientName || '').toUpperCase()}`;
    }
    return null;
  }, [itemModal?.data?.invoice, itemModal?.type, shifts, creditImports]);

  if (!itemModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setItemModal(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">
            {itemModal.idx === -1 ? '➕ Agregar' : '✏️ Editar'}{' '}
            {itemModal.type === 'payment'  && `Pago — ${itemModal.data.method}`}
            {itemModal.type === 'credit'   && `Crédito — ${itemModal.data.product}`}
            {itemModal.type === 'promo'    && `Promoción — ${itemModal.data.product}`}
            {itemModal.type === 'discount' && `Descuento — ${itemModal.data.product}`}
          </div>
          <Btn variant="ghost" className="btn-icon" onClick={() => setItemModal(null)}>✕</Btn>
        </div>

        {/* ── PAGO ── */}
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
              onChange={(e) => setModalField('invoice', e.target.value.toUpperCase())} />
            <Input label="💰 Monto recibido (S/)" type="number" value={itemModal.data.amount}
              placeholder="0.00"
              onChange={(e) => setModalField('amount', e.target.value)}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
          </div>
        )}

        {/* ── CRÉDITO ── */}
        {itemModal.type === 'credit' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />

            {/* Cliente con autocompletado y MAYÚSCULAS */}
            <ClientAutocomplete
              label="CLIENTE / EMPRESA"
              value={itemModal.data.client}
              onChange={(v) => setModalField('client', v)}
              allClients={allClients}
              placeholder="Nombre del cliente"
            />

            <Input label="N° VALE" value={itemModal.data.voucher}
              placeholder="Ej: V-001"
              onChange={(e) => setModalField('voucher', e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }} />
            {voucherDup && <DupWarning msg={voucherDup} />}
            <Input label="N° FACTURA (opcional)" value={itemModal.data.invoice}
              placeholder="Ej: F002-001"
              onChange={(e) => setModalField('invoice', e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }} />
            {invoiceDup && <DupWarning msg={invoiceDup} />}
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

        {/* ── PROMOCIÓN ── */}
        {itemModal.type === 'promo' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />
            <Input label="DNI o Placa del vehículo" value={itemModal.data.dniPlate}
              placeholder="Ej: ABC-123 o 12345678"
              onChange={(e) => setModalField('dniPlate', e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }} />
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

        {/* ── DESCUENTO ── */}
        {itemModal.type === 'discount' && (
          <div>
            <Select label="PRODUCTO" value={itemModal.data.product}
              onChange={(e) => setModalField('product', e.target.value)}
              options={productOptions} />

            {/* Cliente con autocompletado y MAYÚSCULAS */}
            <ClientAutocomplete
              label="CLIENTE / EMPRESA"
              value={itemModal.data.client}
              onChange={(v) => setModalField('client', v)}
              allClients={allClients}
              placeholder="Nombre del cliente"
            />

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

        {/* Botones */}
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
