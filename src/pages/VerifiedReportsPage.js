import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, ProductTag } from '../components/UIComponents';
import {
  formatCurrency, formatGallons, formatSignedCurrency,
  calcShiftBalance, calcSalesByProduct, calcGallons,
} from '../utils/helpers';
import { ISLANDS_CONFIG } from '../utils/constants';

// ============================================
// PÁGINA: Reportes Verificados (Solo Admin)
// ============================================

const SHIFT_ORDER = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2 };
const PT  = { padding: '3px 6px', border: '1px solid #ccc', fontSize: 9 };
const PTH = { ...PT, background: '#f0f0f0', fontWeight: 700 };
const statusText = (v) => v === true ? '✅' : v === false ? '❌' : '⬜';

const VerifiedReportsPage = () => {
  const {
    verifiedReports, deleteVerifiedReport, setVerifyTarget,
    setCurrentPage, shifts, prices,
  } = useApp();

  const [searchDate,  setSearchDate]  = useState('');
  const [viewReport,  setViewReport]  = useState(null);
  const [pendingPrint, setPendingPrint] = useState(null); // report waiting for options
  const [printReport, setPrintReport] = useState(null);  // report ready to print
  const [printMode,   setPrintMode]   = useState('resumen');
  const [printSections, setPrintSections] = useState({
    meters: true, payments: true, credits: true, promotions: false, discounts: false,
  });

  const filtered = useMemo(() => {
    const base = searchDate
      ? verifiedReports.filter(r => r.date === searchDate)
      : [...verifiedReports];
    return base.sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  }, [verifiedReports, searchDate]);

  const handleEdit = (report) => {
    if (report.type === 'day') {
      const dayShifts = (report.shiftReports || [])
        .map(sr => shifts.find(s => s.id === sr.shiftId))
        .filter(Boolean);
      if (dayShifts.length === 0) { alert('Los turnos originales ya no existen.'); return; }
      setVerifyTarget({ shifts: dayShifts, date: report.date, editingId: report.id });
    } else {
      const shift = shifts.find(s => s.id === report.shiftId);
      if (!shift) { alert('El turno original ya no existe.'); return; }
      setVerifyTarget({ shift, editingId: report.id });
    }
    setCurrentPage('verify');
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este reporte verificado? Esta acción no se puede deshacer.')) {
      deleteVerifiedReport(id);
      if (viewReport?.id === id) setViewReport(null);
    }
  };

  // Abre el modal de opciones de impresión
  const openPrintModal = (report) => {
    setPendingPrint(report);
    setViewReport(null); // cierra el modal de detalle si estaba abierto
  };

  // Confirma opciones y ejecuta la impresión
  const confirmPrint = () => {
    setPrintReport(pendingPrint);
    setPendingPrint(null);
    setTimeout(() => window.print(), 80);
  };

  const isFullyVerified = (r) => r.totalItems === 0 || r.checkedItems === r.totalItems;

  return (
    <>
      {/* ── CONTENIDO DE PANTALLA ── */}
      <div className="no-print">
        {/* Header */}
        <div className="flex-between mb-2">
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>✅ Reportes Verificados</h2>
            <p className="text-muted">
              {verifiedReports.length} reporte{verifiedReports.length !== 1 ? 's' : ''} verificado{verifiedReports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>FILTRAR FECHA</label>
            <input type="date" className="input-field" style={{ width: 170 }}
              value={searchDate} onChange={e => setSearchDate(e.target.value)} />
            {searchDate && (
              <Btn variant="ghost" className="btn-sm" onClick={() => setSearchDate('')}>✕ Limpiar</Btn>
            )}
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '52px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                {searchDate ? 'Sin resultados para esa fecha' : 'Sin reportes verificados'}
              </div>
              <p className="text-muted">
                {searchDate
                  ? `No hay reportes verificados para el ${searchDate}`
                  : 'Ve a Reportes, abre un turno cerrado o el día completo y pulsa "Verificar"'}
              </p>
              {!searchDate && (
                <Btn style={{ marginTop: 16 }} onClick={() => setCurrentPage('reports')}>Ir a Reportes</Btn>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Tipo</th><th>Fecha</th><th>Trabajador / Turnos</th><th>Isla</th>
                  <th>Total Venta</th><th>Galones</th><th>Efectivo</th><th>Progreso</th>
                  <th>Verificado</th><th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isDay   = r.type === 'day';
                  const island  = !isDay && ISLANDS_CONFIG.find(i => i.id.toString() === r.island);
                  const pct     = r.totalItems === 0 ? 100 : Math.round((r.checkedItems / r.totalItems) * 100);
                  const done    = isFullyVerified(r);
                  const cashVal = isDay ? r.totalCashReceived : r.cashReceived;
                  const vAt     = new Date(r.verifiedAt).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: isDay ? 'rgba(99,102,241,0.2)' : 'rgba(5,150,105,0.2)', color: isDay ? '#a5b4fc' : '#6ee7b7' }}>
                          {isDay ? '📊 Día' : '⏱ Turno'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{r.date}</td>
                      <td style={{ fontSize: 13 }}>
                        {isDay
                          ? <span style={{ color: '#94a3b8' }}>{r.shiftReports?.length || 0} turno{r.shiftReports?.length !== 1 ? 's' : ''}</span>
                          : r.worker}
                      </td>
                      <td style={{ fontSize: 13 }}>{isDay ? '—' : (island?.name || `Isla ${r.island}`)}</td>
                      <td style={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(r.totalSales)}</td>
                      <td style={{ fontSize: 12 }}>{formatGallons(r.totalGallons)}</td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>{formatCurrency(cashVal)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', minWidth: 52 }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct === 100 ? '#059669' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.checkedItems}/{r.totalItems}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: '#64748b' }}>{vAt}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <Btn variant="ghost"   className="btn-sm" onClick={() => setViewReport(r)}>👁️ Ver</Btn>
                          {done && <Btn variant="success" className="btn-sm" onClick={() => openPrintModal(r)}>🖨️</Btn>}
                          <Btn variant="primary" className="btn-sm" onClick={() => handleEdit(r)}>✏️</Btn>
                          <Btn variant="danger"  className="btn-sm btn-icon" onClick={() => handleDelete(r.id)} title="Eliminar">🗑️</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* Modal de detalle */}
        {viewReport && (
          <VerifiedReportModal
            report={viewReport}
            onClose={() => setViewReport(null)}
            onEdit={r => { handleEdit(r); setViewReport(null); }}
            onDelete={id => handleDelete(id)}
            onPrint={openPrintModal}
            isFullyVerified={isFullyVerified}
          />
        )}

        {/* Modal de opciones de impresión */}
        {pendingPrint && (
          <PrintOptionsModal
            printMode={printMode}       setPrintMode={setPrintMode}
            printSections={printSections} setPrintSections={setPrintSections}
            onClose={() => setPendingPrint(null)}
            onPrint={confirmPrint}
          />
        )}
      </div>

      {/* ── ÁREA DE IMPRESIÓN ── */}
      <div id="report-print-area">
        {printReport && (
          <PrintVerifiedReport
            report={printReport}
            allShifts={shifts}
            prices={prices}
            mode={printMode}
            sections={printSections}
          />
        )}
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════
// MODAL DE OPCIONES DE IMPRESIÓN
// ══════════════════════════════════════════════════════
const PrintOptionsModal = ({ printMode, setPrintMode, printSections, setPrintSections, onClose, onPrint }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
      <div className="modal-header">
        <div className="modal-title">🖨️ Opciones de Impresión</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Modo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['resumen', '📋 Resumen'], ['detallado', '📑 Detallado']].map(([key, label]) => (
          <button key={key} onClick={() => setPrintMode(key)} style={{
            flex: 1, padding: 12, borderRadius: 10, fontFamily: 'inherit',
            border: printMode === key ? '2px solid #6366f1' : '2px solid #334155',
            background: printMode === key ? 'rgba(99,102,241,0.15)' : '#0f172a',
            color: printMode === key ? '#a5b4fc' : '#94a3b8',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
        {printMode === 'resumen'
          ? 'Resumen financiero + desglose por método de pago (YAPE/VISA/Transferencia), ventas por producto, créditos, promociones, descuentos, gastos y entregas. Todo en totales, sin filas individuales.'
          : 'Elige qué secciones incluir con su estado de verificación (✅/❌/⬜):'}
      </p>

      {printMode === 'detallado' && (
        <div style={{ marginBottom: 16 }}>
          {[
            ['meters',     '⛽ Contómetros (tabla inicio/fin por isla)'],
            ['payments',   '💳 Pagos electrónicos (Visa / Yape / Transferencia)'],
            ['credits',    '📄 Créditos'],
            ['promotions', '🎁 Promociones'],
            ['discounts',  '🔻 Descuentos'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1e293b', cursor: 'pointer', fontSize: 14, color: '#e2e8f0' }}>
              <input type="checkbox" checked={printSections[key]}
                onChange={e => setPrintSections(prev => ({ ...prev, [key]: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
              {label}
            </label>
          ))}
        </div>
      )}

      <Btn className="btn-full" style={{ padding: 14, fontSize: 15 }} onClick={onPrint}>
        🖨️ Imprimir
      </Btn>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════
// MODAL DE DETALLE (pantalla)
// ══════════════════════════════════════════════════════
const VerifiedReportModal = ({ report, onClose, onEdit, onDelete, onPrint, isFullyVerified }) => {
  const isDay  = report.type === 'day';
  const island = !isDay && ISLANDS_CONFIG.find(i => i.id.toString() === report.island);
  const done   = isFullyVerified(report);
  const cashVal = isDay ? report.totalCashReceived : report.cashReceived;
  const verifiedAt = new Date(report.verifiedAt).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 720, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isDay ? '📊 Verificación Día Completo' : '✅ Detalle de Verificación'}</div>
          <Btn variant="ghost" className="btn-icon" onClick={onClose}>✕</Btn>
        </div>

        <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <InfoItem label="Fecha" value={report.date} />
          {isDay
            ? <InfoItem label="Turnos" value={`${report.shiftReports?.length || 0} turno(s)`} />
            : <><InfoItem label="Trabajador" value={report.worker} /><InfoItem label="Isla" value={island?.name || `Isla ${report.island}`} /><InfoItem label="Turno" value={report.shift} /></>
          }
          <InfoItem label="Verificado el" value={verifiedAt} />
          <InfoItem label="Estado" value={done ? '✅ Completo' : `${report.checkedItems}/${report.totalItems} items`} />
        </div>

        <div className="grid-3 mb-2">
          <StatBox label="TOTAL VENTA"       value={formatCurrency(report.totalSales)}  color="#6366f1" />
          <StatBox label="EFECTIVO RECIBIDO" value={formatCurrency(cashVal)}             color="#34d399" />
          <StatBox label="GALONES VENDIDOS"  value={formatGallons(report.totalGallons)}  color="#8b5cf6" />
        </div>

        <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>⛽ Resumen de Galones</div>
          <ModalRow label="Total vendidos"                value={formatGallons(report.totalGallons)} />
          <ModalRow label="Prestados (créditos + promos)" value={formatGallons(report.lentGallons)} />
          <ModalRow label="Cobrados"                      value={formatGallons(report.collectedGallons)} highlight />
        </div>

        {isDay ? <DayModalContent report={report} /> : <ShiftModalContent report={report} />}

        {report.notes && (
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>📝 Observaciones</div>
            <p style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'pre-wrap' }}>{report.notes}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          {done && <Btn variant="success" style={{ fontWeight: 800 }} onClick={() => onPrint(report)}>🖨️ Imprimir Reporte</Btn>}
          <Btn variant="primary" onClick={() => onEdit(report)}>✏️ Editar</Btn>
          <Btn variant="danger" className="btn-sm" onClick={() => onDelete(report.id)}>🗑️</Btn>
          <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </div>
  );
};

const ShiftModalContent = ({ report }) => (
  <>
    {[{ key: 'payments', title: '💳 Pagos Electrónicos' }, { key: 'credits', title: '📄 Créditos' }, { key: 'promotions', title: '🎁 Promociones' }, { key: 'discounts', title: '🔻 Descuentos' }]
      .map(({ key, title }) => {
        const items = report.items?.[key] || [];
        if (!items.length) return null;
        return <SectionTable key={key} title={title} items={items} sectionKey={key} />;
      })}
  </>
);

const DayModalContent = ({ report }) => {
  const [expanded, setExpanded] = useState(() => (report.shiftReports || []).map(() => true));
  return (
    <>
      {(report.shiftReports || []).map((sr, idx) => {
        const island = ISLANDS_CONFIG.find(i => i.id.toString() === sr.island);
        const all    = [...(sr.items?.payments || []), ...(sr.items?.credits || []), ...(sr.items?.promotions || []), ...(sr.items?.discounts || [])];
        const checked = all.filter(i => i.verified !== null).length;
        const pct     = all.length === 0 ? 100 : Math.round((checked / all.length) * 100);
        const isOpen  = expanded[idx];
        return (
          <div key={sr.shiftId || idx} style={{ marginBottom: 10 }}>
            <div onClick={() => setExpanded(prev => prev.map((e, i) => i === idx ? !e : e))}
              style={{ cursor: 'pointer', background: '#0f172a', borderRadius: isOpen ? '10px 10px 0 0' : 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 800 }}>{sr.worker}</span>
                <span style={{ color: '#64748b', fontSize: 12, marginLeft: 10 }}>{island?.name || `Isla ${sr.island}`} · {sr.shift}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: pct === 100 ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.15)', color: pct === 100 ? '#6ee7b7' : '#fcd34d' }}>
                  {checked}/{all.length} verif.
                </span>
                <span style={{ color: '#64748b', fontSize: 12 }}>Efectivo: <strong style={{ color: '#34d399' }}>{formatCurrency(sr.cashReceived)}</strong></span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ background: '#111827', borderRadius: '0 0 10px 10px', padding: '10px 16px' }}>
                {[{ key: 'payments', title: '💳 Pagos' }, { key: 'credits', title: '📄 Créditos' }, { key: 'promotions', title: '🎁 Promociones' }, { key: 'discounts', title: '🔻 Descuentos' }]
                  .map(({ key, title }) => { const items = sr.items?.[key] || []; return items.length ? <SectionTable key={key} title={title} items={items} sectionKey={key} compact /> : null; })}
                {all.length === 0 && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>Sin ítems verificables.</p>}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const SectionTable = ({ title, items, sectionKey, compact }) => {
  const vOk = items.filter(i => i.verified === true).length;
  const vNo = items.filter(i => i.verified === false).length;
  const vNu = items.filter(i => i.verified === null).length;
  return (
    <div style={{ marginBottom: compact ? 10 : 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: compact ? 13 : 14 }}>{title}</span>
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          {vOk > 0 && <span style={{ color: '#34d399' }}>✅ {vOk}</span>}
          {vNo > 0 && <span style={{ color: '#ef4444' }}>❌ {vNo}</span>}
          {vNu > 0 && <span style={{ color: '#64748b' }}>⬜ {vNu}</span>}
        </div>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ background: item.verified === true ? 'rgba(52,211,153,0.07)' : item.verified === false ? 'rgba(239,68,68,0.07)' : '' }}>
              {sectionKey === 'payments'   && <><td style={{ fontSize: 12 }}>{item.method}</td><td style={{ fontSize: 12 }}>{item.reference || '—'}</td><td style={{ fontWeight: 700, fontSize: 12 }}>{formatCurrency(item.amount)}</td></>}
              {sectionKey === 'credits'    && <><td><ProductTag product={item.product} /></td><td style={{ fontSize: 12 }}>{item.client || '—'}</td><td style={{ fontWeight: 700, fontSize: 12 }}>{formatGallons(parseFloat(item.gallons) || 0)}</td></>}
              {sectionKey === 'promotions' && <><td><ProductTag product={item.product} /></td><td style={{ fontSize: 12 }}>{item.dniPlate || '—'}</td><td style={{ fontWeight: 700, fontSize: 12 }}>{formatGallons(parseFloat(item.gallons) || 0)}</td></>}
              {sectionKey === 'discounts'  && <><td><ProductTag product={item.product} /></td><td style={{ fontSize: 12 }}>{item.client || '—'}</td><td style={{ fontWeight: 700, fontSize: 12 }}>{formatGallons(parseFloat(item.gallons) || 0)}</td></>}
              <td style={{ textAlign: 'center', fontSize: 16 }}>{item.verified === null ? '⬜' : item.verified ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// COMPONENTE DE IMPRESIÓN
// ══════════════════════════════════════════════════════
const PrintVerifiedReport = ({ report, allShifts, prices, mode, sections }) => {
  const isDay = report.type === 'day';
  const verifiedAt = new Date(report.verifiedAt).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Turnos originales
  const originalShifts = useMemo(() => {
    if (isDay) return (report.shiftReports || []).map(sr => allShifts.find(s => s.id === sr.shiftId)).filter(Boolean);
    const s = allShifts.find(s => s.id === report.shiftId);
    return s ? [s] : [];
  }, [report, allShifts, isDay]);

  // Agrupar por isla, ordenar por turno
  const islandGroups = useMemo(() => {
    const grouped = {};
    originalShifts.forEach(s => {
      if (!grouped[s.island]) grouped[s.island] = [];
      grouped[s.island].push(s);
    });
    return Object.entries(grouped).map(([islandId, islandShifts]) => {
      const island  = ISLANDS_CONFIG.find(i => i.id.toString() === islandId);
      const sorted  = [...islandShifts].sort((a, b) => (SHIFT_ORDER[a.shift] ?? 99) - (SHIFT_ORDER[b.shift] ?? 99));
      return { island, firstShift: sorted[0], lastShift: sorted[sorted.length - 1] };
    }).filter(g => g.island);
  }, [originalShifts]);

  // Efectivo esperado
  const expectedCash = useMemo(() =>
    originalShifts.reduce((sum, s) => {
      const bal = calcShiftBalance(s, prices);
      return sum + bal.totalSales - bal.totalPayments - bal.totalCredits - bal.totalPromos - bal.totalDiscounts - bal.totalExpenses;
    }, 0),
    [originalShifts, prices]
  );

  const cashVal  = isDay ? report.totalCashReceived : report.cashReceived;
  const cashDiff = cashVal - expectedCash;

  // Stats de verificación
  const allVItems = isDay
    ? (report.shiftReports || []).flatMap(sr => [...(sr.items?.payments || []), ...(sr.items?.credits || []), ...(sr.items?.promotions || []), ...(sr.items?.discounts || [])])
    : [...(report.items?.payments || []), ...(report.items?.credits || []), ...(report.items?.promotions || []), ...(report.items?.discounts || [])];
  const vOk = allVItems.filter(i => i.verified === true).length;
  const vNo = allVItems.filter(i => i.verified === false).length;

  // ── Desglose de totales para resumen ──
  const allPaymentsV  = isDay ? (report.shiftReports||[]).flatMap(sr => sr.items?.payments   || []) : (report.items?.payments   || []);
  const allCreditsV   = isDay ? (report.shiftReports||[]).flatMap(sr => sr.items?.credits    || []) : (report.items?.credits    || []);
  const allPromosV    = isDay ? (report.shiftReports||[]).flatMap(sr => sr.items?.promotions || []) : (report.items?.promotions || []);
  const allDiscountsV = isDay ? (report.shiftReports||[]).flatMap(sr => sr.items?.discounts  || []) : (report.items?.discounts  || []);

  const payByMethod = ['VISA', 'YAPE', 'Transferencia'].map(method => {
    const items = allPaymentsV.filter(p => p.method === method);
    return {
      method,
      count:  items.length,
      amount: items.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      ok: items.filter(p => p.verified === true).length,
      no: items.filter(p => p.verified === false).length,
    };
  }).filter(m => m.count > 0);
  const totalPaymentsAmt = payByMethod.reduce((s, m) => s + m.amount, 0);

  const salesByProdBreakdown = {};
  originalShifts.forEach(s => {
    Object.entries(calcSalesByProduct(s, prices)).forEach(([prod, data]) => {
      if (!salesByProdBreakdown[prod]) salesByProdBreakdown[prod] = { gallons: 0, amount: 0 };
      salesByProdBreakdown[prod].gallons += data.gallons;
      salesByProdBreakdown[prod].amount  += data.amount;
    });
  });

  const creditGal     = allCreditsV.reduce((s, c) => s + (parseFloat(c.gallons) || 0), 0);
  const creditAmt     = allCreditsV.reduce((s, c) => s + (parseFloat(c.gallons) || 0) * (prices[c.product] || 0), 0);
  const creditOk      = allCreditsV.filter(c => c.verified === true).length;
  const creditNo      = allCreditsV.filter(c => c.verified === false).length;
  const promoGal      = allPromosV.reduce((s, p) => s + (parseFloat(p.gallons) || 0), 0);
  const promoAmt      = allPromosV.reduce((s, p) => s + (parseFloat(p.gallons) || 0) * (prices[p.product] || 0), 0);
  const discountAmt   = allDiscountsV.reduce((s, d) => s + (parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0)), 0);
  const expensesTotal = originalShifts.reduce((sum, s) => sum + calcShiftBalance(s, prices).totalExpenses, 0);
  const delivTotal    = originalShifts.reduce((sum, s) => sum + (s.deliveries || []).reduce((s2, v) => s2 + (parseFloat(v) || 0), 0), 0);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#111', fontSize: 10, lineHeight: 1.4 }}>

      {/* Encabezado */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>⛽ GRIFO — Control de Ventas</div>
        <div style={{ fontSize: 11, color: '#555' }}>
          {isDay ? `Reporte Verificado — Día Completo — ${report.date}` : `Reporte Verificado — Turno — ${report.date}`}
        </div>
        <div style={{ fontSize: 9, color: '#777', marginTop: 2 }}>
          Verificado: {verifiedAt}
          {!isDay && ` · ${report.shift} · ${report.worker} · ${ISLANDS_CONFIG.find(i => i.id.toString() === report.island)?.name}`}
        </div>
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
        {[
          ['Total Venta',      formatCurrency(report.totalSales)],
          ['Galones Vendidos', formatGallons(report.totalGallons)],
          ['Galones Prestados', formatGallons(report.lentGallons || 0)],
          ['Efectivo Recibido', formatCurrency(cashVal)],
        ].map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #ccc', borderRadius: 5, padding: '5px 7px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contómetros por isla — solo en Detallado cuando la opción está activa */}
      {mode === 'detallado' && sections.meters && islandGroups.map(({ island, firstShift, lastShift }) => (
        <div key={island.id} style={{ marginBottom: 8 }}>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 10, display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>⛽ {island.name}</span>
            {isDay && <span style={{ fontWeight: 400, fontSize: 9 }}>Inicio: {firstShift.shift} ({firstShift.worker}) | Fin: {lastShift.shift} ({lastShift.worker})</span>}
          </div>
          {island.faces.map(face => (
            <div key={face.id} style={{ marginBottom: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#555', paddingLeft: 4, marginBottom: 2 }}>{face.label}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <thead>
                  <tr>
                    <th style={PTH}>Producto</th>
                    <th style={{ ...PTH, textAlign: 'right' }}>{isDay ? `Inicio (${firstShift.shift})` : 'Inicio'}</th>
                    <th style={{ ...PTH, textAlign: 'right' }}>{isDay ? `Final (${lastShift.shift})` : 'Final'}</th>
                    <th style={{ ...PTH, textAlign: 'right' }}>Galones</th>
                    {!isDay && <th style={{ ...PTH, textAlign: 'right' }}>S/</th>}
                  </tr>
                </thead>
                <tbody>
                  {face.dispensers.map(d => {
                    const startM  = firstShift.meters?.[d.key] || { start: 0 };
                    const endM    = lastShift.meters?.[d.key]  || { end: null };
                    const hasEnd  = endM.end !== null && endM.end !== '' && endM.end !== undefined;
                    const gal     = hasEnd ? Math.max(0, parseFloat(endM.end) - parseFloat(startM.start || 0)) : 0;
                    return (
                      <tr key={d.key}>
                        <td style={PT}>{d.label}</td>
                        <td style={{ ...PT, textAlign: 'right' }}>{parseFloat(startM.start || 0).toFixed(3)}</td>
                        <td style={{ ...PT, textAlign: 'right' }}>{hasEnd ? parseFloat(endM.end).toFixed(3) : '—'}</td>
                        <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{gal > 0 ? gal.toFixed(3) : '—'}</td>
                        {!isDay && <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{gal > 0 ? formatCurrency(gal * (prices[d.product] || 0)) : '—'}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      {/* 2 columnas: Resumen financiero + Verificación */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>

        {/* Financiero */}
        <div>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>Resumen Financiero</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <tbody>
              <tr><td style={PT}>Efectivo Esperado</td><td style={{ ...PT, textAlign: 'right' }}>{formatCurrency(expectedCash)}</td></tr>
              <tr><td style={PT}>Efectivo Recibido</td><td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(cashVal)}</td></tr>
              <tr style={{ background: Math.abs(cashDiff) < 0.01 ? '#e8f5e9' : '#ffebee' }}>
                <td style={{ ...PT, fontWeight: 900 }}>Diferencia de Caja</td>
                <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>
                  {`${cashDiff >= 0 ? '+' : ''}S/ ${cashDiff.toFixed(2)}`} {Math.abs(cashDiff) < 0.01 ? '✅' : '⚠️'}
                </td>
              </tr>
              <tr><td style={PT}>Galones Cobrados</td><td style={{ ...PT, textAlign: 'right' }}>{formatGallons(report.collectedGallons || 0)}</td></tr>
              <tr><td style={PT}>Galones Prestados</td><td style={{ ...PT, textAlign: 'right' }}>{formatGallons(report.lentGallons || 0)}</td></tr>
            </tbody>
          </table>

          {/* Turnos del día */}
          {isDay && (
            <>
              <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', margin: '6px 0 3px 0' }}>Turnos del Día</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <thead><tr><th style={PTH}>Turno</th><th style={PTH}>Trabajador</th><th style={PTH}>Isla</th><th style={{ ...PTH, textAlign: 'right' }}>Efectivo</th></tr></thead>
                <tbody>
                  {(report.shiftReports || []).map((sr, idx) => {
                    const isl = ISLANDS_CONFIG.find(i => i.id.toString() === sr.island);
                    return (
                      <tr key={idx}>
                        <td style={PT}>{sr.shift}</td>
                        <td style={PT}>{sr.worker}</td>
                        <td style={PT}>{isl?.name || `Isla ${sr.island}`}</td>
                        <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>S/ {(sr.cashReceived || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Verificación */}
        <div>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>Resultado de Verificación</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <tbody>
              <tr><td style={PT}>Total ítems</td><td style={{ ...PT, textAlign: 'right' }}>{report.totalItems}</td></tr>
              <tr style={{ background: '#e8f5e9' }}><td style={{ ...PT, fontWeight: 700 }}>✅ Confirmados</td><td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{vOk}</td></tr>
              <tr style={{ background: vNo > 0 ? '#ffebee' : undefined }}><td style={PT}>❌ No encontrados</td><td style={{ ...PT, textAlign: 'right' }}>{vNo}</td></tr>
              <tr><td style={PT}>⬜ Sin revisar</td><td style={{ ...PT, textAlign: 'right' }}>{report.totalItems - vOk - vNo}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Desglose de totales (siempre visible en resumen, también en detallado) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>

        {/* Pagos electrónicos */}
        <div>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>
            💳 Pagos Electrónicos
          </div>
          {payByMethod.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <tbody>
                {payByMethod.map(m => (
                  <tr key={m.method}>
                    <td style={PT}>{m.method}</td>
                    <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(m.amount)}</td>
                    <td style={{ ...PT, textAlign: 'center', fontSize: 8, whiteSpace: 'nowrap' }}>
                      {m.ok > 0 && `✅${m.ok} `}{m.no > 0 && `❌${m.no}`}
                    </td>
                  </tr>
                ))}
                {payByMethod.length > 1 && (
                  <tr style={{ background: '#e8e8e8' }}>
                    <td style={{ ...PT, fontWeight: 900 }}>TOTAL</td>
                    <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>{formatCurrency(totalPaymentsAmt)}</td>
                    <td style={PT} />
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 9, color: '#999', padding: '3px 6px' }}>Sin pagos electrónicos</div>
          )}
        </div>

        {/* Ventas por producto */}
        <div>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>
            ⛽ Ventas por Producto
          </div>
          {Object.keys(salesByProdBreakdown).length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <tbody>
                {Object.entries(salesByProdBreakdown).map(([prod, data]) => (
                  <tr key={prod}>
                    <td style={PT}>{prod}</td>
                    <td style={{ ...PT, textAlign: 'right' }}>{formatGallons(data.gallons)}</td>
                    <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(data.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#e8e8e8' }}>
                  <td style={{ ...PT, fontWeight: 900 }}>TOTAL</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>{formatGallons(report.totalGallons)}</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 900 }}>{formatCurrency(report.totalSales)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 9, color: '#999', padding: '3px 6px' }}>Sin ventas registradas</div>
          )}
        </div>

        {/* Créditos, Promos, Descuentos, Gastos, Entregas */}
        <div>
          <div style={{ background: '#f0f0f0', padding: '2px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>
            📊 Otros Totales
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <tbody>
              {creditAmt > 0 && (
                <tr>
                  <td style={PT}>📄 Créditos</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatGallons(creditGal)}</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(creditAmt)}</td>
                  <td style={{ ...PT, textAlign: 'center', fontSize: 8, whiteSpace: 'nowrap' }}>
                    {creditOk > 0 && `✅${creditOk} `}{creditNo > 0 && `❌${creditNo}`}
                  </td>
                </tr>
              )}
              {promoGal > 0 && (
                <tr>
                  <td style={PT}>🎁 Promociones</td>
                  <td style={{ ...PT, textAlign: 'right' }}>{formatGallons(promoGal)}</td>
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(promoAmt)}</td>
                  <td style={PT} />
                </tr>
              )}
              {discountAmt > 0 && (
                <tr>
                  <td style={PT}>🔻 Descuentos</td>
                  <td style={PT} />
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(discountAmt)}</td>
                  <td style={PT} />
                </tr>
              )}
              {expensesTotal > 0 && (
                <tr>
                  <td style={PT}>💸 Gastos</td>
                  <td style={PT} />
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(expensesTotal)}</td>
                  <td style={PT} />
                </tr>
              )}
              {delivTotal > 0 && (
                <tr>
                  <td style={PT}>💰 Entregas griferos</td>
                  <td style={PT} />
                  <td style={{ ...PT, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(delivTotal)}</td>
                  <td style={PT} />
                </tr>
              )}
              {creditAmt === 0 && promoGal === 0 && discountAmt === 0 && expensesTotal === 0 && delivTotal === 0 && (
                <tr><td style={{ ...PT, color: '#999' }} colSpan={4}>Sin registros adicionales</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECCIONES DETALLADAS (modo detallado) ── */}
      {mode === 'detallado' && (
        isDay
          ? <DayDetailedSections report={report} sections={sections} prices={prices} />
          : <ShiftDetailedSections report={report} sections={sections} prices={prices} />
      )}

      {/* Observaciones */}
      {report.notes && (
        <div style={{ marginTop: 8, padding: '4px 6px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 3, fontSize: 9 }}>
          <strong>Observaciones:</strong> {report.notes}
        </div>
      )}

      {/* Pie */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: 8, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#777' }}>
        <span>Grifo Control de Ventas</span>
        <span>Impreso: {new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

// ── Tablas detalladas para turno individual ──
const ShiftDetailedSections = ({ report, sections, prices }) => (
  <>
    {sections.payments && (report.items?.payments || []).length > 0 && (
      <PrintVerifTable title="💳 PAGOS ELECTRÓNICOS"
        headers={['Método', 'Referencia', 'Factura', 'Monto', 'Estado']}
        rows={(report.items.payments).map(p => [p.method, p.reference || '—', p.invoice || '—', formatCurrency(p.amount), statusText(p.verified)])}
        statusCol={4}
      />
    )}
    {sections.credits && (report.items?.credits || []).length > 0 && (
      <PrintVerifTable title="📄 CRÉDITOS"
        headers={['Producto', 'Cliente', 'Vale', 'Galones', 'Monto', 'Estado']}
        rows={(report.items.credits).map(c => [c.product, c.client || '—', c.voucher || '—', formatGallons(parseFloat(c.gallons) || 0), formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0)), statusText(c.verified)])}
        statusCol={5}
      />
    )}
    {sections.promotions && (report.items?.promotions || []).length > 0 && (
      <PrintVerifTable title="🎁 PROMOCIONES"
        headers={['Producto', 'DNI/Placa', 'Galones', 'Estado']}
        rows={(report.items.promotions).map(p => [p.product, p.dniPlate || '—', formatGallons(parseFloat(p.gallons) || 0), statusText(p.verified)])}
        statusCol={3}
      />
    )}
    {sections.discounts && (report.items?.discounts || []).length > 0 && (
      <PrintVerifTable title="🔻 DESCUENTOS"
        headers={['Producto', 'Cliente', 'Galones', 'Precio', 'Monto', 'Estado']}
        rows={(report.items.discounts).map(d => [d.product, d.client || '—', formatGallons(parseFloat(d.gallons) || 0), formatCurrency(d.price), formatCurrency((parseFloat(d.gallons) || 0) * Math.max(0, (prices[d.product] || 0) - (parseFloat(d.price) || 0))), statusText(d.verified)])}
        statusCol={5}
      />
    )}
  </>
);

// ── Tablas detalladas para día completo ──
const DayDetailedSections = ({ report, sections, prices }) => {
  const allItems = (key) =>
    (report.shiftReports || []).flatMap(sr =>
      (sr.items?.[key] || []).map(item => ({ ...item, _worker: sr.worker, _shift: sr.shift }))
    );

  return (
    <>
      {sections.payments && allItems('payments').length > 0 && (
        <PrintVerifTable title="💳 PAGOS ELECTRÓNICOS — TODOS LOS TURNOS"
          headers={['Trabajador', 'Turno', 'Método', 'Referencia', 'Factura', 'Monto', 'Estado']}
          rows={allItems('payments').map(p => [p._worker, p._shift, p.method, p.reference || '—', p.invoice || '—', formatCurrency(p.amount), statusText(p.verified)])}
          statusCol={6}
        />
      )}
      {sections.credits && allItems('credits').length > 0 && (
        <PrintVerifTable title="📄 CRÉDITOS — TODOS LOS TURNOS"
          headers={['Trabajador', 'Turno', 'Producto', 'Cliente', 'Vale', 'Galones', 'Monto', 'Estado']}
          rows={allItems('credits').map(c => [c._worker, c._shift, c.product, c.client || '—', c.voucher || '—', formatGallons(parseFloat(c.gallons) || 0), formatCurrency((parseFloat(c.gallons) || 0) * (prices[c.product] || 0)), statusText(c.verified)])}
          statusCol={7}
        />
      )}
      {sections.promotions && allItems('promotions').length > 0 && (
        <PrintVerifTable title="🎁 PROMOCIONES — TODOS LOS TURNOS"
          headers={['Trabajador', 'Turno', 'Producto', 'DNI/Placa', 'Galones', 'Estado']}
          rows={allItems('promotions').map(p => [p._worker, p._shift, p.product, p.dniPlate || '—', formatGallons(parseFloat(p.gallons) || 0), statusText(p.verified)])}
          statusCol={5}
        />
      )}
      {sections.discounts && allItems('discounts').length > 0 && (
        <PrintVerifTable title="🔻 DESCUENTOS — TODOS LOS TURNOS"
          headers={['Trabajador', 'Turno', 'Producto', 'Cliente', 'Galones', 'Estado']}
          rows={allItems('discounts').map(d => [d._worker, d._shift, d.product, d.client || '—', formatGallons(parseFloat(d.gallons) || 0), statusText(d.verified)])}
          statusCol={5}
        />
      )}
    </>
  );
};

// ── Tabla genérica con columna Estado coloreada ──
const PrintVerifTable = ({ title, headers, rows, statusCol }) => (
  <div style={{ marginTop: 7 }}>
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{title}</div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
      <thead>
        <tr>{headers.map(h => <th key={h} style={PTH}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const status = row[statusCol];
          const rowBg  = status === '✅' ? '#f0fff4' : status === '❌' ? '#fff5f5' : undefined;
          return (
            <tr key={i} style={{ background: rowBg }}>
              {row.map((cell, j) => (
                <td key={j} style={{ ...PT, textAlign: j === statusCol ? 'center' : 'left', fontWeight: j === statusCol ? 700 : 400 }}>
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ── Helpers de presentación ──
const InfoItem = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
  </div>
);
const StatBox = ({ label, value, color }) => (
  <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
  </div>
);
const ModalRow = ({ label, value, highlight }) => (
  <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
    <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
    <span style={{ fontWeight: highlight ? 900 : 700, fontSize: highlight ? 16 : 13, color: highlight ? '#34d399' : '#e2e8f0' }}>{value}</span>
  </div>
);

export default VerifiedReportsPage;
