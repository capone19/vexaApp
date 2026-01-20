// ============================================
// VEXA - Hook useAuth (wrapper del AuthContext)
// ============================================
// Este hook ahora es un wrapper del AuthContext para
// mantener compatibilidad con el código existente.
// ============================================

import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook de autenticación que usa el AuthContext global.
 * Mantiene la misma interfaz para compatibilidad.
 */
export function useAuth() {
  const { user, isLoading } = useAuthContext();
  return { user, isLoading };
}
