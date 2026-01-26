// ============================================
// VEXA - Contador Centralizado de Conversaciones
// ============================================
// FUENTE DE VERDAD para el conteo de conversaciones y mensajes.
// Usado por: Dashboard, Facturación, Métricas, Admin
// 
// IMPORTANTE: Este archivo define la lógica ÚNICA de conteo.
// Cualquier cambio aquí afecta todo el sistema de facturación.
// ============================================

import { externalSupabase } from '@/integrations/supabase/external-client';

export interface ConversationCount {
  // Conteo principal
  totalConversations: number;  // Sesiones únicas
  totalMessages: number;       // Total de mensajes
  avgMessagesPerConversation: number;
  
  // Por clasificación (funnel)
  byStage: {
    tofu: number;      // 1-6 mensajes (sin respuesta / bajo interés)
    mofu: number;      // 7-10 mensajes (en progreso)
    hotLeads: number;  // 11+ mensajes (alta intención)
  };
  
  // Datos crudos para debug
  rawSessionIds: string[];
}

export interface CounterOptions {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  // Si true, no aplica límite (para conteos de facturación)
  noLimit?: boolean;
}

/**
 * Clasificar una sesión según la cantidad de mensajes
 * - TOFU: 1-6 mensajes (leads fríos, sin engagement)
 * - MOFU: 7-10 mensajes (leads tibios, en progreso)
 * - HOT: 11+ mensajes (leads calientes, alta intención)
 */
export function classifySession(messageCount: number): 'tofu' | 'mofu' | 'hot' {
  if (messageCount >= 11) return 'hot';
  if (messageCount >= 7) return 'mofu';
  return 'tofu';
}

/**
 * FUNCIÓN PRINCIPAL: Contar conversaciones únicas para un tenant
 * 
 * Esta es la ÚNICA función que debe usarse para contar conversaciones
 * en todo el sistema. Garantiza consistencia entre:
 * - Dashboard
 * - Facturación
 * - Métricas
 * - Panel Admin
 */
export async function countConversations(
  options: CounterOptions
): Promise<ConversationCount> {
  const { tenantId, startDate, endDate } = options;
  
  if (!tenantId) {
    return emptyCount();
  }

  try {
    // ============================================
    // QUERY SIMPLE - Misma lógica que la sección de Chats
    // 1 session_id único = 1 chat
    // ============================================
    // IMPORTANTE: Agregar límite alto para traer TODOS los mensajes
    // Supabase tiene un límite por defecto de 1000 filas
    const { data, error } = await externalSupabase
      .from('n8n_chat_histories')
      .select('session_id, created_at')
      .eq('tenant_id', tenantId)
      .limit(50000); // Límite alto para facturación/métricas

    if (error) {
      console.error('[countConversations] Error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return emptyCount();
    }

    // ============================================
    // FILTRAR POR FECHAS EN JAVASCRIPT (más confiable)
    // ============================================
    let filteredData = data;
    
    if (startDate || endDate) {
      filteredData = data.filter(row => {
        const rowDate = new Date(row.created_at);
        
        if (startDate && rowDate < startDate) {
          return false;
        }
        if (endDate) {
          // Incluir todo el día final
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (rowDate > endOfDay) {
            return false;
          }
        }
        return true;
      });
    }

    // ============================================
    // CONTEO SIMPLE:
    // - Total mensajes = cantidad de filas filtradas
    // - Total chats = session_ids únicos en esas filas
    // ============================================
    const totalMessages = filteredData.length;
    
    // Contar session_ids únicos
    const sessionMessageCounts = new Map<string, number>();
    filteredData.forEach(row => {
      const count = sessionMessageCounts.get(row.session_id) || 0;
      sessionMessageCounts.set(row.session_id, count + 1);
    });
    
    const totalConversations = sessionMessageCounts.size;
    
    console.log('[countConversations] ✓ Counted:', {
      tenantId,
      totalMessages,
      totalConversations,
      dateRange: startDate && endDate 
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'ALL TIME',
      rawDataCount: data.length,
      filteredCount: filteredData.length,
    });

    // Clasificar cada sesión para el funnel
    const byStage = { tofu: 0, mofu: 0, hotLeads: 0 };
    sessionMessageCounts.forEach((msgCount) => {
      const stage = classifySession(msgCount);
      if (stage === 'tofu') byStage.tofu++;
      else if (stage === 'mofu') byStage.mofu++;
      else if (stage === 'hot') byStage.hotLeads++;
    });

    const avgMessagesPerConversation = totalConversations > 0
      ? Math.round((totalMessages / totalConversations) * 10) / 10
      : 0;

    return {
      totalConversations,
      totalMessages,
      avgMessagesPerConversation,
      byStage,
      rawSessionIds: Array.from(sessionMessageCounts.keys()),
    };
  } catch (err) {
    console.error('[countConversations] Error:', err);
    throw err;
  }
}

/**
 * Calcula el período de facturación basado en la fecha de inicio (creación del tenant).
 * Los períodos son ciclos mensuales desde la fecha de inicio.
 * Ejemplo: Si createdAt es 15 enero, los períodos son 15 ene - 14 feb, 15 feb - 14 mar, etc.
 */
export function calculateBillingPeriodFromDate(startDate: Date): { periodStart: Date; periodEnd: Date } {
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
 * Contar conversaciones para el período de facturación actual
 * @param tenantId - ID del tenant
 * @param periodStart - Inicio del período (opcional, se calcula si no se proporciona)
 * @param periodEnd - Fin del período (opcional, se calcula si no se proporciona)
 * @param tenantCreatedAt - Fecha de creación del tenant para calcular el período (opcional)
 */
export async function countConversationsForBillingPeriod(
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date,
  tenantCreatedAt?: Date
): Promise<ConversationCount> {
  let start: Date;
  let end: Date;

  if (periodStart && periodEnd) {
    // Si se proporcionan fechas explícitas, usarlas
    start = periodStart;
    end = periodEnd;
  } else if (tenantCreatedAt) {
    // Si se proporciona fecha de creación, calcular el período basado en ella
    const calculated = calculateBillingPeriodFromDate(tenantCreatedAt);
    start = calculated.periodStart;
    end = calculated.periodEnd;
  } else {
    // Fallback: usar el mes actual
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return countConversations({
    tenantId,
    startDate: start,
    endDate: end,
    noLimit: true, // Para facturación, necesitamos el conteo EXACTO
  });
}

/**
 * Retornar conteo vacío
 */
function emptyCount(): ConversationCount {
  return {
    totalConversations: 0,
    totalMessages: 0,
    avgMessagesPerConversation: 0,
    byStage: { tofu: 0, mofu: 0, hotLeads: 0 },
    rawSessionIds: [],
  };
}

