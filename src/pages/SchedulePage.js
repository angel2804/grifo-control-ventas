import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn } from '../components/UIComponents';
import { ISLANDS_CONFIG, SHIFT_OPTIONS, DAYS_OF_WEEK } from '../utils/constants';

// ============================================
// PÁGINA: Horarios (solo admin)
// Asigna isla y turno por día a cada trabajador.
// ============================================

const SchedulePage = () => {
  const { users, schedules, setSchedule } = useApp();
  const workers = users.filter((u) => u.role === 'worker');

  const [selectedId, setSelectedId] = useState(workers[0]?.id ?? null);
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

  const selectedWorker = workers.find((w) => w.id === selectedId);

  // Inicializa el borrador al cambiar de trabajador
  useEffect(() => {
    const sch = schedules.find((s) => s.workerId === selectedId);
    const d = {};
    DAYS_OF_WEEK.forEach((day) => { d[day] = null; });
    sch?.entries?.forEach((e) => { d[e.day] = { shift: e.shift, island: e.island }; });
    setDraft(d);
    setSaved(false);
  }, [selectedId, schedules]);

  // Seleccionar primer worker cuando carguen los datos
  useEffect(() => {
    if (!selectedId && workers.length > 0) setSelectedId(workers[0].id);
  }, [workers.length]); // eslint-disable-line

  const toggleDay = (day) => {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { shift: 'Mañana', island: '1' },
    }));
    setSaved(false);
  };

  const updateEntry = (day, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day], [field]: value } : null,
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedWorker) return;
    const entries = DAYS_OF_WEEK
      .filter((day) => draft[day])
      .map((day) => ({ day, shift: draft[day].shift, island: draft[day].island }));
    await setSchedule(selectedWorker.id, selectedWorker.name, entries);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Resumen: horario consolidado de todos los workers
  const allSchedules = useMemo(() =>
    workers.map((w) => ({
      worker: w,
      schedule: schedules.find((s) => s.workerId === w.id),
    })),
    [workers, schedules]
  );

  if (workers.length === 0) {
    return (
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📅 Horarios</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sin trabajadores</div>
            <p style={{ color: '#94a3b8' }}>
              Agrega griferos desde la sección <strong>Usuarios</strong> para poder asignar horarios.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>📅 Horarios</h2>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
        Asigna la isla y el turno de cada día para tus trabajadores. Al iniciar turno, los campos se llenan automáticamente.
      </p>

      {/* ── Selector de trabajador ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10, letterSpacing: '0.05em' }}>
          SELECCIONAR TRABAJADOR
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {workers.map((w) => (
            <Btn
              key={w.id}
              variant={selectedId === w.id ? 'primary' : 'ghost'}
              onClick={() => setSelectedId(w.id)}
              style={{ fontSize: 14 }}
            >
              👤 {w.name}
            </Btn>
          ))}
        </div>
      </Card>

      {/* ── Editor de horario ── */}
      {selectedWorker && (
        <Card title={`Horario de ${selectedWorker.name}`} style={{ marginBottom: 24 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Día</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>¿Trabaja?</th>
                  <th style={thStyle}>Turno</th>
                  <th style={thStyle}>Isla</th>
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day) => {
                  const entry = draft[day];
                  const active = !!entry;
                  return (
                    <tr key={day} style={{ borderBottom: '1px solid #1e293b' }}>
                      {/* Día */}
                      <td style={tdStyle}>
                        <strong style={{ color: active ? '#f1f5f9' : '#475569', fontSize: 15 }}>
                          {day}
                        </strong>
                      </td>

                      {/* Toggle switch */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => toggleDay(day)}
                          title={active ? 'Quitar turno' : 'Asignar turno'}
                          style={{
                            width: 44, height: 24, borderRadius: 12,
                            border: 'none', cursor: 'pointer', position: 'relative',
                            background: active ? '#10b981' : '#334155',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3,
                            left: active ? 22 : 3,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#fff', transition: 'left 0.2s',
                          }} />
                        </button>
                      </td>

                      {/* Turno */}
                      <td style={tdStyle}>
                        {active ? (
                          <select
                            value={entry.shift}
                            onChange={(e) => updateEntry(day, 'shift', e.target.value)}
                            style={selectStyle}
                          >
                            {SHIFT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12, fontStyle: 'italic' }}>— Libre —</span>
                        )}
                      </td>

                      {/* Isla */}
                      <td style={tdStyle}>
                        {active ? (
                          <select
                            value={entry.island}
                            onChange={(e) => updateEntry(day, 'island', e.target.value)}
                            style={selectStyle}
                          >
                            {ISLANDS_CONFIG.map((i) => (
                              <option key={i.id} value={i.id.toString()}>{i.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: '#475569', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Btn onClick={handleSave} style={{ minWidth: 180, padding: '10px 20px', fontSize: 15 }}>
              {saved ? '✅ ¡Horario guardado!' : '💾 Guardar horario'}
            </Btn>
            {saved && (
              <span style={{ color: '#10b981', fontSize: 13 }}>
                El horario de {selectedWorker.name} fue actualizado.
              </span>
            )}
          </div>
        </Card>
      )}

      {/* ── Resumen de todos los horarios ── */}
      <Card title="Resumen semanal — todos los trabajadores">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 120 }}>Trabajador</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d} style={{ ...thStyle, minWidth: 90, textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSchedules.map(({ worker, schedule }) => (
                <tr
                  key={worker.id}
                  style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
                  onClick={() => setSelectedId(worker.id)}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: selectedId === worker.id ? '#34d399' : '#f1f5f9' }}>
                      👤 {worker.name}
                    </span>
                  </td>
                  {DAYS_OF_WEEK.map((day) => {
                    const entry = schedule?.entries?.find((e) => e.day === day);
                    const island = ISLANDS_CONFIG.find((i) => i.id.toString() === entry?.island);
                    return (
                      <td key={day} style={{ ...tdStyle, textAlign: 'center' }}>
                        {entry ? (
                          <div>
                            <div style={{ color: shiftColor(entry.shift), fontWeight: 700, fontSize: 11 }}>
                              {shiftIcon(entry.shift)} {entry.shift}
                            </div>
                            <div style={{ color: '#60a5fa', fontSize: 11 }}>
                              {island?.name || `Isla ${entry.island}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#334155', fontSize: 11 }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {allSchedules.length === 0 && (
                <tr>
                  <td colSpan={DAYS_OF_WEEK.length + 1} style={{ ...tdStyle, textAlign: 'center', color: '#475569' }}>
                    Sin horarios configurados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ color: '#475569', fontSize: 11, marginTop: 12 }}>
          Haz clic en una fila para editar el horario de ese trabajador.
        </p>
      </Card>
    </div>
  );
};

// ── Estilos de tabla ──
const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  color: '#64748b',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '2px solid #1e293b',
};

const tdStyle = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};

const selectStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#f1f5f9',
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
};

const shiftColor = (shift) => {
  if (shift === 'Mañana') return '#93c5fd';
  if (shift === 'Tarde')  return '#fb923c';
  if (shift === 'Noche')  return '#c084fc';
  return '#94a3b8';
};

const shiftIcon = (shift) => {
  if (shift === 'Mañana') return '🌅';
  if (shift === 'Tarde')  return '☀️';
  if (shift === 'Noche')  return '🌙';
  return '⏰';
};

export default SchedulePage;
