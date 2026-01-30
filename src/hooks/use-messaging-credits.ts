// ============================================
// VEXA - Hook para Créditos de Mensajería
// ============================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { startOfMonth, endOfMonth } from 'date-fns';

interface MessagingCredits {
  id: string;
  tenant_id: string;
  balance_usd: number;
  total_purchased_usd: number;
  total_consumed_usd: number;
  created_at: string;
  updated_at: string;
}

interface MessagingTransaction {
  id: string;
  tenant_id: string;
  type: 'deposit' | 'consumption' | 'refund' | 'bonus';
  amount_usd: number;
  balance_after: number;
  message_count: number | null;
  message_type: string | null;
  template_id: string | null;
  campaign_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface MonthlyStats {
  marketing: { count: number; cost: number };
  utility: { count: number; cost: number };
  authentication: { count: number; cost: number };
  service: { count: number; cost: number };
  totalSpent: number;
  totalMessages: number;
}

export function useMessagingCredits() {
  const { tenantId } = useEffectiveTenant();

  // Query para obtener el balance actual
  const { 
    data: credits, 
    isLoading: isLoadingCredits,
    refetch: refetchCredits 
  } = useQuery({
    queryKey: ['messaging-credits', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('tenant_messaging_credits')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) {
        console.error('[useMessagingCredits] Error fetching credits:', error);
        throw error;
      }
      
      return data as MessagingCredits | null;
    },
    enabled: !!tenantId,
  });

  // Query para historial de transacciones
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ['messaging-transactions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('messaging_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('[useMessagingCredits] Error fetching transactions:', error);
        throw error;
      }
      
      return (data || []) as MessagingTransaction[];
    },
    enabled: !!tenantId,
  });

  // Query para estadísticas del mes actual
  const { 
    data: monthlyStats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ['messaging-monthly-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      
      const { data, error } = await supabase
        .from('messaging_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'consumption')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      
      if (error) {
        console.error('[useMessagingCredits] Error fetching monthly stats:', error);
        throw error;
      }
      
      const stats: MonthlyStats = {
        marketing: { count: 0, cost: 0 },
        utility: { count: 0, cost: 0 },
        authentication: { count: 0, cost: 0 },
        service: { count: 0, cost: 0 },
        totalSpent: 0,
        totalMessages: 0,
      };
      
      (data || []).forEach((tx) => {
        const msgType = (tx.message_type || 'marketing') as keyof typeof stats;
        if (msgType in stats && msgType !== 'totalSpent' && msgType !== 'totalMessages') {
          const category = stats[msgType] as { count: number; cost: number };
          category.count += tx.message_count || 0;
          category.cost += Math.abs(tx.amount_usd);
        }
        stats.totalSpent += Math.abs(tx.amount_usd);
        stats.totalMessages += tx.message_count || 0;
      });
      
      return stats;
    },
    enabled: !!tenantId,
  });

  const refetchAll = () => {
    refetchCredits();
    refetchTransactions();
  };

  return {
    // Balance
    balance: credits?.balance_usd ?? 0,
    totalPurchased: credits?.total_purchased_usd ?? 0,
    totalConsumed: credits?.total_consumed_usd ?? 0,
    credits,
    
    // Transacciones
    transactions: transactions ?? [],
    
    // Estadísticas mensuales
    monthlyStats,
    
    // Estados de carga
    isLoading: isLoadingCredits || isLoadingTransactions,
    isLoadingCredits,
    isLoadingTransactions,
    isLoadingStats,
    
    // Refetch
    refetchCredits,
    refetchTransactions,
    refetchAll,
  };
}
