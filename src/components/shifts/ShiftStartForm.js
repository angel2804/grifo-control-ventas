import React from 'react';
import { Card, Btn, Input, Select } from '../UIComponents';
import { ISLANDS_CONFIG, SHIFT_OPTIONS } from '../../utils/constants';

const ShiftStartForm = ({
  currentUser,
  startForm, setStartForm,
  carryoverMeters,
  existingSlotConflict,
  isDayFull,
  shiftsForSelectedDate,
  maxShiftsPerDay,
  handleStartShift,
}) => {
  const hasCarryover = Object.keys(carryoverMeters).length > 0;

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Mi Turno</h2>
      <Card>
        <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>⛽</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Bienvenido, {currentUser.name}
          </div>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            No tienes un turno activo. Llena el formulario y pulsa el botón para iniciar.
          </p>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Select
            label="ISLA ASIGNADA"
            value={startForm.island}
            onChange={(e) => setStartForm({ ...startForm, island: e.target.value })}
            options={ISLANDS_CONFIG.map((i) => ({ value: i.id.toString(), label: i.name }))}
          />
          <div className="grid-2">
            <Input
              label="FECHA"
              type="date"
              value={startForm.date}
              min={new Date().toLocaleDateString('en-CA')}
              onChange={(e) => setStartForm({ ...startForm, date: e.target.value })}
            />
            <Select
              label="TURNO"
              value={startForm.shift}
              onChange={(e) => setStartForm({ ...startForm, shift: e.target.value })}
              options={SHIFT_OPTIONS}
            />
          </div>

          {/* Contador de turnos del día */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#0f172a', borderRadius: 8,
            marginBottom: 12, fontSize: 13,
          }}>
            <span style={{ color: '#94a3b8' }}>Turnos registrados hoy ({startForm.date}):</span>
            <span style={{
              fontWeight: 800,
              color: isDayFull ? '#ef4444' : shiftsForSelectedDate.length >= 6 ? '#f59e0b' : '#34d399',
            }}>
              {shiftsForSelectedDate.length} / {maxShiftsPerDay}
            </span>
          </div>

          {/* Error: día completo */}
          {isDayFull && (
            <div style={{
              padding: 14, background: '#450a0a', borderRadius: 10,
              marginBottom: 16, border: '1px solid #991b1b',
            }}>
              <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                🚫 Día completo
              </div>
              <div style={{ color: '#f87171', fontSize: 13 }}>
                El {startForm.date} ya tiene los {maxShiftsPerDay} turnos registrados
                ({ISLANDS_CONFIG.length} islas × 3 turnos). No es posible agregar más turnos para este día.
              </div>
            </div>
          )}

          {/* Error: turno ya registrado */}
          {!isDayFull && existingSlotConflict && (
            <div style={{
              padding: 14, background: '#450a0a', borderRadius: 10,
              marginBottom: 16, border: '1px solid #991b1b',
            }}>
              <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                ⚠️ Turno ya registrado
              </div>
              <div style={{ color: '#f87171', fontSize: 13 }}>
                Ya existe un turno de <strong style={{ color: '#fca5a5' }}>{startForm.shift}</strong> para{' '}
                <strong style={{ color: '#fca5a5' }}>
                  {ISLANDS_CONFIG.find((i) => i.id.toString() === startForm.island)?.name || `Isla ${startForm.island}`}
                </strong>{' '}
                el {startForm.date}. Elige otra isla o turno.
              </div>
            </div>
          )}

          {/* Carryover / info contómetros */}
          {!existingSlotConflict && !isDayFull && (
            hasCarryover ? (
              <div style={{
                padding: 12, background: '#064e3b', borderRadius: 10,
                marginBottom: 16, fontSize: 13, color: '#6ee7b7',
                border: '1px solid #065f46',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  ✅ Contómetros del turno anterior (se cargarán automáticamente)
                </div>
                {Object.entries(carryoverMeters).map(([key, m]) => {
                  const parts = key.split('-');
                  const faceId = parts[1];
                  const island = ISLANDS_CONFIG.find((isl) => isl.id.toString() === parts[0]);
                  const face = island?.faces.find((f) => f.id === faceId);
                  const dispenser = face?.dispensers.find((d) => d.key === key);
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{face?.label || faceId} — {dispenser?.label || m.product}</span>
                      <span style={{ fontWeight: 700 }}>{(m.start || 0).toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: 10, background: '#1e3a5f', borderRadius: 10,
                marginBottom: 16, fontSize: 13, color: '#93c5fd',
                border: '1px solid #1e40af',
              }}>
                ℹ️ Los contómetros iniciarán en 0 (primer turno registrado de esta isla).
              </div>
            )
          )}

          <Btn
            onClick={handleStartShift}
            className="btn-full"
            disabled={existingSlotConflict || isDayFull}
            style={{
              padding: 16, fontSize: 18, marginTop: 4,
              opacity: (existingSlotConflict || isDayFull) ? 0.45 : 1,
              cursor: (existingSlotConflict || isDayFull) ? 'not-allowed' : 'pointer',
            }}
          >
            {isDayFull ? '🚫 Día completo — sin cupos' : existingSlotConflict ? '⛔ Turno ocupado' : '⛽ Iniciar Mi Turno'}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

export default ShiftStartForm;
