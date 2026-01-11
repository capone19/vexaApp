// ============================================
// VEXA - Plan Management System
// ============================================

export type PlanId = 'basic' | 'pro' | 'enterprise';

const PLAN_STORAGE_KEY = 'vexa_current_plan';
const PLAN_CHANGED_EVENT = 'plan-changed';

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
