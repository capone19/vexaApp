// ============================================
// VEXA - Plan Management System
// ============================================

export type PlanId = 'basic' | 'pro' | 'enterprise';

const PLAN_STORAGE_KEY = 'vexa_current_plan';
const PLAN_CHANGED_EVENT = 'plan-changed';

// ============================================
// LÍMITES DE CONVERSACIONES POR PLAN
// ============================================
export const PLAN_CONVERSATION_LIMITS: Record<PlanId, number> = {
  basic: 300,
  pro: 1000,
  enterprise: 4000,
};

// Precio por conversación adicional (USD)
export const EXTRA_CONVERSATION_PRICE = 0.30;

// Número de WhatsApp permitidos por plan
export const PLAN_WHATSAPP_LIMITS: Record<PlanId, number | 'unlimited'> = {
  basic: 1,
  pro: 3,
  enterprise: 'unlimited',
};

// Campañas disponibles por plan
export const PLAN_CAMPAIGNS_ENABLED: Record<PlanId, boolean> = {
  basic: false,
  pro: true,
  enterprise: true,
};

/**
 * Obtiene el límite de conversaciones para un plan
 */
export function getConversationLimit(plan: PlanId): number {
  return PLAN_CONVERSATION_LIMITS[plan] || PLAN_CONVERSATION_LIMITS.basic;
}

/**
 * Obtiene el límite de WhatsApp para un plan
 */
export function getWhatsAppLimit(plan: PlanId): number | 'unlimited' {
  return PLAN_WHATSAPP_LIMITS[plan] || PLAN_WHATSAPP_LIMITS.basic;
}

/**
 * Verifica si las campañas están habilitadas para un plan
 */
export function hasCampaignsEnabled(plan: PlanId): boolean {
  return PLAN_CAMPAIGNS_ENABLED[plan] || false;
}

// Plan features mapping
export const planFeatures: Record<PlanId, {
  hasReports: boolean;
  hasMarketing: boolean;
  hasAdvancedMetrics: boolean;
  hasScheduledReports: boolean;
  hasDataExport: boolean;
}> = {
  basic: {
    hasReports: false,
    hasMarketing: false,
    hasAdvancedMetrics: false,
    hasScheduledReports: false,
    hasDataExport: false,
  },
  pro: {
    hasReports: true,
    hasMarketing: true,
    hasAdvancedMetrics: true,
    hasScheduledReports: true,
    hasDataExport: true,
  },
  enterprise: {
    hasReports: true,
    hasMarketing: true,
    hasAdvancedMetrics: true,
    hasScheduledReports: true,
    hasDataExport: true,
  },
};

/**
 * Get the current plan from localStorage
 * Defaults to 'basic' if not set
 */
export function getCurrentPlan(): PlanId {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored && ['basic', 'pro', 'enterprise'].includes(stored)) {
      return stored as PlanId;
    }
  } catch (e) {
    console.error('Error reading plan from localStorage:', e);
  }
  return 'basic'; // Default plan
}

/**
 * Set the current plan in localStorage and dispatch event
 */
export function setCurrentPlan(plan: PlanId): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
    // Dispatch custom event to notify all components
    window.dispatchEvent(new CustomEvent(PLAN_CHANGED_EVENT, { detail: { plan } }));
  } catch (e) {
    console.error('Error saving plan to localStorage:', e);
  }
}

/**
 * Check if a feature is available based on current plan
 */
export function hasFeature(feature: keyof typeof planFeatures['basic']): boolean {
  const plan = getCurrentPlan();
  return planFeatures[plan][feature];
}

/**
 * Check if user has premium plan (pro or enterprise)
 */
export function isPremiumPlan(): boolean {
  const plan = getCurrentPlan();
  return plan === 'pro' || plan === 'enterprise';
}

/**
 * Subscribe to plan changes
 * Returns unsubscribe function
 */
export function onPlanChange(callback: (plan: PlanId) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ plan: PlanId }>;
    callback(customEvent.detail.plan);
  };
  
  window.addEventListener(PLAN_CHANGED_EVENT, handler);
  
  return () => {
    window.removeEventListener(PLAN_CHANGED_EVENT, handler);
  };
}
