import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, Input, Select, Modal, StatusBadge } from '../components/UIComponents';
import { createEmptyShift, getCarryoverMeters } from '../utils/helpers';
import { ISLANDS_CONFIG, SHIFT_OPTIONS } from '../utils/constants';

// ============================================
// PÁGINA: Gestión de Turnos (Solo Admin)
// Crear turnos y asignarlos a trabajadores
// ============================================

const ShiftsPage = () => {
  const { shifts, users, addShift, closeShift } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    worker: '',
    island: '1',
    date: new Date().toLocaleDateString('en-CA'),
    shift: 'Mañana',
  });

  // Solo trabajadores (no admins)
  const workers = users.filter((u) => u.role === 'worker');

  // Crear nuevo turno
  const handleCreate = () => {
    if (!form.worker) return;

    const emptyShift = createEmptyShift();
    const carryoverMeters = getCarryoverMeters(shifts, form.island);
    const newShift = {
      ...emptyShift,
      worker: form.worker,
      island: form.island,
      date: form.date,
      shift: form.shift,
      meters: { ...emptyShift.meters, ...carryoverMeters },
      hasCarryover: Object.keys(carryoverMeters).length > 0,
    };

    addShift(newShift);
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Gestión de Turnos
          </h2>
          <p className="text-muted">Cree y administre turnos de trabajo</p>
        </div>
        <Btn onClick={() => setShowModal(true)}>➕ Nuevo Turno</Btn>
      </div>

      <Card className="mt-2">
        <table className="data-table">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Isla</th>
              <th>Fecha</th>
              <th>Turno</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shifts
              .slice()
              .reverse()
              .map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.worker}</td>
                  <td>Isla {s.island}</td>
                  <td>{s.date}</td>
                  <td>{s.shift}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    {s.status === 'open' && (
                      <Btn
                        variant="danger"
                        className="btn-sm"
                        onClick={() => closeShift(s.id)}
                      >
                        Cerrar Turno
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {shifts.length === 0 && (
          <p className="text-muted" style={{ textAlign: 'center', padding: 40 }}>
            No hay turnos registrados
          </p>
        )}
      </Card>

      {/* Modal para crear turno */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Crear Nuevo Turno"
      >
        <Select
          label="TRABAJADOR"
          value={form.worker}
          onChange={(e) => setForm({ ...form, worker: e.target.value })}
          options={[
            { value: '', label: 'Seleccionar...' },
            ...workers.map((w) => ({ value: w.name, label: w.name })),
          ]}
        />
        <Select
          label="ISLA"
          value={form.island}
          onChange={(e) => setForm({ ...form, island: e.target.value })}
          options={ISLANDS_CONFIG.map((i) => ({
            value: i.id.toString(),
            label: i.name,
          }))}
        />
        <div className="grid-2">
          <Input
            label="FECHA"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label="TURNO"
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value })}
            options={SHIFT_OPTIONS}
          />
        </div>
        {(() => {
          const co = getCarryoverMeters(shifts, form.island);
          return Object.keys(co).length > 0 ? (
            <div style={{
              padding: '8px 12px', background: '#064e3b', borderRadius: 8,
              fontSize: 13, color: '#6ee7b7', marginTop: 8,
              border: '1px solid #065f46',
            }}>
              ✅ Los contómetros iniciales se cargarán del turno anterior de esta isla.
            </div>
          ) : (
            <div style={{
              padding: '8px 12px', background: '#1e3a5f', borderRadius: 8,
              fontSize: 13, color: '#93c5fd', marginTop: 8,
              border: '1px solid #1e40af',
            }}>
              ℹ️ Los contómetros iniciarán en 0 (no hay turno anterior cerrado).
            </div>
          );
        })()}
        <Btn onClick={handleCreate} className="btn-full mt-2">
          ➕ Crear Turno
        </Btn>
      </Modal>
    </div>
  );
};

export default ShiftsPage;
