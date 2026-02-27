import React from 'react';
import { useWorkerShift } from '../hooks/useWorkerShift';
import ShiftStartForm from '../components/shifts/ShiftStartForm';
import ShiftOpenView from '../components/shifts/ShiftOpenView';
import ShiftSummaryPrint from '../components/shifts/ShiftSummaryPrint';
import ItemModal from '../components/shifts/ItemModal';
import CloseConfirmModal from '../components/shifts/CloseConfirmModal';

// ============================================
// PÁGINA: Mi Turno (Grifero)
// Orquesta el hook y los sub-componentes.
// Toda la lógica vive en useWorkerShift.
// ============================================

const WorkerShiftPage = () => {
  const ws = useWorkerShift();

  // Si acaba de cerrar el turno → mostrar resumen imprimible
  if (ws.lastClosedShift && !ws.shift) {
    return (
      <ShiftSummaryPrint
        shift={ws.lastClosedShift}
        prices={ws.prices}
        onDismiss={() => ws.setLastClosedShift(null)}
      />
    );
  }

  // Si no hay turno activo → formulario de inicio
  if (!ws.shift) {
    return (
      <ShiftStartForm
        currentUser={ws.currentUser}
        startForm={ws.startForm}
        setStartForm={ws.setStartForm}
        carryoverMeters={ws.carryoverMeters}
        existingSlotConflict={ws.existingSlotConflict}
        isDayFull={ws.isDayFull}
        shiftsForSelectedDate={ws.shiftsForSelectedDate}
        maxShiftsPerDay={ws.maxShiftsPerDay}
        handleStartShift={ws.handleStartShift}
      />
    );
  }

  // Turno activo
  return (
    <>
      <ShiftOpenView
        shift={ws.shift}
        prices={ws.prices}
        islandConfig={ws.islandConfig}
        activeTab={ws.activeTab}
        setActiveTab={ws.setActiveTab}
        setConfirmClose={ws.setConfirmClose}
        calcs={ws.calcs}
        actions={ws.actions}
      />
      <ItemModal
        itemModal={ws.itemModal}
        setItemModal={(v) => ws.setModalField && null /* controlled via hook */}
        setModalField={ws.setModalField}
        handleModalSave={ws.handleModalSave}
        handleModalDelete={ws.handleModalDelete}
        prices={ws.prices}
        isGLP={ws.islandConfig?.isGLP ?? false}
      />
      <CloseConfirmModal
        confirmClose={ws.confirmClose}
        setConfirmClose={ws.setConfirmClose}
        handleConfirmClose={ws.handleConfirmClose}
      />
    </>
  );
};

export default WorkerShiftPage;

