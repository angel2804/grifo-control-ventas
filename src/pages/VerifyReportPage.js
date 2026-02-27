import React from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn } from '../components/UIComponents';
import VerifyForm from '../components/verify/VerifyForm';
import VerifyDayForm from '../components/verify/VerifyDayForm';

// ============================================
// PÁGINA: Verificar Reporte (Solo Admin)
// Enruta al formulario de turno individual
// o al formulario de día completo según el target.
// ============================================
const VerifyReportPage = () => {
  const {
    verifyTarget, setVerifyTarget, setCurrentPage,
    addVerifiedReport, updateVerifiedReport,
    verifiedReports, prices, updateShift,
  } = useApp();

  if (!verifyTarget) {
    return (
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Verificar Reporte</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p className="text-muted">
              Selecciona un turno cerrado desde <strong>Reportes</strong> y pulsa
              "Verificar Reporte" para iniciar.
            </p>
            <Btn style={{ marginTop: 16 }} onClick={() => setCurrentPage('reports')}>
              Ir a Reportes
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  const sharedProps = {
    verifyTarget, setVerifyTarget, setCurrentPage,
    addVerifiedReport, updateVerifiedReport, verifiedReports, prices, updateShift,
  };

  if (verifyTarget.shifts) {
    return <VerifyDayForm {...sharedProps} />;
  }
  return <VerifyForm {...sharedProps} />;
};

export default VerifyReportPage;
