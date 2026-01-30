import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type WhatsAppTemplate = Tables<'whatsapp_templates'>;

export interface CreateTemplateInput {
  name: string;
  category: string;
  language: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Array<{
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export const useYCloudTemplates = () => {
  const { tenantId } = useEffectiveTenant();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['whatsapp-templates', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!tenantId,
  });

  const syncTemplates = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-sync');
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', tenantId] });
      toast.success(`Sincronizados ${data.synced} de ${data.total} templates`);
    },
    onError: (error) => {
      console.error('Error syncing templates:', error);
      toast.error(error instanceof Error ? error.message : 'Error al sincronizar');
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-create', {
        body: input,
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', tenantId] });
      toast.success('Template creado y enviado a aprobación');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async ({ templateId, deleteFromYCloud = true }: { templateId: string; deleteFromYCloud?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-delete', {
        body: { templateId, deleteFromYCloud },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', tenantId] });
      toast.success('Template eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar template');
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    syncTemplates,
    createTemplate,
    deleteTemplate,
    isSyncing: syncTemplates.isPending,
    isCreating: createTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
};
