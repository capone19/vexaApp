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

/** Clave estable para React Query: mismo rango = misma caché (dedupe Dashboard / facturación). */
export function getConversationCountQueryKey(
  tenantId: string,
  startDate?: Date | null,
  endDate?: Date | null
) {
  return [
    'conversation-count',
    tenantId,
    startDate != null ? startDate.getTime() : 'all',
    endDate != null ? endDate.getTime() : 'all',
  ] as const;
}

/**
 * Añade filtro de fechas a la query PostgREST (alinea con el filtrado en JS que había antes).
 * Sin fechas, no se aplica límite en SQL (conteo histórico completo).
 */
function applyCreatedAtRangeToQuery(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  baseQuery: any,
  startDate?: Date,
  endDate?: Date
) {
  let q = baseQuery;
  if (startDate) {
    q = q.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    const endOfEndDay = new Date(endDate);
    endOfEndDay.setHours(23, 59, 59, 999);
    q = q.lte('created_at', endOfEndDay.toISOString());
  }
  return q;
}

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
 * Clasificar una sesión según la cantidad de mensajes en el período analizado.
 * Debe coincidir con los rangos documentados en ConversationCount.byStage.
 *
 * - TOFU: 1-6 mensajes (leads fríos, poco engagement)
 * - MOFU: 7-10 mensajes (en progreso)
 * - HOT: 11+ mensajes (alta intención)
 *
 * Nota: messageCount 0 no debería aparecer (solo sesiones con ≥1 fila en n8n_chat_histories);
 * se clasifica como TOFU por seguridad.
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

  const hasDateRange = Boolean(startDate || endDate);

  try {
    // ============================================
    // PAGINACIÓN - Lotes de 1000. Con rango de fechas, el filtro va en SQL (índice friendly).
    // Sin rango, se escanea el historial completo del tenant (hasta límite de seguridad).
    // ============================================
    const PAGE_SIZE = 1000;
    const maxRows = options.noLimit ? 1_000_000 : 100_000;
    let allData: Array<{ session_id: string; created_at: string }> = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const base = externalSupabase
        .from('n8n_chat_histories')
        .select('session_id, created_at')
        .eq('tenant_id', tenantId);
      const filtered = applyCreatedAtRangeToQuery(base, startDate, endDate);
      const { data, error } = await filtered
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('[countConversations] Error fetching page:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        offset += data.length;

        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      if (offset >= maxRows) {
        console.warn('[countConversations] Hit safety limit of', maxRows, 'messages');
        hasMore = false;
      }
    }

    console.log('[countConversations] Fetched total rows:', allData.length);

    if (allData.length === 0) {
      return emptyCount();
    }

    // Con filtro en SQL, no hace falta re-filtrar. Sin rango, no se filtró.
    const filteredData = allData;

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
      dateRange: hasDateRange
        ? `${startDate?.toISOString().split('T')[0] ?? '?'} to ${endDate?.toISOString().split('T')[0] ?? '?'}`
        : 'ALL TIME',
      rowCount: filteredData.length,
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

