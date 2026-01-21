// ============================================
// VEXA - Hook para Chat Labels
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export interface ChatLabel {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionLabel {
  id: string;
  tenant_id: string;
  session_id: string;
  label_id: string;
  created_at: string;
}

interface UseChatLabelsReturn {
  labels: ChatLabel[];
  sessionLabels: Record<string, string[]>; // session_id -> label_ids[]
  isLoading: boolean;
  error: string | null;
  createLabel: (name: string, color: string) => Promise<ChatLabel | null>;
  updateLabel: (id: string, name: string, color: string) => Promise<boolean>;
  deleteLabel: (id: string) => Promise<boolean>;
  assignLabel: (sessionId: string, labelId: string) => Promise<boolean>;
  removeLabel: (sessionId: string, labelId: string) => Promise<boolean>;
  getLabelsForSession: (sessionId: string) => ChatLabel[];
  refetch: () => Promise<void>;
}

export function useChatLabels(): UseChatLabelsReturn {
  const { user } = useAuth();
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [sessionLabels, setSessionLabels] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId;

  // Fetch all labels and session assignments
  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLabels([]);
      setSessionLabels({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch labels
      const { data: labelsData, error: labelsError } = await supabase
        .from('chat_labels')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (labelsError) throw labelsError;

      // Fetch session-label assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('chat_session_labels')
        .select('*')
        .eq('tenant_id', tenantId);

      if (assignmentsError) throw assignmentsError;

      setLabels((labelsData as ChatLabel[]) || []);

      // Group assignments by session_id
      const grouped: Record<string, string[]> = {};
      (assignmentsData as ChatSessionLabel[] || []).forEach(assignment => {
        if (!grouped[assignment.session_id]) {
          grouped[assignment.session_id] = [];
        }
        grouped[assignment.session_id].push(assignment.label_id);
      });
      setSessionLabels(grouped);
    } catch (err) {
      console.error('[useChatLabels] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar etiquetas');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create a new label
  const createLabel = useCallback(async (name: string, color: string): Promise<ChatLabel | null> => {
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_labels')
        .insert({ tenant_id: tenantId, name, color })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una etiqueta con ese nombre');
        } else {
          toast.error('Error al crear etiqueta');
        }
        return null;
      }

      const newLabel = data as ChatLabel;
      setLabels(prev => [...prev, newLabel].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Etiqueta creada');
      return newLabel;
    } catch (err) {
      console.error('[useChatLabels] Error creating label:', err);
      toast.error('Error al crear etiqueta');
      return null;
    }
  }, [tenantId]);

  // Update an existing label
  const updateLabel = useCallback(async (id: string, name: string, color: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_labels')
        .update({ name, color })
        .eq('id', id);

      if (error) {
        toast.error('Error al actualizar etiqueta');
        return false;
      }

      setLabels(prev => prev.map(l => l.id === id ? { ...l, name, color } : l));
      toast.success('Etiqueta actualizada');
      return true;
    } catch (err) {
      console.error('[useChatLabels] Error updating label:', err);
      toast.error('Error al actualizar etiqueta');
      return false;
    }
  }, []);

  // Delete a label
  const deleteLabel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_labels')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Error al eliminar etiqueta');
        return false;
      }

      setLabels(prev => prev.filter(l => l.id !== id));
      // Remove from all session assignments
      setSessionLabels(prev => {
        const updated: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sessionId, labelIds]) => {
          const filtered = labelIds.filter(lid => lid !== id);
          if (filtered.length > 0) {
            updated[sessionId] = filtered;
          }
        });
        return updated;
      });
      toast.success('Etiqueta eliminada');
      return true;
    } catch (err) {
      console.error('[useChatLabels] Error deleting label:', err);
      toast.error('Error al eliminar etiqueta');
      return false;
    }
  }, []);

  // Assign label to session
  const assignLabel = useCallback(async (sessionId: string, labelId: string): Promise<boolean> => {
    if (!tenantId) return false;

    // Check if already assigned
    if (sessionLabels[sessionId]?.includes(labelId)) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('chat_session_labels')
        .insert({ tenant_id: tenantId, session_id: sessionId, label_id: labelId });

      if (error) {
        if (error.code === '23505') {
          // Already exists, just update local state
          setSessionLabels(prev => ({
            ...prev,
            [sessionId]: [...(prev[sessionId] || []), labelId]
          }));
          return true;
        }
        toast.error('Error al asignar etiqueta');
        return false;
      }

      setSessionLabels(prev => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), labelId]
      }));
      return true;
    } catch (err) {
      console.error('[useChatLabels] Error assigning label:', err);
      toast.error('Error al asignar etiqueta');
      return false;
    }
  }, [tenantId, sessionLabels]);

  // Remove label from session
  const removeLabel = useCallback(async (sessionId: string, labelId: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('chat_session_labels')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('session_id', sessionId)
        .eq('label_id', labelId);

      if (error) {
        toast.error('Error al remover etiqueta');
        return false;
      }

      setSessionLabels(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).filter(id => id !== labelId)
      }));
      return true;
    } catch (err) {
      console.error('[useChatLabels] Error removing label:', err);
      toast.error('Error al remover etiqueta');
      return false;
    }
  }, [tenantId]);

  // Get labels for a specific session
  const getLabelsForSession = useCallback((sessionId: string): ChatLabel[] => {
    const labelIds = sessionLabels[sessionId] || [];
    return labels.filter(label => labelIds.includes(label.id));
  }, [labels, sessionLabels]);

  return {
    labels,
    sessionLabels,
    isLoading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeLabel,
    getLabelsForSession,
    refetch: fetchData,
  };
}
