import { useState, useCallback } from "react";
import { externalSupabase } from "@/integrations/supabase/external-client";

/**
 * Hook para obtener el tenant_id de un chat basado en el session_id.
 * Busca en la tabla tenant_channels del Supabase externo para mapear
 * el número de WhatsApp al tenant correspondiente.
 */
export function useChatTenant() {
  const [isLoading, setIsLoading] = useState(false);
  const [tenantCache, setTenantCache] = useState<Record<string, string | null>>({});

  /**
   * Obtiene el tenant_id para una sesión de chat.
   * El session_id tiene formato: "56912345678@s.whatsapp.net"
   * Busca el número en tenant_channels para obtener el tenant_id.
   */
  const getTenantForSession = useCallback(async (sessionId: string): Promise<string | null> => {
    // Verificar cache primero
    if (sessionId in tenantCache) {
      return tenantCache[sessionId];
    }

    setIsLoading(true);
    
    try {
      // Extraer número de teléfono del session_id
      // Formato: "56912345678@s.whatsapp.net" -> "56912345678"
      const phoneNumber = sessionId.split('@')[0];
      
      if (!phoneNumber) {
        console.warn("[useChatTenant] Invalid session_id format:", sessionId);
        return null;
      }

      // Construir variantes del número para búsqueda
      // tenant_channels puede tener: "+56912345678" o "56912345678"
      const phoneVariants = [
        `+${phoneNumber}`,
        phoneNumber,
      ];

      console.log("[useChatTenant] Searching tenant for phone variants:", phoneVariants);

      // Buscar en tenant_channels del Supabase externo
      const { data, error } = await externalSupabase
        .from('tenant_channels')
        .select('tenant_id')
        .eq('channel_type', 'whatsapp')
        .in('channel_identifier', phoneVariants)
        .limit(1)
        .single();

      if (error) {
        console.log("[useChatTenant] No tenant found for session:", sessionId, error.message);
        // Cache the null result to avoid repeated lookups
        setTenantCache(prev => ({ ...prev, [sessionId]: null }));
        return null;
      }

      const tenantId = data?.tenant_id || null;
      
      console.log("[useChatTenant] Found tenant for session:", sessionId, "->", tenantId);
      
      // Cache the result
      setTenantCache(prev => ({ ...prev, [sessionId]: tenantId }));
      
      return tenantId;
    } catch (err) {
      console.error("[useChatTenant] Error fetching tenant:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tenantCache]);

  /**
   * Limpia el cache de tenants
   */
  const clearCache = useCallback(() => {
    setTenantCache({});
  }, []);

  return {
    getTenantForSession,
    isLoading,
    clearCache,
  };
}
