import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';
import type {
  ConversationAnalysis, DashboardSummary, Experiment, ExperimentTimelineItem,
  Finding, FindingType, LearningReport, MetricsPeriod, Outcome,
  RunLogEntry, SectionPressure, WeeklyFinding,
} from '@/types/learning';

// El cliente esta tipado con el `Database` generado, que no incluye el schema
// `learning`. Se castea una sola vez aca para no esparcir casts por los hooks.
const db = () => (supabase as unknown as SupabaseClient).schema('learning');

const STALE = 1000 * 60 * 2;

function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function useLearningSummary() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'summary', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<DashboardSummary | null> => {
      const { data, error } = await db()
        .from('v_dashboard_summary').select('*')
        .eq('tenant_id', tenantId).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as DashboardSummary) ?? null;
    },
  });
}

/**
 * Ultima corrida del extractor. No usamos v_dashboard_summary.last_extraction_at
 * porque esa vista filtra flow='L1_extractor' y el worker escribe
 * 'L1_extractor_local': el campo viene siempre null.
 */
export function useUltimaCorrida() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'ultima-corrida', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<RunLogEntry | null> => {
      const { data, error } = await db()
        .from('run_log').select('*')
        .eq('tenant_id', tenantId)
        .like('flow', 'L1%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw new Error(error.message);
      return ((data as RunLogEntry[]) ?? [])[0] ?? null;
    },
  });
}

export function useMetricsSemanales(semanas = 12) {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'metrics-semanales', tenantId, semanas],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<MetricsPeriod[]> => {
      const { data, error } = await db()
        .from('metrics_period').select('*')
        .eq('tenant_id', tenantId)
        .eq('period_type', 'weekly')
        .order('period_start', { ascending: false })
        .limit(semanas);
      if (error) throw new Error(error.message);
      // Vuelven de mas nueva a mas vieja; el grafico las quiere al reves.
      return ((data as MetricsPeriod[]) ?? []).slice().reverse();
    },
  });
}

export function useHallazgos(dias: number, tipo: FindingType | 'todos') {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'hallazgos', tenantId, dias, tipo],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<WeeklyFinding[]> => {
      let q = db()
        .from('v_weekly_findings').select('*')
        .eq('tenant_id', tenantId)
        .gte('week_start', diasAtras(dias));
      if (tipo !== 'todos') q = q.eq('finding_type', tipo);
      const { data, error } = await q.order('total', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as WeeklyFinding[]) ?? [];
    },
  });
}

export function useSectionPressure() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'section-pressure', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<SectionPressure[]> => {
      const { data, error } = await db()
        .from('v_section_pressure').select('*')
        .eq('tenant_id', tenantId)
        .order('last_30d', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as SectionPressure[]) ?? [];
    },
  });
}

/** Las citas textuales de un codigo. Es lo que hace creible el dato. */
export function useVerbatims(code: string | null, dias: number) {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'verbatims', tenantId, code, dias],
    enabled: !!tenantId && !!code,
    staleTime: STALE,
    queryFn: async (): Promise<Finding[]> => {
      const { data, error } = await db()
        .from('findings').select('*')
        .eq('tenant_id', tenantId)
        .eq('taxonomy_code', code)
        .gte('period_date', diasAtras(dias))
        .order('severity', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data as Finding[]) ?? [];
    },
  });
}

export function useExperimentos() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'experimentos', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await db()
        .from('experiments').select('*')
        .eq('tenant_id', tenantId)
        .order('proposed_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data as Experiment[]) ?? [];
    },
  });
}

/** Solo para marcar en el grafico cuando se aplico cada cambio. */
export function useExperimentosTimeline() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'experimentos-timeline', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<ExperimentTimelineItem[]> => {
      const { data, error } = await db()
        .from('v_experiments_timeline').select('*')
        .eq('tenant_id', tenantId)
        .not('applied_at', 'is', null)
        .order('applied_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as ExperimentTimelineItem[]) ?? [];
    },
  });
}

const PAGINA = 25;

export function useConversaciones(pagina: number, outcome: Outcome | 'todos') {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'conversaciones', tenantId, pagina, outcome],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<{ filas: ConversationAnalysis[]; total: number }> => {
      let q = db()
        .from('conversation_analysis')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_latest', true);
      if (outcome !== 'todos') q = q.eq('outcome', outcome);
      const desde = pagina * PAGINA;
      const { data, error, count } = await q
        .order('last_message_at', { ascending: false })
        .range(desde, desde + PAGINA - 1);
      if (error) throw new Error(error.message);
      return { filas: (data as ConversationAnalysis[]) ?? [], total: count ?? 0 };
    },
  });
}

export const CONVERSACIONES_POR_PAGINA = PAGINA;

/** Hallazgos de UNA conversacion, para el panel de detalle. */
export function useHallazgosDeConversacion(analysisId: string | null) {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'hallazgos-conv', tenantId, analysisId],
    enabled: !!tenantId && !!analysisId,
    staleTime: STALE,
    queryFn: async (): Promise<Finding[]> => {
      const { data, error } = await db()
        .from('findings').select('*')
        .eq('tenant_id', tenantId)
        .eq('analysis_id', analysisId)
        .order('severity', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as Finding[]) ?? [];
    },
  });
}

export function useReportes() {
  const { tenantId } = useEffectiveTenant();
  return useQuery({
    queryKey: ['learning', 'reportes', tenantId],
    enabled: !!tenantId,
    staleTime: STALE,
    queryFn: async (): Promise<LearningReport[]> => {
      const { data, error } = await db()
        .from('reports').select('*')
        .eq('tenant_id', tenantId)
        .order('period_end', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data as LearningReport[]) ?? [];
    },
  });
}

type GateAction = 'approve' | 'reject' | 'revert';

/**
 * Aprobar / rechazar / revertir. Nunca escribe desde el cliente: invoca
 * `learning-gate`, que verifica el JWT del lado del servidor.
 */
export function useLearningGate() {
  const { tenantId } = useEffectiveTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { action: GateAction; experiment_id: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('learning-gate', {
        body: { ...vars, tenant_id: tenantId },
      });
      if (error) throw new Error(error.message);
      const payload = data as { error?: string } | null;
      // El backend devuelve mensajes explicativos ("seccion congelada hasta el
      // 14-09"). Mostralos tal cual, no los tapes con un generico.
      if (payload?.error) throw new Error(payload.error);
      return payload;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['learning'] }); },
  });
}
