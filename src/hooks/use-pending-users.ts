import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingUser {
  id: string;
  fullName: string | null;
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

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, created_at');

      if (profilesError) {
        throw profilesError;
      }

      // Get user_ids that already have a tenant
      const { data: assignedUsers, error: assignedError } = await supabase
        .from('user_roles')
        .select('user_id');

      if (assignedError) {
        throw assignedError;
      }

      // Filter profiles that don't have a tenant
      const assignedUserIds = new Set(assignedUsers?.map(u => u.user_id) || []);
      const pending = (profiles || [])
        .filter(p => !assignedUserIds.has(p.user_id))
        .map(p => ({
          id: p.user_id,
          fullName: p.full_name,
          createdAt: p.created_at || new Date().toISOString(),
        }));

      setPendingUsers(pending);
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
