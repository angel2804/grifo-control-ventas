import React from 'react';
import { useApp } from '../context/AppContext';
import { Card, ProductTag } from '../components/UIComponents';
import { ISLANDS_CONFIG } from '../utils/constants';

// ============================================
// PÁGINA: Contómetros de Inicio (Solo Admin)
// Configura los contómetros iniciales para
// cada turno abierto
// ============================================

const MetersPage = () => {
  const { shifts, updateShift } = useApp();

  // Solo turnos abiertos
  const openShifts = shifts.filter((s) => s.status === 'open');

  // Actualizar contómetro de inicio
  const handleUpdateStart = (shiftId, meterKey, value) => {
    updateShift(shiftId, (s) => ({
      ...s,
      meters: {
        ...s.meters,
        [meterKey]: { ...s.meters[meterKey], start: value },
      },
    }));
  };

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Contómetros de Inicio
      </h2>
      <p className="text-muted mb-3">
        Configure los contómetros iniciales para cada turno abierto
      </p>

      {openShifts.length === 0 ? (
        <Card>
          <p className="text-muted" style={{ textAlign: 'center', padding: 40 }}>
            No hay turnos abiertos. Cree un turno desde la sección "Turnos".
          </p>
        </Card>
      ) : (
        openShifts.map((shift) => (
          <Card
            key={shift.id}
            title={`Turno: ${shift.worker} — ${shift.date} (${shift.shift})`}
            icon="⛽"
          >
            {ISLANDS_CONFIG.filter((island) => island.id.toString() === shift.island).map((island) => (
              <div key={island.id} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#94a3b8',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  {island.name}
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cara</th>
                      <th>Producto</th>
                      <th>Contómetro Inicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {island.faces.map((face) =>
                      face.dispensers.map((dispenser) => {
                        const key = dispenser.key;
                        return (
                          <tr key={key}>
                            <td>{face.label}</td>
                            <td>
                              <ProductTag product={dispenser.product} />
                              {' '}
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                {dispenser.label}
                              </span>
                            </td>
                            <td>
                              <input
                                className="input-field"
                                style={{ width: 160 }}
                                type="number"
                                step="0.001"
                                value={shift.meters[key]?.start || ''}
                                onChange={(e) =>
                                  handleUpdateStart(shift.id, key, e.target.value)
                                }
                                placeholder="0.000"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );
};

export default MetersPage;
