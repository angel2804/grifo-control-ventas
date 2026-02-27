import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, Input, Select, Modal, StatCard } from '../components/UIComponents';
import { formatCurrency, formatGallons, getTodayDate } from '../utils/helpers';
import { PRODUCTS_LIST } from '../utils/constants';
import ClientAutocomplete from '../components/credits/ClientAutocomplete';
import { useAllClients } from '../hooks/useAllClients';

// ============================================
// PÁGINA: Créditos (solo admin)
// - Resumen por cliente con saldo pendiente
// - Modal de detalle: créditos con verificación ✓ y edición ✏️
// - Registro de cobros
// - Detección de vales/facturas duplicados
// - Importar / exportar CSV → Excel
// - Filtros por cliente, vale, factura, fecha
// ============================================

// ── Distancia de edición para detectar nombres similares ──
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── CSV / Excel helpers ───────────────────────

function parseCSV(text) {
  let lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines[0].toLowerCase().startsWith('sep=')) lines = lines.slice(1);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';

  function parseRow(line) {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (c === sep && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = parseRow(lines[0]).map(h => h.replace(/['"]/g, '').toUpperCase().trim());
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseRow(l);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').replace(/^"|"$/g, '').trim()]));
  });
}

// Plantilla: punto y coma → abre en columnas en Excel español
function downloadCSV(rows, filename) {
  const csv = ['sep=;', ...rows.map(r =>
    r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
  )].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Exportar: tabla HTML .xls → columnas perfectas en todas las versiones de Excel
function downloadXLS(headers, dataRows, filename) {
  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = [headers, ...dataRows];
  const tableHTML = rows.map((row, i) =>
    `<tr>${row.map(cell =>
      i === 0
        ? `<th style="background:#1e3a5f;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #334155">${esc(cell)}</th>`
        : `<td style="padding:5px 10px;border:1px solid #e2e8f0">${esc(cell)}</td>`
    ).join('')}</tr>`
  ).join('\n');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Créditos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="0" cellspacing="0" cellpadding="0">${tableHTML}</table></body></html>`;
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.replace(/\.csv$/, '.xls');
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Fila de crédito con verificación y edición ──

const CreditVerifyRow = ({ tx, isVerified, onToggle, onEdit, onDelete }) => {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px', borderBottom: '1px solid #1e293b' }}>
      {/* Check de verificación */}
      <button
        onClick={onToggle}
        title={isVerified ? 'Verificado — clic para desmarcar' : 'Marcar como verificado (corroborado físicamente)'}
        style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${isVerified ? '#10b981' : '#475569'}`,
          background: isVerified ? '#10b981' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, marginTop: 2,
        }}
      >
        {isVerified ? '✓' : ''}
      </button>

      {/* Info del crédito */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{tx.date}</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{tx.product || '—'}</span>
          <span style={{ color: '#34d399' }}>{formatGallons(tx.gallons)}</span>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{formatCurrency(tx.amount)}</span>
          {tx.shift && <span style={{ color: '#64748b', fontSize: 11 }}>{tx.shift}</span>}
          {tx.worker && <span style={{ color: '#64748b', fontSize: 11 }}>· {tx.worker}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5, fontSize: 12 }}>
          {tx.voucher ? (
            <span style={{ color: '#fbbf24', background: '#1a1200', padding: '2px 8px', borderRadius: 4, border: '1px solid #713f12' }}>
              📄 {tx.voucher}
            </span>
          ) : (
            <span style={{ color: '#334155', fontSize: 11 }}>Sin vale</span>
          )}
          {tx.invoice && (
            <span style={{ color: '#60a5fa', background: '#0c1a2e', padding: '2px 8px', borderRadius: 4, border: '1px solid #1e40af' }}>
              🧾 {tx.invoice}
            </span>
          )}
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: tx.source === 'Turno' ? '#1e3a5f' : '#1a2e1a',
            color: tx.source === 'Turno' ? '#60a5fa' : '#4ade80',
          }}>
            {tx.source}
          </span>
          {isVerified && (
            <span style={{ fontSize: 10, color: '#10b981', padding: '2px 6px', background: '#0f2d1f', borderRadius: 4, border: '1px solid #166534' }}>
              ✓ verificado
            </span>
          )}
        </div>
      </div>

      {/* Botones editar / eliminar */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          title="Editar este crédito"
          style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: 12 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
        >
          ✏️
        </button>
        {onDelete && (
          confirmDel ? (
            <>
              <button
                onClick={() => { onDelete(); setConfirmDel(false); }}
                title="Confirmar eliminación"
                style={{ background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 800 }}
              >
                ✓ Borrar
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                title="Cancelar"
                style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: 11 }}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              title="Eliminar este crédito"
              style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: 12 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              🗑️
            </button>
          )
        )}
      </div>
    </div>
  );
};

// ── Modal de detalle del cliente ──

const ClientModal = ({ client, onClose, onPay, creditVerifications, onToggleVerify, onEditCredit, onDeleteCredit, onRenameClient, allClients }) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTo, setRenameTo] = useState('');

  if (!client) return null;
  const verified = client.txs.filter(tx => creditVerifications[String(tx.id).replace(/\//g, '_')]).length;
  const total = client.txs.length;
  const isPaid = client.balance <= 0.01;
  const newNameUpper = renameTo.toUpperCase().trim();
  const renameValid = newNameUpper && newNameUpper !== client.name;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 720, width: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {/* Encabezado fijo */}
        <div className="modal-header" style={{ padding: '14px 20px', flexShrink: 0 }}>
          <div>
            <h3 className="modal-title" style={{ marginBottom: 2 }}>👤 {client.name}</h3>
            <div style={{ fontSize: 12, color: verified === total && total > 0 ? '#10b981' : '#64748b' }}>
              {verified}/{total} créditos verificados
              {verified === total && total > 0 && ' ✅'}
            </div>
          </div>
          <Btn variant="ghost" onClick={onClose} className="btn-icon">✕</Btn>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Galones', value: formatGallons(client.gallons), color: '#34d399' },
              { label: 'Crédito total', value: formatCurrency(client.credit), color: '#f59e0b' },
              { label: 'Pagado', value: formatCurrency(client.paid), color: '#10b981' },
              { label: 'Saldo', value: formatCurrency(client.balance), color: isPaid ? '#22c55e' : '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 110px', background: '#0f172a', padding: '10px 12px', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Botón de cobro */}
          {!isPaid && (
            <Btn style={{ marginBottom: 20, fontSize: 14, padding: '10px 20px' }}
              onClick={() => { onClose(); setTimeout(() => onPay(client), 80); }}>
              💳 Registrar cobro — saldo {formatCurrency(client.balance)}
            </Btn>
          )}

          {/* Lista de créditos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={sectionLabelStyle}>CRÉDITOS ({total})</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>☐ verificar · ✏️ editar · 🗑️ eliminar</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            {client.txs.map(tx => (
              <CreditVerifyRow
                key={tx.id}
                tx={tx}
                isVerified={!!creditVerifications[String(tx.id).replace(/\//g, '_')]}
                onToggle={() => onToggleVerify(tx.id)}
                onEdit={() => onEditCredit(tx)}
                onDelete={onDeleteCredit ? () => onDeleteCredit(tx) : undefined}
              />
            ))}
          </div>

          {/* Historial de pagos */}
          {client.pmts.length > 0 && (
            <>
              <div style={sectionLabelStyle}>PAGOS RECIBIDOS ({client.pmts.length})</div>
              {[...client.pmts].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '7px 0', borderBottom: '1px solid #0f172a', fontSize: 12 }}>
                  <span style={{ color: '#94a3b8', minWidth: 80 }}>📅 {p.date}</span>
                  <span style={{ color: '#10b981', fontWeight: 800 }}>+{formatCurrency(p.amount)}</span>
                  {p.note && <span style={{ color: '#64748b' }}>{p.note}</span>}
                </div>
              ))}
            </>
          )}

          {/* ── Corregir / Fusionar nombre ── */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
            {!renameOpen ? (
              <Btn variant="ghost" style={{ fontSize: 12, color: '#64748b' }}
                onClick={() => { setRenameOpen(true); setRenameTo(''); }}>
                ✏️ Corregir nombre de este cliente
              </Btn>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Corregir nombre — todos los créditos y pagos se moverán al nombre nuevo
                </div>
                <ClientAutocomplete
                  label="NOMBRE CORRECTO"
                  value={renameTo}
                  onChange={v => setRenameTo(v)}
                  allClients={(allClients || []).filter(n => n !== client.name)}
                  placeholder="Escribe o elige el nombre correcto..."
                />
                {renameValid && (
                  <div style={{ fontSize: 12, color: '#fbbf24', background: '#1a1200', border: '1px solid #713f12', borderRadius: 6, padding: '7px 10px', marginBottom: 10 }}>
                    ⚠️ "{client.name}" → "{newNameUpper}"<br />
                    Afecta {total} crédito(s) y {client.pmts.length} pago(s). No se puede deshacer.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Btn variant="ghost" style={{ fontSize: 12 }}
                    onClick={() => { setRenameOpen(false); setRenameTo(''); }}>
                    Cancelar
                  </Btn>
                  <Btn style={{ fontSize: 12 }}
                    disabled={!renameValid}
                    onClick={() => onRenameClient(client.name, newNameUpper)}>
                    ✅ Aplicar cambio
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal de edición de un crédito ──

const EditCreditModal = ({ tx, form, setForm, onSave, onClose, allTransactions, allClients, prices }) => {
  const voucherDup = useMemo(() => {
    const v = form.voucher?.trim().toUpperCase();
    if (!v) return null;
    const dup = allTransactions.find(t => t.voucher === v && t.id !== tx?.id);
    return dup ? `Ya existe en ${dup.clientName} — ${dup.date}` : null;
  }, [form.voucher, tx?.id, allTransactions]);

  const invoiceDup = useMemo(() => {
    const inv = form.invoice?.trim().toUpperCase();
    if (!inv) return null;
    const dup = allTransactions.find(t => t.invoice === inv && t.id !== tx?.id);
    return dup ? `Ya existe en ${dup.clientName} — ${dup.date}` : null;
  }, [form.invoice, tx?.id, allTransactions]);

  if (!tx) return null;
  const canEditClient = tx.source === 'Importado';
  const estimatedAmount = (parseFloat(form.gallons) || 0) * (prices[form.product] || 0);
  const productOptions = PRODUCTS_LIST.map(p => ({ value: p, label: p }));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Editar crédito</h3>
          <Btn variant="ghost" onClick={onClose} className="btn-icon">✕</Btn>
        </div>

        <div style={{ padding: '6px 0 12px', fontSize: 11, color: tx.source === 'Turno' ? '#60a5fa' : '#4ade80' }}>
          Origen: {tx.source}
          {tx.source === 'Turno' && <span style={{ color: '#64748b' }}> · Fecha: {tx.date} · {tx.worker}</span>}
        </div>

        {canEditClient ? (
          <ClientAutocomplete
            label="CLIENTE / EMPRESA"
            value={form.clientName}
            onChange={v => setForm(f => ({ ...f, clientName: v }))}
            allClients={allClients}
          />
        ) : (
          <div className="form-group">
            <label className="form-label">CLIENTE / EMPRESA</label>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#64748b', fontSize: 14 }}>
              {form.clientName} <span style={{ fontSize: 11 }}>(no editable en créditos de turno)</span>
            </div>
          </div>
        )}

        <Select
          label="PRODUCTO"
          value={form.product}
          onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
          options={productOptions}
        />

        <Input
          label="⛽ GALONES"
          type="number"
          value={form.gallons}
          onChange={e => setForm(f => ({ ...f, gallons: e.target.value }))}
          style={{ fontSize: 20, fontWeight: 800, textAlign: 'right' }}
        />
        {(parseFloat(form.gallons) || 0) > 0 && (
          <div style={{ textAlign: 'right', fontSize: 12, color: '#f59e0b', marginTop: -8, marginBottom: 10 }}>
            ≈ {formatCurrency(estimatedAmount)}
          </div>
        )}

        {/* Vale + alerta de duplicado */}
        <Input
          label="N° VALE"
          value={form.voucher}
          onChange={e => setForm(f => ({ ...f, voucher: e.target.value.toUpperCase() }))}
          placeholder="Ej: V-001"
          style={{ textTransform: 'uppercase' }}
        />
        {voucherDup && <DupWarning msg={voucherDup} />}

        {/* Factura + alerta de duplicado */}
        <Input
          label="N° FACTURA (opcional)"
          value={form.invoice}
          onChange={e => setForm(f => ({ ...f, invoice: e.target.value.toUpperCase() }))}
          placeholder="Ej: F001-001"
          style={{ textTransform: 'uppercase' }}
        />
        {invoiceDup && <DupWarning msg={invoiceDup} />}

        {canEditClient && (
          <Input
            label="FECHA"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" className="btn-full" style={{ padding: 14 }} onClick={onClose}>Cancelar</Btn>
          <Btn className="btn-full" style={{ padding: 14, fontWeight: 800 }} onClick={onSave}>✅ Guardar cambios</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Alerta de campo duplicado ──
const DupWarning = ({ msg }) => (
  <div style={{
    color: '#fbbf24', background: '#1a1200', border: '1px solid #713f12',
    borderRadius: 6, padding: '7px 10px', fontSize: 12, marginTop: -8, marginBottom: 10,
  }}>
    ⚠️ {msg} — ¿Deseas continuar?
  </div>
);

// ── Historial de transacciones (pestaña) ──

const TX_HEADERS = ['Fecha', 'Cliente', 'Turno', 'Trabajador', 'Producto', 'Galones', 'Monto', 'Vale', 'Factura', 'Origen'];

const TransactionsView = ({ transactions }) => {
  const [page, setPage] = useState(0);
  const PER = 30;
  const totalPages = Math.ceil(transactions.length / PER);
  useEffect(() => { setPage(0); }, [transactions]);

  if (transactions.length === 0) {
    return <Card><div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Sin transacciones con los filtros actuales.</div></Card>;
  }
  const visible = transactions.slice(page * PER, (page + 1) * PER);

  return (
    <Card>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
        {transactions.length} transacciones{totalPages > 1 && ` · Página ${page + 1} de ${totalPages}`}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
          <thead>
            <tr>{TX_HEADERS.map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map((tx, i) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #0f172a', background: i % 2 ? '#ffffff08' : 'transparent' }}>
                <td style={tdS}>{tx.date}</td>
                <td style={{ ...tdS, fontWeight: 700, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.clientName}</td>
                <td style={tdS}>{tx.shift || '—'}</td>
                <td style={tdS}>{tx.worker || '—'}</td>
                <td style={{ ...tdS, fontWeight: 700 }}>{tx.product || '—'}</td>
                <td style={{ ...tdS, textAlign: 'right' }}>{formatGallons(tx.gallons)}</td>
                <td style={{ ...tdS, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(tx.amount)}</td>
                <td style={{ ...tdS, color: tx.voucher ? '#fbbf24' : '#334155' }}>{tx.voucher || '—'}</td>
                <td style={{ ...tdS, color: tx.invoice ? '#60a5fa' : '#334155' }}>{tx.invoice || '—'}</td>
                <td style={tdS}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: tx.source === 'Turno' ? '#1e3a5f' : '#1a2e1a', color: tx.source === 'Turno' ? '#60a5fa' : '#4ade80' }}>
                    {tx.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Anterior</Btn>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{page + 1} / {totalPages}</span>
          <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Siguiente →</Btn>
        </div>
      )}
    </Card>
  );
};

// ── Tarjeta de cliente (en la lista) ──

const ClientCard = ({ client, onViewCredits, onPay }) => {
  const isPaid = client.balance <= 0.01;
  return (
    <div style={{
      borderRadius: 10, background: '#1e293b', overflow: 'hidden',
      border: `1px solid ${isPaid ? '#166534' : '#7f1d1d'}`,
      borderLeft: `4px solid ${isPaid ? '#22c55e' : '#ef4444'}`,
    }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 15, flex: '1 1 150px', color: '#f1f5f9', minWidth: 100, cursor: 'pointer' }}
          onClick={() => onViewCredits(client.name)}>
          👤 {client.name}
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', flex: '2 1 260px' }}>
          <MiniStat label="Galones" value={formatGallons(client.gallons)} />
          <MiniStat label="Crédito" value={formatCurrency(client.credit)} color="#f59e0b" />
          <MiniStat label="Pagado" value={formatCurrency(client.paid)} color="#10b981" />
          <MiniStat label="Saldo" value={formatCurrency(client.balance)} color={isPaid ? '#22c55e' : '#ef4444'} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <Btn variant="ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onViewCredits(client.name)}>
            📋 Ver créditos
          </Btn>
          {!isPaid && (
            <Btn style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onPay(client)}>
              💳 Cobrar
            </Btn>
          )}
          {isPaid && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, padding: '6px 8px' }}>✅ Al día</span>}
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: color || '#f1f5f9' }}>{value}</div>
  </div>
);

// ── COMPONENTE PRINCIPAL ─────────────────────

const CreditsPage = () => {
  const {
    shifts, prices,
    creditPayments = [], creditImports = [], creditVerifications = {},
    addCreditPayment, addCreditImports, deleteCreditImport,
    toggleCreditVerification, updateShiftCredit, updateCreditImport,
    deleteShiftCredit, renameClient,
  } = useApp();

  const allClients = useAllClients();

  // ── Tabs ──
  const [tab, setTab] = useState('resumen');

  // ── Modal: detalle del cliente ──
  const [clientModalName, setClientModalName] = useState(null);

  // ── Modal: editar crédito ──
  const [editTx, setEditTx] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ── Modal: pago ──
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', date: getTodayDate(), note: '' });

  // ── Modal: importar ──
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');

  // ── Filtros ──
  const [fClient, setFClient] = useState('');
  const [fVoucher, setFVoucher] = useState('');
  const [fInvoice, setFInvoice] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  // ──────────────────────────────────────────
  // DATOS COMPUTADOS
  // ──────────────────────────────────────────

  const allTransactions = useMemo(() => {
    const txs = [];
    shifts.forEach(shift => {
      (shift.credits || []).forEach((credit, idx) => {
        const gallons = parseFloat(credit.gallons) || 0;
        txs.push({
          id: `${shift.id}-c${idx}`,
          source: 'Turno',
          clientName: (credit.client || 'SIN NOMBRE').toUpperCase().trim(),
          product: credit.product || '',
          gallons,
          amount: gallons * (prices[credit.product] || 0),
          voucher: (credit.voucher || '').toUpperCase(),
          invoice: (credit.invoice || '').toUpperCase(),
          date: shift.date,
          shift: shift.shift,
          worker: shift.worker,
          _shiftId: shift.id,
          _creditIdx: idx,
        });
      });
    });
    creditImports.forEach(imp => {
      txs.push({
        id: `imp-${imp.id}`,
        source: 'Importado',
        clientName: (imp.clientName || 'SIN NOMBRE').toUpperCase().trim(),
        product: imp.product || '',
        gallons: parseFloat(imp.gallons) || 0,
        amount: parseFloat(imp.amount) || 0,
        voucher: (imp.voucher || '').toUpperCase(),
        invoice: (imp.invoice || '').toUpperCase(),
        date: imp.date || '',
        shift: '',
        worker: '',
        _importId: imp.id,
      });
    });
    return txs.sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts, creditImports, prices]);

  const paymentsByClient = useMemo(() => {
    const map = {};
    creditPayments.forEach(p => {
      const c = (p.clientName || '').toUpperCase().trim();
      if (!map[c]) map[c] = [];
      map[c].push(p);
    });
    return map;
  }, [creditPayments]);

  const clientStats = useMemo(() => {
    const stats = {};
    allTransactions.forEach(tx => {
      if (!stats[tx.clientName]) stats[tx.clientName] = { gallons: 0, credit: 0, txs: [] };
      stats[tx.clientName].gallons += tx.gallons;
      stats[tx.clientName].credit += tx.amount;
      stats[tx.clientName].txs.push(tx);
    });
    return stats;
  }, [allTransactions]);

  const buildClient = (name, data) => {
    const pmts = paymentsByClient[name] || [];
    const paid = pmts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    return { name, ...data, paid, balance: data.credit - paid, pmts };
  };

  const filteredClients = useMemo(() => {
    const fc = fClient.toUpperCase();
    const fv = fVoucher.toUpperCase();
    const fi = fInvoice.toUpperCase();
    return Object.entries(clientStats)
      .filter(([name, data]) => {
        if (fc && !name.includes(fc)) return false;
        if (fv && !data.txs.some(t => t.voucher.includes(fv))) return false;
        if (fi && !data.txs.some(t => t.invoice.includes(fi))) return false;
        if (fFrom && !data.txs.some(t => t.date >= fFrom)) return false;
        if (fTo && !data.txs.some(t => t.date <= fTo)) return false;
        return true;
      })
      .map(([name, data]) => buildClient(name, data))
      .sort((a, b) => b.balance - a.balance);
  }, [clientStats, paymentsByClient, fClient, fVoucher, fInvoice, fFrom, fTo]); // eslint-disable-line

  // Cliente del modal (siempre datos frescos, ignora filtros)
  const clientModalData = useMemo(() => {
    if (!clientModalName) return null;
    const data = clientStats[clientModalName];
    if (!data) return null;
    return buildClient(clientModalName, data);
  }, [clientModalName, clientStats, paymentsByClient]); // eslint-disable-line

  const filteredTransactions = useMemo(() => {
    const fc = fClient.toUpperCase(), fv = fVoucher.toUpperCase(), fi = fInvoice.toUpperCase();
    return allTransactions.filter(tx => {
      if (fc && !tx.clientName.includes(fc)) return false;
      if (fv && !tx.voucher.includes(fv)) return false;
      if (fi && !tx.invoice.includes(fi)) return false;
      if (fFrom && tx.date < fFrom) return false;
      if (fTo && tx.date > fTo) return false;
      return true;
    });
  }, [allTransactions, fClient, fVoucher, fInvoice, fFrom, fTo]);

  // Preview de importación con detección de duplicados
  const importPreviewWithStatus = useMemo(() => {
    return importPreview.map(row => {
      const v = (row['VALE'] || '').toUpperCase().trim();
      const inv = (row['FACTURA'] || '').toUpperCase().trim();
      const warns = [];
      if (v && allTransactions.some(t => t.voucher === v)) warns.push(`⚠️ Vale "${v}" ya existe`);
      if (inv && allTransactions.some(t => t.invoice === inv)) warns.push(`⚠️ Factura "${inv}" ya existe`);
      return { ...row, _estado: warns.length ? warns.join(' · ') : '✅ OK' };
    });
  }, [importPreview, allTransactions]);

  // Detectar pares de clientes con nombres similares (posibles duplicados por error de escritura)
  const similarClientPairs = useMemo(() => {
    const names = Object.keys(clientStats);
    const pairs = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i], b = names[j];
        if (levenshtein(a, b) <= 3 && Math.max(a.length, b.length) > 4) {
          pairs.push([a, b]);
        }
      }
    }
    return pairs;
  }, [clientStats]);

  const totalCredit = filteredClients.reduce((s, c) => s + c.credit, 0);
  const totalPaid   = filteredClients.reduce((s, c) => s + c.paid, 0);
  const totalBal    = filteredClients.reduce((s, c) => s + c.balance, 0);
  const withDebt    = filteredClients.filter(c => c.balance > 0.01).length;
  const hasFilters  = fClient || fVoucher || fInvoice || fFrom || fTo;

  // ──────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────

  const clearFilters = () => { setFClient(''); setFVoucher(''); setFInvoice(''); setFFrom(''); setFTo(''); };

  const openPayModal = (client) => {
    setPayModal(client);
    setPayForm({ amount: '', date: getTodayDate(), note: '' });
  };

  const handleRegisterPayment = async () => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) return;
    await addCreditPayment({ clientName: payModal.name, amount, date: payForm.date, note: payForm.note });
    setPayModal(null);
  };

  const openEditCredit = (tx) => {
    setEditTx(tx);
    setEditForm({
      clientName: tx.clientName,
      product: tx.product || 'BIO',
      gallons: String(tx.gallons),
      voucher: tx.voucher,
      invoice: tx.invoice,
      date: tx.date,
    });
  };

  const handleSaveEditedCredit = () => {
    if (!editTx) return;
    if (editTx.source === 'Turno') {
      const match = String(editTx.id).match(/^(\d+)-c(\d+)$/);
      if (!match) return;
      updateShiftCredit(parseInt(match[1]), parseInt(match[2]), {
        product: editForm.product,
        client: editForm.clientName,
        gallons: editForm.gallons,
        voucher: editForm.voucher,
        invoice: editForm.invoice,
      });
    } else {
      const importId = String(editTx._importId || editTx.id.replace('imp-', ''));
      updateCreditImport(importId, {
        clientName: editForm.clientName,
        product: editForm.product,
        gallons: parseFloat(editForm.gallons) || 0,
        amount: (parseFloat(editForm.gallons) || 0) * (prices[editForm.product] || 0),
        voucher: editForm.voucher,
        invoice: editForm.invoice,
        date: editForm.date,
      });
    }
    setEditTx(null);
  };

  const handleDeleteCredit = (tx) => {
    if (tx.source === 'Turno') {
      const match = String(tx.id).match(/^(\d+)-c(\d+)$/);
      if (!match) return;
      deleteShiftCredit(parseInt(match[1]), parseInt(match[2]));
    } else {
      const importId = String(tx._importId || tx.id.replace('imp-', ''));
      deleteCreditImport(importId);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result);
        if (rows.length === 0) { setImportError('El archivo está vacío o no tiene el formato correcto.'); return; }
        setImportPreview(rows.slice(0, 5));
        setImportFile(rows);
        setImportError('');
      } catch { setImportError('El archivo no pudo ser leído. Verifica que sea un CSV válido.'); setImportFile(null); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!importFile?.length) return;
    const now = new Date().toISOString();
    const imports = importFile.map((row, i) => ({
      id: Date.now() + i,
      clientName: (row['CLIENTE'] || '').toUpperCase().trim(),
      product:  (row['PRODUCTO'] || 'BIO').toUpperCase().trim(),
      gallons:  parseFloat(row['GALONES'] || '0'),
      amount:   parseFloat(row['MONTO_S/'] || row['MONTO S/'] || row['MONTO'] || '0') ||
                (parseFloat(row['GALONES'] || '0') * (prices[(row['PRODUCTO'] || '').toUpperCase()] || 0)),
      voucher:  (row['VALE'] || '').toUpperCase().trim(),
      invoice:  (row['FACTURA'] || '').toUpperCase().trim(),
      date:     row['FECHA'] || getTodayDate(),
      note:     row['NOTA'] || '',
      importedAt: now,
    })).filter(r => r.clientName && r.gallons > 0);

    if (!imports.length) { setImportError('No se encontraron registros válidos. CLIENTE y GALONES son obligatorios.'); return; }
    await addCreditImports(imports);
    setImportModal(false); setImportFile(null); setImportPreview([]); setImportError('');
  };

  const handleExport = () => {
    const headers = ['CLIENTE', 'FECHA', 'TURNO', 'TRABAJADOR', 'PRODUCTO', 'GALONES', 'MONTO S/', 'VALE', 'FACTURA', 'ORIGEN'];
    const rows = filteredTransactions.map(t => [
      t.clientName, t.date, t.shift, t.worker, t.product,
      t.gallons.toFixed(3), t.amount.toFixed(2), t.voucher, t.invoice, t.source,
    ]);
    downloadXLS(headers, rows, `creditos-${getTodayDate()}.xls`);
  };

  const handleTemplate = () => {
    downloadCSV([
      ['CLIENTE', 'FECHA', 'PRODUCTO', 'GALONES', 'MONTO_S/', 'VALE', 'FACTURA', 'NOTA'],
      ['EMPRESA EJEMPLO SAC', getTodayDate(), 'BIO', '50.000', '824.50', 'V-001', 'F001-0123', 'Crédito anterior al sistema'],
      ['OTRO CLIENTE', getTodayDate(), 'REGULAR', '30.000', '', 'V-002', '', ''],
    ], 'plantilla-creditos.csv');
  };

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>💳 Créditos</h2>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Créditos de clientes, vales, facturas y cobros.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="ghost" onClick={handleTemplate} style={{ fontSize: 12 }}>📋 Plantilla CSV</Btn>
          <Btn variant="ghost" onClick={() => { setImportModal(true); setImportFile(null); setImportPreview([]); setImportError(''); }} style={{ fontSize: 12 }}>
            📤 Importar CSV
          </Btn>
          <Btn variant="ghost" onClick={handleExport} style={{ fontSize: 12 }}>📥 Exportar Excel</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatCard label="Clientes con deuda" value={withDebt} icon="👥" color="#6366f1" />
        <StatCard label="Total crédito" value={formatCurrency(totalCredit)} icon="📋" color="#f59e0b" />
        <StatCard label="Total cobrado" value={formatCurrency(totalPaid)} icon="✅" color="#10b981" />
        <StatCard label="Saldo pendiente" value={formatCurrency(totalBal)} icon="⚠️" color={totalBal > 0.01 ? '#ef4444' : '#10b981'} />
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FilterField label="🔍 CLIENTE" value={fClient} onChange={v => setFClient(v.toUpperCase())} placeholder="Buscar cliente..." upper />
          <FilterField label="📄 VALE"    value={fVoucher} onChange={v => setFVoucher(v.toUpperCase())} placeholder="N° vale..." upper />
          <FilterField label="🧾 FACTURA" value={fInvoice} onChange={v => setFInvoice(v.toUpperCase())} placeholder="N° factura..." upper />
          <FilterField label="📅 DESDE"   type="date" value={fFrom} onChange={setFFrom} />
          <FilterField label="📅 HASTA"   type="date" value={fTo}   onChange={setFTo}   />
          {hasFilters && (
            <Btn variant="ghost" onClick={clearFilters} style={{ fontSize: 11, padding: '7px 10px', flexShrink: 0, marginBottom: 1 }}>
              ✕ Limpiar
            </Btn>
          )}
        </div>
      </Card>

      {/* Alerta de nombres similares */}
      {similarClientPairs.length > 0 && (
        <div style={{ background: '#1a1200', border: '1px solid #713f12', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
            ⚠️ Posibles clientes duplicados — puede haber un error de escritura
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {similarClientPairs.slice(0, 5).map(([a, b]) => (
              <div key={a + b} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <button onClick={() => setClientModalName(a)}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>
                  👤 {a}
                </button>
                <span style={{ color: '#475569' }}>↔</span>
                <button onClick={() => setClientModalName(b)}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>
                  👤 {b}
                </button>
                <span style={{ color: '#64748b', fontSize: 11 }}>Abre el cliente y usa "Corregir nombre" para fusionarlos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { key: 'resumen',   label: '👥 Resumen por cliente' },
          { key: 'historial', label: '📋 Historial de créditos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            background: tab === t.key ? '#2563eb' : '#1e293b',
            color: tab === t.key ? '#fff' : '#94a3b8',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'resumen' ? (
        filteredClients.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sin créditos</div>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>
                Los créditos aparecen automáticamente cuando los griferos los registran en sus turnos.<br />
                También puedes importarlos con el botón <strong>Importar CSV</strong>.
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredClients.map(client => (
              <ClientCard
                key={client.name}
                client={client}
                onViewCredits={name => setClientModalName(name)}
                onPay={openPayModal}
              />
            ))}
          </div>
        )
      ) : (
        <TransactionsView transactions={filteredTransactions} />
      )}

      {/* ══ MODAL: Detalle del cliente ══ */}
      {clientModalData && (
        <ClientModal
          client={clientModalData}
          onClose={() => setClientModalName(null)}
          onPay={openPayModal}
          creditVerifications={creditVerifications}
          onToggleVerify={txId => toggleCreditVerification(txId)}
          onEditCredit={tx => { openEditCredit(tx); }}
          onDeleteCredit={handleDeleteCredit}
          onRenameClient={async (oldName, newName) => {
            await renameClient(oldName, newName);
            setClientModalName(newName);
          }}
          allClients={allClients}
        />
      )}

      {/* ══ MODAL: Editar crédito (encima del modal de cliente) ══ */}
      {editTx && (
        <EditCreditModal
          tx={editTx}
          form={editForm}
          setForm={setEditForm}
          onSave={handleSaveEditedCredit}
          onClose={() => setEditTx(null)}
          allTransactions={allTransactions}
          allClients={allClients}
          prices={prices}
        />
      )}

      {/* ══ MODAL: Registrar pago ══ */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="💳 Registrar Cobro">
        {payModal && (
          <div>
            <div style={{ padding: '10px 14px', background: '#0f172a', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>CLIENTE</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>👤 {payModal.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: 10, background: '#0f172a', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Crédito total</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(payModal.credit)}</div>
              </div>
              <div style={{ flex: 1, padding: 10, background: '#0f172a', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Ya cobrado</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{formatCurrency(payModal.paid)}</div>
              </div>
              <div style={{ flex: 1, padding: 10, background: '#0f172a', borderRadius: 8, textAlign: 'center', border: '1px solid #7f1d1d' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Saldo</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{formatCurrency(payModal.balance)}</div>
              </div>
            </div>
            <Input label="MONTO A ABONAR (S/)" type="number" value={payForm.amount} placeholder="0.00"
              onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
              style={{ fontSize: 22, fontWeight: 800, textAlign: 'right' }} />
            {parseFloat(payForm.amount) > 0 && (
              <div style={{ textAlign: 'right', fontSize: 12, color: '#10b981', marginTop: -8, marginBottom: 8 }}>
                Restante: {formatCurrency(Math.max(0, payModal.balance - (parseFloat(payForm.amount) || 0)))}
              </div>
            )}
            <Input label="FECHA DE COBRO" type="date" value={payForm.date}
              onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
            <Input label="NOTA (opcional)" value={payForm.note} placeholder="Ej: efectivo, transferencia, N° de operación..."
              onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" className="btn-full" style={{ padding: 14 }} onClick={() => setPayModal(null)}>Cancelar</Btn>
              <Btn className="btn-full" style={{ padding: 14, fontWeight: 800 }}
                onClick={handleRegisterPayment} disabled={!(parseFloat(payForm.amount) > 0)}>
                ✅ Registrar Cobro
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL: Importar CSV ══ */}
      <Modal open={importModal}
        onClose={() => { setImportModal(false); setImportFile(null); setImportPreview([]); setImportError(''); }}
        title="📤 Importar Créditos desde CSV">
        <div>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
            Descarga la plantilla, complétala en Excel y guárdala como <strong>.csv</strong>.
            Las columnas duplicadas se advertirán antes de importar.
          </p>
          <Btn variant="ghost" onClick={handleTemplate} style={{ fontSize: 12, marginBottom: 14, display: 'block' }}>
            📋 Descargar plantilla CSV
          </Btn>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">SELECCIONAR ARCHIVO .CSV</label>
            <input type="file" accept=".csv,.txt" onChange={handleFileSelect}
              style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginTop: 4 }} />
          </div>
          {importError && (
            <div style={{ color: '#f87171', background: '#450a0a', border: '1px solid #991b1b', padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              ⚠️ {importError}
            </div>
          )}
          {importPreviewWithStatus.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>
                VISTA PREVIA — {importPreviewWithStatus.length} de {importFile.length} registros:
              </div>
              <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: 8, padding: 8 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      {[...Object.keys(importPreviewWithStatus[0]).filter(k => k !== '_estado'), 'ESTADO'].map(h => (
                        <th key={h} style={{ padding: '4px 8px', color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewWithStatus.map((row, i) => {
                      const { _estado, ...rest } = row;
                      const isDup = _estado && !_estado.startsWith('✅');
                      return (
                        <tr key={i}>
                          {Object.values(rest).map((v, j) => (
                            <td key={j} style={{ padding: '4px 8px', color: '#cbd5e1', borderBottom: '1px solid #1e293b' }}>{v || '—'}</td>
                          ))}
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #1e293b', color: isDup ? '#fbbf24' : '#4ade80', fontSize: 11 }}>
                            {_estado}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {importPreviewWithStatus.some(r => r._estado && !r._estado.startsWith('✅')) && (
                <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 8 }}>
                  ⚠️ Algunos registros tienen vales o facturas que ya existen. Puedes importarlos igual, pero revísalos antes.
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" className="btn-full" style={{ padding: 14 }}
              onClick={() => { setImportModal(false); setImportFile(null); setImportPreview([]); setImportError(''); }}>
              Cancelar
            </Btn>
            <Btn className="btn-full" style={{ padding: 14, fontWeight: 800 }}
              onClick={handleImport} disabled={!importFile?.length}>
              ✅ Importar {importFile?.length || 0} registros
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Estilos compartidos ──
const thStyle = { padding: '7px 10px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #1e293b', whiteSpace: 'nowrap' };
const tdS = { padding: '8px 10px', color: '#cbd5e1', verticalAlign: 'middle' };
const sectionLabelStyle = { fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 };

const FilterField = ({ label, value, onChange, placeholder, type = 'text', upper }) => (
  <div style={{ flex: '1 1 130px', minWidth: 100 }}>
    <label className="form-label">{label}</label>
    <input className="input-field" type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={upper ? { textTransform: 'uppercase' } : {}} />
  </div>
);

export default CreditsPage;
