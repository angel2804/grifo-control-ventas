import React from 'react';
import { Card } from '../UIComponents';
import { formatCurrency, formatGallons } from '../../utils/helpers';

// ── Constantes compartidas ──
export const SHIFT_ORDER = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };
export const SHIFT_ICON  = { 'Mañana': '🌅', 'Tarde': '🌆', 'Noche': '🌙' };

export const ALL_WIZARD_STEPS = [
  { id: 'meters',     label: 'Contómetros', icon: '⛽' },
  { id: 'payments',   label: 'Pagos',       icon: '💳' },
  { id: 'credits',    label: 'Créditos',    icon: '📋' },
  { id: 'promotions', label: 'Promos',      icon: '🎁' },
  { id: 'discounts',  label: 'Descuentos',  icon: '🏷️' },
  { id: 'expenses',   label: 'Gastos',      icon: '🧾' },
  { id: 'summary',    label: 'Resumen',     icon: '✅' },
];

// ── Toggle: null → true → false → null ──
export const ToggleBtn = ({ verified, onToggle }) => (
  <button onClick={onToggle} style={{
    background: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, minWidth: 44,
    padding: '5px 10px', borderRadius: 8, transition: 'all 0.15s',
    border: `2px solid ${verified === null ? '#334155' : verified ? '#059669' : '#dc2626'}`,
  }}>
    {verified === null ? '⬜' : verified ? '✅' : '❌'}
  </button>
);

// ── Paso genérico de ítems (pagos / créditos / promos / descuentos) ──
export const ItemStep = ({ title, description, items, headers, renderRow, onToggle, verifiedAmt, onToggleAll }) => (
  <Card>
    {title && <div className="card-header">{title}</div>}
    {description && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{description}</p>}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
        <span>⬜ Sin revisar</span>
        <span style={{ color: '#34d399' }}>✅ Confirmado</span>
        <span style={{ color: '#ef4444' }}>❌ No encontrado</span>
      </div>
      {onToggleAll && (
        <button onClick={onToggleAll} style={{
          fontSize: 12, fontWeight: 700, background: '#059669', color: '#fff',
          border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer',
        }}>✅ Verificar todos</button>
      )}
    </div>
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          {headers.map(h => <th key={h}>{h}</th>)}
          <th style={{ textAlign: 'center', width: 80 }}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item._id} style={{
            background: item.verified === true ? 'rgba(52,211,153,0.07)'
              : item.verified === false ? 'rgba(239,68,68,0.07)' : '',
          }}>
            {renderRow(item).map((cell, ci) => <td key={ci}>{cell}</td>)}
            <td style={{ textAlign: 'center' }}>
              <ToggleBtn verified={item.verified} onToggle={() => onToggle(item._id)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginTop: 14 }}>
      <div className="flex-between">
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Total confirmados</span>
        <span style={{ fontWeight: 800, color: '#34d399', fontSize: 16 }}>{formatCurrency(verifiedAmt)}</span>
      </div>
    </div>
  </Card>
);

// ── Sidebar: efectivo estimado en tiempo real ──
export const WizardSidebar = ({ totalSales, deductions, runningCash, checkedItems, totalItems, hasEdits, children }) => (
  <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
    <div style={{ background: '#0f172a', borderRadius: 14, padding: 18, border: '1px solid #1e293b' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', marginBottom: 14 }}>
        💵 EFECTIVO A ENTREGAR
      </div>
      <div style={{ marginBottom: 10 }}>
        <div className="flex-between" style={{ fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#94a3b8' }}>Total venta</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(totalSales)}</span>
        </div>
        {deductions.filter(d => d.amt > 0).map(d => (
          <div key={d.label} className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>{d.label}</span>
            <span style={{ color: d.color, fontWeight: 700 }}>−{formatCurrency(d.amt)}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #1e3a5f)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>ESTIMADO (ítems verificados)</div>
        <div style={{ fontWeight: 900, fontSize: 28, color: '#60a5fa', lineHeight: 1.1 }}>{formatCurrency(runningCash)}</div>
      </div>
      {totalItems > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
            <span>Ítems verificados</span>
            <span style={{ fontWeight: 700, color: checkedItems === totalItems ? '#34d399' : '#f59e0b' }}>
              {checkedItems}/{totalItems}
            </span>
          </div>
          <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.3s',
              width: `${Math.round((checkedItems / totalItems) * 100)}%`,
              background: checkedItems === totalItems ? '#059669' : '#f59e0b',
            }} />
          </div>
        </div>
      )}
      {hasEdits && (
        <div style={{ marginTop: 12, fontSize: 11, background: '#78350f', color: '#fde68a', padding: '6px 10px', borderRadius: 8, fontWeight: 700, textAlign: 'center' }}>
          ● DATOS CORREGIDOS
        </div>
      )}
    </div>
    {children}
  </div>
);

export const SumRow = ({ label, value }) => (
  <div className="flex-between" style={{ padding: '5px 0', fontSize: 13 }}>
    <span style={{ color: '#94a3b8' }}>{label}</span>
    <span style={{ fontWeight: 700 }}>{value}</span>
  </div>
);

export const GalRow = ({ label, value, color, note, bold }) => (
  <div style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
    <div className="flex-between">
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? 18 : 14, color }}>
        {formatGallons(value)}
      </span>
    </div>
    {note && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{note}</div>}
  </div>
);

// ── Badge de trabajador (usado en VerifyDayForm) ──
export const WBadge = ({ worker }) => (
  <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{worker}</span>
);
