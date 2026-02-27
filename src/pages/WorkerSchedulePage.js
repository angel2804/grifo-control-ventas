import React from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/UIComponents';
import { DAYS_OF_WEEK, ISLANDS_CONFIG, getCurrentDayOfWeek } from '../utils/constants';

// ============================================
// PÁGINA: Mi Horario (solo grifero)
// Muestra el horario semanal asignado por el admin.
// ============================================

const WorkerSchedulePage = () => {
  const { currentUser, schedules } = useApp();
  const today = getCurrentDayOfWeek();

  const workerSchedule = schedules.find((s) => s.workerId === currentUser.id);
  const hasSchedule = workerSchedule?.entries?.length > 0;

  if (!hasSchedule) {
    return (
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📅 Mi Horario</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sin horario asignado</div>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              El administrador aún no ha configurado tu horario semanal.<br />
              Consulta con tu jefe para que lo asigne.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>📅 Mi Horario</h2>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
        Horario semanal asignado por el administrador.
      </p>

      {/* Tarjeta de hoy resaltada */}
      {(() => {
        const todayEntry = workerSchedule.entries.find((e) => e.day === today);
        const island = ISLANDS_CONFIG.find((i) => i.id.toString() === todayEntry?.island);
        return (
          <div style={{
            padding: '18px 22px', borderRadius: 12, marginBottom: 24,
            background: todayEntry ? '#0f2d1f' : '#1e293b',
            border: `2px solid ${todayEntry ? '#16a34a' : '#334155'}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: todayEntry ? '#4ade80' : '#64748b', letterSpacing: '0.1em', marginBottom: 6 }}>
              HOY — {today.toUpperCase()}
            </div>
            {todayEntry ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ShiftBadge shift={todayEntry.shift} large />
                <IslandBadge island={island} islandId={todayEntry.island} large />
                <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
                  — Tu turno de hoy está asignado. Dirígete a tu isla y pulsa «Iniciar Mi Turno».
                </span>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: 15, fontStyle: 'italic' }}>
                Hoy es tu día libre. ¡Descansa!
              </div>
            )}
          </div>
        );
      })()}

      {/* Lista de la semana */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DAYS_OF_WEEK.map((day) => {
          const entry = workerSchedule.entries.find((e) => e.day === day);
          const island = ISLANDS_CONFIG.find((i) => i.id.toString() === entry?.island);
          const isToday = day === today;

          return (
            <div
              key={day}
              style={{
                padding: '13px 18px',
                borderRadius: 10,
                background: isToday ? '#0f2416' : '#1e293b',
                border: `1px solid ${isToday ? '#166534' : '#334155'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              {/* Día */}
              <div style={{ width: 100, minWidth: 80 }}>
                {isToday && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#4ade80', letterSpacing: '0.1em', marginBottom: 2 }}>
                    HOY
                  </div>
                )}
                <div style={{
                  fontWeight: 700, fontSize: 15,
                  color: isToday ? '#4ade80' : entry ? '#f1f5f9' : '#475569',
                }}>
                  {day}
                </div>
              </div>

              {/* Contenido del día */}
              {entry ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <ShiftBadge shift={entry.shift} />
                  <IslandBadge island={island} islandId={entry.island} />
                </div>
              ) : (
                <span style={{ color: '#475569', fontSize: 13, fontStyle: 'italic' }}>
                  Día libre
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ color: '#475569', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        Si hay un error en tu horario, comunícaselo al administrador para que lo corrija.
      </p>
    </div>
  );
};

// ── Componentes auxiliares de badge ──

const ShiftBadge = ({ shift, large }) => {
  const colors = {
    Mañana: { bg: '#1a2744', text: '#93c5fd', icon: '🌅' },
    Tarde:  { bg: '#2d1b0a', text: '#fb923c', icon: '☀️' },
    Noche:  { bg: '#1e1b2e', text: '#c084fc', icon: '🌙' },
  };
  const c = colors[shift] || { bg: '#1e293b', text: '#94a3b8', icon: '⏰' };
  return (
    <span style={{
      padding: large ? '6px 16px' : '4px 12px',
      borderRadius: 20,
      background: c.bg, color: c.text,
      fontWeight: 700,
      fontSize: large ? 15 : 13,
    }}>
      {c.icon} {shift}
    </span>
  );
};

const IslandBadge = ({ island, islandId, large }) => (
  <span style={{
    padding: large ? '6px 16px' : '4px 12px',
    borderRadius: 20,
    background: '#0f172a', color: '#60a5fa',
    fontWeight: 700,
    fontSize: large ? 15 : 13,
    border: '1px solid #1e40af',
  }}>
    ⛽ {island?.name || `Isla ${islandId}`}
  </span>
);

export default WorkerSchedulePage;
