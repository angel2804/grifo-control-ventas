import React, { useState } from 'react';
import { PRODUCT_COLORS } from '../utils/constants';

// ============================================
// COMPONENTE: Card
// Tarjeta contenedora con título opcional
// ============================================
export const Card = ({ children, className = '', title, icon, style }) => (
  <div className={`card ${className}`} style={style}>
    {title && (
      <div className="card-header">
        {icon && <span>{icon}</span>}
        {title}
      </div>
    )}
    {children}
  </div>
);

// ============================================
// COMPONENTE: Input
// Campo de texto con etiqueta
// ============================================
export const Input = ({ label, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input className="input-field" {...props} />
  </div>
);

// ============================================
// COMPONENTE: Select
// Selector desplegable con etiqueta
// ============================================
export const Select = ({ label, options, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <select className="select-field" {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================
// COMPONENTE: Btn (Botón)
// Variantes: primary, success, danger, ghost
// ============================================
export const Btn = ({ variant = 'primary', children, className = '', ...props }) => {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ============================================
// COMPONENTE: Modal
// Ventana emergente centrada
// ============================================
export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <Btn variant="ghost" onClick={onClose} className="btn-icon">
            ✕
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: StatCard
// Tarjeta de estadística con color
// ============================================
export const StatCard = ({ label, value, color = '#6366f1', icon }) => (
  <div
    className="card stat-card"
    style={{ borderTop: `3px solid ${color}` }}
  >
    <div className="stat-label">
      {icon && <span>{icon}</span>}
      {label}
    </div>
    <div className="stat-value" style={{ color }}>
      {value}
    </div>
  </div>
);

// ============================================
// COMPONENTE: ProductTag
// Etiqueta coloreada para cada producto
// ============================================
export const ProductTag = ({ product }) => {
  const colors = PRODUCT_COLORS[product];
  if (!colors) return <span>{product}</span>;

  return (
    <span className={`product-tag ${colors.className}`}>
      {product}
    </span>
  );
};

// ============================================
// COMPONENTE: StatusBadge
// Badge de estado (abierto/cerrado)
// ============================================
export const StatusBadge = ({ status }) => (
  <span className={`badge ${status === 'closed' ? 'badge-closed' : 'badge-open'}`}>
    {status === 'closed' ? 'Cerrado' : 'Abierto'}
  </span>
);

// ============================================
// COMPONENTE: RoleBadge
// Badge de rol (admin/grifero)
// ============================================
export const RoleBadge = ({ role }) => (
  <span className={`badge ${role === 'admin' ? 'badge-admin' : 'badge-worker'}`}>
    {role === 'admin' ? 'Admin' : 'Grifero'}
  </span>
);

// ============================================
// COMPONENTE: HelpBtn
// Botón ❓ que abre una guía paso a paso
// Uso: <HelpBtn title="..." steps={['paso1', 'paso2']} />
// ============================================
export const HelpBtn = ({ title, steps }) => {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        title="¿Cómo funciona esta sección?"
        style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '50%', width: 28, height: 28, minWidth: 28,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#a5b4fc', fontSize: 14, fontWeight: 800,
          fontFamily: 'inherit',
        }}
      >?</button>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">❓ {title}</div>
              <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #1e293b' }}>
                  <div style={{
                    background: '#6366f1', color: '#fff', borderRadius: '50%',
                    width: 28, height: 28, minWidth: 28, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                  }}>{i + 1}</div>
                  <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShow(false)}
              style={{
                width: '100%', marginTop: 16, padding: '13px 0',
                background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >✓ Entendido</button>
          </div>
        </div>
      )}
    </>
  );
};
