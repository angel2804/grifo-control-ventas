import React from 'react';
import { Btn } from '../UIComponents';

const CloseConfirmModal = ({ confirmClose, setConfirmClose, handleConfirmClose }) => {
  if (!confirmClose) return null;

  return (
    <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          ¿Seguro que quieres terminar tu turno?
        </div>
        <p className="text-muted" style={{ marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
          Una vez cerrado, <strong>ya no podrás hacer cambios</strong> en los datos
          de este turno. Se generará un resumen para imprimir.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn variant="ghost" className="btn-full" style={{ padding: 14, fontSize: 15 }}
            onClick={() => setConfirmClose(false)}>
            ↩️ No, seguir trabajando
          </Btn>
          <Btn variant="danger" className="btn-full" style={{ padding: 14, fontSize: 15 }}
            onClick={handleConfirmClose}>
            ✅ Sí, cerrar turno
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default CloseConfirmModal;
