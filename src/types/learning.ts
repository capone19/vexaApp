export type Outcome = 'won' | 'lost' | 'open' | 'no_intent' | 'ghosted' | 'committed';
export type OutcomeSignal = 'hard' | 'inferred';
export type FindingType = 'objection' | 'faq' | 'friction' | 'positive' | 'lost_reason';
export type ExperimentStatus =
  | 'proposed' | 'approved' | 'applied' | 'measuring'
  | 'kept' | 'reverted' | 'rejected' | 'inconclusive';

/** KPIs de portada. Una fila por tenant. */
export interface DashboardSummary {
  tenant_id: string;
  enabled: boolean;
  autonomy_level: string;
  analyzed_7d: number;
  analyzed_total: number;
  conversion_rate_last_week: number | null;
  conversion_rate_prev_week: number | null;
  pending_proposals: number;
  experiments_running: number;
  experiments_kept: number;
  experiments_reverted: number;
  /** OJO: la vista lo calcula con flow='L1_extractor'. El worker escribe
   *  'L1_extractor_local', asi que aca casi siempre viene null. Para el badge
   *  de "ultima extraccion" usamos useUltimaCorrida(), que lee run_log. */
  last_extraction_at: string | null;
}

export interface MetricsPeriod {
  id: string;
  tenant_id: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  conversations_analyzed: number;
  won_count: number;
  lost_count: number;
  open_count: number;
  no_intent_count: number;
  ghosted_count: number;
  committed_count: number;
  conversion_rate: number | null;
  close_rate: number | null;
  hard_signal_rate: number | null;
  handoff_rate: number | null;
  avg_messages: number;
  avg_messages_to_won: number;
  objection_count: number;
  friction_count: number;
  unresolved_objection_rate: number | null;
  computed_at: string;
}

export interface WeeklyFinding {
  tenant_id: string;
  week_start: string;
  finding_type: FindingType;
  taxonomy_code: string;
  label: string;
  target_section: string | null;
  total: number;
  resolved: number;
  unresolved: number;
  avg_severity: number;
}

export interface SectionPressure {
  tenant_id: string;
  target_section: string;
  section_label: string;
  is_protected: boolean;
  last_7d: number;
  last_30d: number;
  avg_severity_30d: number;
  frozen_until: string | null;
}

export interface ExperimentTimelineItem {
  id: string;
  tenant_id: string;
  target_section: string;
  section_label: string;
  hypothesis: string;
  target_metric: string;
  target_direction: 'increase' | 'decrease';
  status: ExperimentStatus;
  applied_at: string | null;
  freeze_until: string | null;
  evaluated_at: string | null;
  verdict: string | null;
  delta: number | null;
  verdict_note: string | null;
  decided_by: string | null;
  chars_before: number | null;
  chars_after: number | null;
}

export interface ExperimentEvidence {
  codes?: string[];
  counts?: Record<string, number>;
  verbatims?: string[];
}

export interface Experiment {
  id: string;
  tenant_id: string;
  target_section: string;
  hypothesis: string;
  rationale: string | null;
  evidence: ExperimentEvidence | null;
  target_metric: string;
  target_direction: 'increase' | 'decrease';
  baseline: Record<string, unknown> | null;
  prompt_before: string | null;
  prompt_after: string | null;
  settings_section_key: string | null;
  target_field: string | null;
  field_op: 'set' | 'add' | 'edit' | 'remove' | null;
  value_before: unknown | null;
  value_after: unknown | null;
  status: ExperimentStatus;
  proposed_at: string;
  approved_at: string | null;
  applied_at: string | null;
  freeze_until: string | null;
  evaluated_at: string | null;
  result: Record<string, unknown> | null;
  verdict_note: string | null;
  decided_by: string | null;
  reverted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationAnalysis {
  id: string;
  tenant_id: string;
  channel: string;
  session_id: string;
  period_date: string;
  first_message_at: string;
  last_message_at: string;
  analyzed_at: string;
  message_count: number;
  client_message_count: number;
  outcome: Outcome;
  outcome_confidence: number;
  outcome_evidence: string | null;
  outcome_signal: OutcomeSignal;
  funnel_reached: string | null;
  drop_off_point: string | null;
  handoff_happened: boolean;
  summary: string | null;
  model_used: string | null;
  is_latest: boolean;
}

export interface Finding {
  id: string;
  analysis_id: string;
  tenant_id: string;
  period_date: string;
  finding_type: FindingType;
  taxonomy_code: string;
  target_section: string | null;
  verbatim: string;
  severity: number;
  resolved_by_bot: boolean | null;
  created_at: string;
}

export interface LearningReport {
  id: string;
  tenant_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  title: string;
  html_content: string | null;
  summary: Record<string, unknown> | null;
  created_at: string;
}

export interface RunLogEntry {
  id: number;
  tenant_id: string;
  flow: string;
  status: string;
  items_in: number | null;
  items_ok: number | null;
  items_failed: number | null;
  message: string | null;
  created_at: string;
}

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  objection: 'Objeción',
  faq: 'Pregunta',
  friction: 'Fricción',
  positive: 'Positivo',
  lost_reason: 'Motivo de pérdida',
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  won: 'Ganada',
  lost: 'Perdida',
  open: 'Abierta',
  no_intent: 'Sin intención',
  ghosted: 'Se fue sin responder',
  committed: 'Se comprometió',
};
