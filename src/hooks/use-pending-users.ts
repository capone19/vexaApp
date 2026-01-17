import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingUser {
  id: string;
  fullName: string | null;
  email: string | null;
  createdAt: string;
}

export function usePendingUsers() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the edge function that bypasses RLS and filters out admin
      const { data, error: invokeError } = await supabase.functions.invoke('admin-list-pending-users');

      if (invokeError) {
        throw invokeError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPendingUsers(data?.pendingUsers || []);
    } catch (err) {
      console.error('[usePendingUsers] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios pendientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  return {
    pendingUsers,
    isLoading,
    error,
    refetch: fetchPendingUsers,
  };
}
