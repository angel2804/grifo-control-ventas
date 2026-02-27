import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

// ============================================
// HOOK: useAllClients
// Devuelve la lista de clientes únicos (MAYÚSCULAS)
// obtenidos de los turnos y de los créditos importados.
// Se usa para el autocompletado en el modal de créditos.
// ============================================
export function useAllClients() {
  const { shifts, creditImports = [] } = useApp();

  return useMemo(() => {
    const names = new Set();
    shifts.forEach((s) => {
      (s.credits || []).forEach((c) => {
        const n = c.client?.trim().toUpperCase();
        if (n) names.add(n);
      });
      (s.discounts || []).forEach((d) => {
        const n = d.client?.trim().toUpperCase();
        if (n) names.add(n);
      });
    });
    creditImports.forEach((i) => {
      const n = i.clientName?.trim().toUpperCase();
      if (n) names.add(n);
    });
    return [...names].sort();
  }, [shifts, creditImports]);
}
