import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
import { toast } from 'sonner';

export interface YCloudConfig {
  id: string;
  tenant_id: string;
  api_key: string;
  waba_id: string;
  phone_number_id: string | null;
  phone_number: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveYCloudConfigInput {
  api_key: string;
  waba_id: string;
  phone_number_id?: string;
  phone_number?: string;
}

export const useYCloudConfig = () => {
  const { tenantId } = useEffectiveTenant();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['ycloud-config', tenantId],
    queryFn: async (): Promise<YCloudConfig | null> => {
      if (!tenantId) return null;
      
      // Use rpc or raw fetch since table is new and not in types yet
      const { data, error } = await supabase
        .rpc('get_user_tenant_id')
        .then(async () => {
          // Direct query using any to bypass type checking for new table
          return await (supabase as any)
            .from('tenant_ycloud_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching YCloud config:', error);
        throw error;
      }
      
      return data as YCloudConfig | null;
    },
    enabled: !!tenantId,
  });

  const saveConfig = useMutation({
    mutationFn: async (input: SaveYCloudConfigInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const configData = {
        tenant_id: tenantId,
        api_key: input.api_key,
        waba_id: input.waba_id,
        phone_number_id: input.phone_number_id || null,
        phone_number: input.phone_number || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Check if config exists using any to bypass type checking
      const client = supabase as any;
      const { data: existing } = await client
        .from('tenant_ycloud_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await client
          .from('tenant_ycloud_config')
          .update(configData)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        return data as YCloudConfig;
      } else {
        // Insert
        const { data, error } = await client
          .from('tenant_ycloud_config')
          .insert(configData)
          .select()
          .single();

        if (error) throw error;
        return data as YCloudConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ycloud-config', tenantId] });
      toast.success('Configuración guardada correctamente');
    },
    onError: (error) => {
      console.error('Error saving YCloud config:', error);
      toast.error('Error al guardar la configuración');
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-sync');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Conexión exitosa. ${data.synced} templates sincronizados.`);
        queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['ycloud-config', tenantId] });
      } else {
        toast.error(data.error || 'Error de conexión');
      }
    },
    onError: (error) => {
      console.error('Error testing YCloud connection:', error);
      toast.error('Error al conectar con YCloud');
    },
  });

  const isConfigured = !!configQuery.data?.api_key && !!configQuery.data?.waba_id;

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    isConfigured,
    saveConfig,
    testConnection,
  };
};
