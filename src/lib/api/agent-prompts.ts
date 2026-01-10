import { supabase } from '@/integrations/supabase/client';

export type PromptColumn = 
  | 'prompt_personality'
  | 'prompt_business_context'
  | 'prompt_policies'
  | 'prompt_services'
  | 'prompt_rescheduling'
  | 'prompt_payments'
  | 'prompt_handover'
  | 'prompt_faq'
  | 'prompt_limits';

export interface AgentPrompts {
  id: string;
  tenant_id: string;
  prompt_personality: string | null;
  prompt_business_context: string | null;
  prompt_policies: string | null;
  prompt_services: string | null;
  prompt_rescheduling: string | null;
  prompt_payments: string | null;
  prompt_handover: string | null;
  prompt_faq: string | null;
  prompt_limits: string | null;
  updated_at: string;
}

/**
 * Fetches the agent prompts for the current user's tenant
 */
export async function getAgentPrompts(): Promise<AgentPrompts | null> {
  const { data, error } = await supabase
    .from('agent_prompts')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching agent prompts:', error);
    return null;
  }

  return data as AgentPrompts;
}

/**
 * Updates a single prompt column
 * Each section saves independently to its designated column
 */
export async function updatePromptColumn(
  tenantId: string,
  column: PromptColumn,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('agent_prompts')
    .update({ [column]: value })
    .eq('tenant_id', tenantId);

  if (error) {
    console.error(`Error updating ${column}:`, error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Batch update multiple columns at once (for migration or bulk operations)
 */
export async function updateMultiplePromptColumns(
  tenantId: string,
  updates: Partial<Record<PromptColumn, string>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('agent_prompts')
    .update(updates)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error updating prompts:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
