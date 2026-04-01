// ============================================
// VEXA - Hook para Uso del Período de Facturación
// ============================================
// CRÍTICO: Este hook determina el uso para facturación.
// El período se calcula SIEMPRE basado en la fecha de creación
// del tenant (ciclos mensuales desde created_at).
// ============================================
// FUENTE DE VERDAD:
// - Período: tenants.created_at (1 mes desde fecha de creación)
// - Plan/Límites: tenants.plan (no subscription)
// ============================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
import { countConversationsForBillingPeriod } from '@/lib/api/conversation-counter';
import { 
  getConversationLimit, 
  getWhatsAppLimit, 
  hasCampaignsEnabled,
  type PlanId 
} from '@/lib/plan';

// Costo por conversación extra en USD
export const EXTRA_CONVERSATION_COST_USD = 0.30;

export interface PeriodUsage {
  // Conversaciones - FUENTE DE VERDAD para facturación
  conversationsUsed: number;
  conversationsLimit: number;
  conversationsPercentage: number;
  
  // Conversaciones extra y costo
  conversationsExtra: number;      // Conversaciones sobre el límite
  extraCostUSD: number;            // Costo de las conversaciones extra
  
  // Mensajes totales (informativo)
  totalMessages: number;
  avgMessagesPerConversation: number;
  
  // WhatsApp
  whatsappConnected: number;
  whatsappLimit: number | 'unlimited';
  
  // Campañas
  campaignsUsed: number;
  campaignsEnabled: boolean;
  
  // Período
  periodStart: Date;
  periodEnd: Date;
  daysRemaining: number;           // Días restantes del período
  daysTotal: number;               // Total de días del período
  daysElapsed: number;             // Días transcurridos
}

interface UsePeriodUsageReturn {
  usage: PeriodUsage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Calcula el período de facturación actual basado en la fecha de inicio.
 * Los períodos son ciclos mensuales desde la fecha de inicio.
 * Ejemplo: Si createdAt es 15 enero, los períodos son 15 ene - 14 feb, 15 feb - 14 mar, etc.
 */
function calculateBillingPeriod(startDate: Date): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const dayOfMonth = startDate.getDate();
  
  // Encontrar el inicio del período actual
  let periodStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // Si ya pasó ese día del mes, estamos en el período que empezó este mes
  // Si no ha llegado, estamos en el período que empezó el mes pasado
  if (now.getDate() < dayOfMonth) {
    periodStart.setMonth(periodStart.getMonth() - 1);
  }
  
  // El período termina un mes después del inicio (menos 1 día)
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  
  return { periodStart, periodEnd };
}

/**
 * Función de fetch que SIEMPRE usa tenants.created_at para el período
 * y tenants.plan para los límites.
 */
async function fetchPeriodUsage(
  tenantId: string, 
  providedCreatedAt?: Date | null  // Para impersonación: evita consultar BD (RLS bloqueado)
): Promise<PeriodUsage> {
  let periodStart: Date;
  let periodEnd: Date;
  let tenantPlan: string | null = null;
  
  // ============================================
  // Si ya tenemos createdAt (de impersonación), usarlo directamente
  // Esto evita el problema de RLS cuando admin impersona
  // ============================================
  if (providedCreatedAt) {
    const calculated = calculateBillingPeriod(providedCreatedAt);
    periodStart = calculated.periodStart;
    periodEnd = calculated.periodEnd;
    console.log('[usePeriodUsage] Usando createdAt desde contexto de impersonación:', providedCreatedAt.toISOString());
  } else {
    // Caso normal: consultar BD para obtener created_at
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('created_at, plan')
      .eq('id', tenantId)
      .single();
    
    tenantPlan = tenantData?.plan || null;
    
    if (tenantError || !tenantData?.created_at) {
      console.warn('[usePeriodUsage] No se pudo obtener created_at del tenant, usando fallback');
      // FALLBACK: Usar el mes actual si no hay fecha de creación
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Calcular período basado en fecha de creación del tenant
      const createdAt = new Date(tenantData.created_at);
      const calculated = calculateBillingPeriod(createdAt);
      periodStart = calculated.periodStart;
      periodEnd = calculated.periodEnd;
    }
  }

  // Calcular días del período
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
  const daysElapsed = Math.max(0, Math.ceil((now.getTime() - periodStart.getTime()) / msPerDay));
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay));

  // ============================================
  // USAR FUNCIÓN CENTRALIZADA DE CONTEO
  // ============================================
  const conversationData = await countConversationsForBillingPeriod(
    tenantId,
    periodStart,
    periodEnd
  );

  const conversationsUsed = conversationData.totalConversations;
  const totalMessages = conversationData.totalMessages;
  const avgMessagesPerConversation = conversationData.avgMessagesPerConversation;

  // ============================================
  // USAR PLAN DEL TENANT (no de suscripción)
  // Si viene de impersonación, necesitamos obtener el plan de otra forma
  // ============================================
  let currentPlan: PlanId = 'basic';
  
  if (providedCreatedAt) {
    // En impersonación, el plan viene del contexto o necesitamos consultarlo
    // Por ahora consultamos solo el plan (sin created_at que ya tenemos)
    const { data: planData } = await supabase
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();
    currentPlan = (planData?.plan as PlanId) || 'basic';
  } else if (tenantPlan) {
    currentPlan = tenantPlan as PlanId;
  }
  
  const conversationsLimit = getConversationLimit(currentPlan);
  const whatsappLimit = getWhatsAppLimit(currentPlan);
  const campaignsEnabled = hasCampaignsEnabled(currentPlan);

  // Calcular conversaciones extra y costo
  const conversationsExtra = Math.max(0, conversationsUsed - conversationsLimit);
  const extraCostUSD = conversationsExtra * EXTRA_CONVERSATION_COST_USD;

  // WhatsApp conectados (por ahora hardcodeado)
  const whatsappConnected = 1;

  // Campañas
  const campaignsUsed = 0;

  const conversationsPercentage = conversationsLimit > 0 
    ? Math.round((conversationsUsed / conversationsLimit) * 100) 
    : 0;

  console.log('[usePeriodUsage] ✓ Billing usage loaded:', {
    tenantId,
    periodSource: providedCreatedAt ? 'ImpersonationContext' : 'tenants.created_at',
    conversationsUsed,
    conversationsLimit,
    conversationsExtra,
    extraCostUSD,
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    daysRemaining,
    currentPlan,
  });

  return {
    conversationsUsed,
    conversationsLimit,
    conversationsPercentage,
    conversationsExtra,
    extraCostUSD,
    totalMessages,
    avgMessagesPerConversation,
    whatsappConnected,
    whatsappLimit,
    campaignsUsed,
    campaignsEnabled,
    periodStart,
    periodEnd,
    daysRemaining,
    daysTotal,
    daysElapsed,
  };
}

export function usePeriodUsage(): UsePeriodUsageReturn {
  const { tenantId, tenantCreatedAt, isImpersonating } = useEffectiveTenant();
  const queryClient = useQueryClient();

  // Query key incluye tenantId y createdAt para cache correcto
  const queryKey = ['period-usage', tenantId, tenantCreatedAt?.toISOString()];

  // Debug: Estado actual
  console.log('[usePeriodUsage] Hook state:', {
    tenantId,
    tenantCreatedAt: tenantCreatedAt?.toISOString(),
    isImpersonating,
    source: tenantCreatedAt ? 'ImpersonationContext' : 'Will query tenants table',
  });

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPeriodUsage(tenantId!, tenantCreatedAt),
    // Solo ejecutar cuando tenemos tenantId
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 min — el realtime global invalida cuando llegan nuevas conversaciones
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  return {
    usage: usage ?? null,
    isLoading: tenantId ? isLoading : false,
    error: error ? (error as Error).message : null,
    refetch: async () => { 
      await refetch(); 
    },
  };
}
