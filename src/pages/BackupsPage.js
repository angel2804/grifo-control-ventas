import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Btn } from '../components/UIComponents';

// ============================================
// PÁGINA: Copias de Seguridad
// Solo para administradores
// ============================================

const BackupsPage = () => {
  const {
    backups, backupsLoaded,
    createBackup, restoreFromBackup,
    exportToJson, importFromJson,
  } = useApp();

  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null); // backupId en proceso
  const [importing, setImporting] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null); // backup a confirmar
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }
  const fileInputRef = useRef(null);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── Crear backup manual ──
  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBackup(customLabel.trim() || null);
      setCustomLabel('');
      setShowLabelInput(false);
      showMsg('ok', 'Copia de seguridad creada correctamente.');
    } catch (e) {
      showMsg('err', 'Error al crear la copia: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Restaurar ──
  const handleRestore = async (backup) => {
    setConfirmRestore(null);
    setRestoring(backup.id);
    try {
      await restoreFromBackup(backup.id);
      showMsg('ok', `Datos restaurados desde: ${backup.label}`);
    } catch (e) {
      showMsg('err', 'Error al restaurar: ' + e.message);
    } finally {
      setRestoring(null);
    }
  };

  // ── Importar JSON ──
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      await importFromJson(text);
      showMsg('ok', 'Datos importados correctamente desde el archivo JSON.');
    } catch (err) {
      showMsg('err', 'Error al importar: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>
      <div className="card-header" style={{ fontSize: 22, marginBottom: 20 }}>
        💾 Copias de Seguridad
      </div>

      {/* Mensaje de estado */}
      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 600,
          background: msg.type === 'ok' ? '#14532d' : '#7f1d1d',
          color: msg.type === 'ok' ? '#4ade80' : '#f87171',
          border: `1px solid ${msg.type === 'ok' ? '#16a34a' : '#ef4444'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span>{msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}</span>
          <button
            onClick={() => setMsg(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: msg.type === 'ok' ? '#4ade80' : '#f87171',
              fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0, opacity: 0.7,
            }}
          >✕</button>
        </div>
      )}

      {/* ── Sección: Crear backup ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
          📦 Crear copia manual
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
          Guarda una copia de todos los datos actuales (turnos, reportes, precios y usuarios).
          Se mantienen las últimas 7 copias automáticamente.
        </p>

        {showLabelInput && (
          <input
            className="input-field"
            placeholder="Nombre de la copia (opcional)"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            style={{ marginBottom: 10 }}
          />
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn onClick={handleCreate} disabled={creating} style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}>
            {creating ? '⏳ Guardando...' : '💾 Guardar copia ahora'}
          </Btn>
          <Btn variant="ghost" onClick={() => setShowLabelInput(v => !v)} style={{ justifyContent: 'center' }}>
            {showLabelInput ? '✕ Sin nombre' : '✏️ Añadir nombre'}
          </Btn>
        </div>
      </div>

      {/* ── Sección: Exportar / Importar JSON ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
          📂 Exportar / Importar archivo
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
          Descarga todos los datos como un archivo <strong>.json</strong> a tu dispositivo,
          o sube un archivo para restaurar datos desde él.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn onClick={exportToJson} style={{ flex: 1, minWidth: 140, justifyContent: 'center' }}>
            ⬇️ Descargar JSON
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{ flex: 1, minWidth: 140, justifyContent: 'center' }}
          >
            {importing ? '⏳ Importando...' : '⬆️ Cargar JSON'}
          </Btn>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* ── Lista de copias ── */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
          🗂️ Copias guardadas en la nube
        </div>

        {!backupsLoaded ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>Cargando...</div>
        ) : backups.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>
            No hay copias de seguridad aún.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {backups.map((b) => (
              <div key={b.id} style={{
                background: '#0f172a', borderRadius: 10,
                padding: '12px 14px',
                border: '1px solid #1e293b',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {b.auto
                        ? <span style={{ color: '#60a5fa' }}>🤖 {b.label}</span>
                        : <span style={{ color: '#34d399' }}>🖐️ {b.label}</span>
                      }
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {formatDate(b.createdAt)}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      {b.shiftsCount} turno{b.shiftsCount !== 1 ? 's' : ''} · {b.reportsCount} reporte{b.reportsCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Btn
                    variant="ghost"
                    className="btn-sm"
                    disabled={restoring === b.id}
                    onClick={() => setConfirmRestore(b)}
                    style={{ flexShrink: 0, alignSelf: 'center' }}
                  >
                    {restoring === b.id ? '⏳' : '♻️ Restaurar'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de confirmación de restauración ── */}
      {confirmRestore && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: 20,
        }}>
          <div className="card" style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
              ⚠️ Confirmar restauración
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 6 }}>
              Vas a restaurar los datos desde:
            </p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{confirmRestore.label}</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              <strong style={{ color: '#f87171' }}>Atención:</strong> Esto reemplazará
              TODOS los datos actuales (turnos, reportes, precios, usuarios) con los
              datos de esta copia. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn
                variant="danger"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleRestore(confirmRestore)}
              >
                ♻️ Sí, restaurar
              </Btn>
              <Btn
                variant="ghost"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setConfirmRestore(null)}
              >
                Cancelar
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupsPage;
