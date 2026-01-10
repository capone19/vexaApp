import { supabase } from '@/integrations/supabase/client';
import {
  generatePersonalityPrompt,
  generateBusinessPrompt,
  generatePoliciesPrompt,
  generateServicesPrompt,
  generateReschedulingPrompt,
  generatePaymentsPrompt,
  generateHandoverPrompt,
  generateFAQPrompt,
  generateLimitsPrompt,
  type PersonalityData,
  type BusinessData,
  type PoliciesData,
  type ServicesConfigData,
  type ReschedulingData,
  type PaymentsData,
  type HandoverData,
  type FAQData,
  type LimitsData,
} from '@/lib/prompt-generators';

type SectionType = 
  | 'personality'
  | 'business'
  | 'policies'
  | 'services'
  | 'rescheduling'
  | 'payments'
  | 'handover'
  | 'faq'
  | 'limits';

interface SaveSettingsResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Generic function to save agent settings
 * Generates the prompt and sends to edge function
 */
async function saveAgentSettings(
  tenantId: string,
  section: SectionType,
  data: unknown,
  generatedPrompt: string
): Promise<SaveSettingsResult> {
  try {
    const { data: result, error } = await supabase.functions.invoke('save-agent-settings', {
      body: {
        tenant_id: tenantId,
        section,
        data,
        generated_prompt: generatedPrompt,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: result?.message };
  } catch (err) {
    console.error('Save settings error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// SECTION-SPECIFIC SAVE FUNCTIONS
// ============================================

export async function savePersonalitySettings(
  tenantId: string,
  data: PersonalityData
): Promise<SaveSettingsResult> {
  const prompt = generatePersonalityPrompt(data);
  return saveAgentSettings(tenantId, 'personality', data, prompt);
}

export async function saveBusinessSettings(
  tenantId: string,
  data: BusinessData
): Promise<SaveSettingsResult> {
  const prompt = generateBusinessPrompt(data);
  return saveAgentSettings(tenantId, 'business', data, prompt);
}

export async function savePoliciesSettings(
  tenantId: string,
  data: PoliciesData
): Promise<SaveSettingsResult> {
  const prompt = generatePoliciesPrompt(data);
  return saveAgentSettings(tenantId, 'policies', data, prompt);
}

export async function saveServicesSettings(
  tenantId: string,
  data: ServicesConfigData
): Promise<SaveSettingsResult> {
  const prompt = generateServicesPrompt(data);
  return saveAgentSettings(tenantId, 'services', data, prompt);
}

export async function saveReschedulingSettings(
  tenantId: string,
  data: ReschedulingData
): Promise<SaveSettingsResult> {
  const prompt = generateReschedulingPrompt(data);
  return saveAgentSettings(tenantId, 'rescheduling', data, prompt);
}

export async function savePaymentsSettings(
  tenantId: string,
  data: PaymentsData
): Promise<SaveSettingsResult> {
  const prompt = generatePaymentsPrompt(data);
  return saveAgentSettings(tenantId, 'payments', data, prompt);
}

export async function saveHandoverSettings(
  tenantId: string,
  data: HandoverData
): Promise<SaveSettingsResult> {
  const prompt = generateHandoverPrompt(data);
  return saveAgentSettings(tenantId, 'handover', data, prompt);
}

export async function saveFAQSettings(
  tenantId: string,
  data: FAQData
): Promise<SaveSettingsResult> {
  const prompt = generateFAQPrompt(data);
  return saveAgentSettings(tenantId, 'faq', data, prompt);
}

export async function saveLimitsSettings(
  tenantId: string,
  data: LimitsData
): Promise<SaveSettingsResult> {
  const prompt = generateLimitsPrompt(data);
  return saveAgentSettings(tenantId, 'limits', data, prompt);
}
