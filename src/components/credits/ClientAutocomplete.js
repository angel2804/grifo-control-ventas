import React, { useState } from 'react';

// ============================================
// COMPONENTE: ClientAutocomplete
// Campo de texto con autocompletado de clientes.
// - Fuerza MAYÚSCULAS en tiempo real
// - Muestra sugerencias de clientes existentes
// - Seleccionar una sugerencia rellena el campo
// ============================================

const ClientAutocomplete = ({ label, value, onChange, allClients = [], placeholder }) => {
  const [open, setOpen] = useState(false);

  const query = (value || '').toUpperCase();
  const suggestions = allClients
    .filter((c) => c !== query && c.includes(query))
    .slice(0, 8);
  const showDrop = open && suggestions.length > 0;

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      {label && <label className="form-label">{label}</label>}
      <input
        className="input-field"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Nombre del cliente'}
        autoComplete="off"
        spellCheck="false"
        style={{ textTransform: 'uppercase' }}
      />

      {showDrop && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '0 0 8px 8px', maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {allClients.length > 0 && query.length === 0 && (
            <div style={{ padding: '6px 12px', fontSize: 10, color: '#475569', borderBottom: '1px solid #0f172a', letterSpacing: '0.05em' }}>
              CLIENTES REGISTRADOS
            </div>
          )}
          {suggestions.map((c) => (
            <div
              key={c}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              style={{
                padding: '9px 14px', cursor: 'pointer',
                color: '#cbd5e1', fontSize: 13,
                borderBottom: '1px solid #0f172a',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              👤 {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientAutocomplete;
