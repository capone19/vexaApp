// ============================================
// VEXA - Default Data for New Clients
// Data should come from Supabase, these are empty defaults
// ============================================

import type {
  Client,
  User,
  Chat,
  Message,
  Appointment,
  DashboardMetrics,
  Template,
  BillingInfo,
  AgentSettings,
  FunnelStage,
  Channel,
  ChatStatus,
  AppointmentStatus,
  AppointmentSource,
} from '../types';

// Current Client (Tenant) - Empty default
export const mockClient: Client = {
  id: '',
  name: '',
  plan: 'pro', // Default plan Pro as requested
  timezone: 'America/Santiago',
  createdAt: new Date(),
};

// Current User - Empty default
export const mockUser: User = {
  id: '',
  name: '',
  email: '',
  avatar: undefined,
  role: 'admin',
  clientId: '',
};

// Dashboard Metrics - Empty defaults (zeros)
export const mockDashboardMetrics: DashboardMetrics = {
  totalChats: 0,
  totalMessages: 0,
  avgMessagesPerChat: 0,
  botResponseRate: 0,
  avgFirstResponseTime: 0,
  avgConversionTime: 0,
  servicesBooked: 0,
  revenue: 0,
  funnel: {
    tofu: 0,
    mofu: 0,
    hotLeads: 0,
    bofu: 0,
    deadRate: 0,
    warmRate: 0,
    hotRate: 0,
    conversionRate: 0,
  },
};

// Mock Chats - Empty array (data comes from Supabase)
export const mockChats: Chat[] = [];

// Mock Appointments - Empty array (data comes from Supabase)
export const mockAppointments: Appointment[] = [];

// Mock Templates - Empty array
export const mockTemplates: Template[] = [];

// Mock Billing - Default Pro plan
export const mockBilling: BillingInfo = {
  plan: 'pro',
  status: 'active',
  nextBillingDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })(),
  amount: 199,
  currency: 'USD',
  history: [],
};

// Default empty schedule
const emptySchedule = [
  { day: 'lunes' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'martes' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'miercoles' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'jueves' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'viernes' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'sabado' as const, enabled: false, startTime: '', endTime: '' },
  { day: 'domingo' as const, enabled: false, startTime: '', endTime: '' },
];

// Mock Agent Settings - Empty defaults
export const mockAgentSettings: AgentSettings = {
  personality: {
    formality: 'neutral',
    empathy: 'media',
    humor: 'ausente',
    emojis: 'ocasional',
    responseLength: 'media',
    primaryObjective: 'agendar',
    salesFlowSteps: [],
    customInstructions: [],
    lastModified: new Date(),
  },
  business: {
    description: '',
    hasPhysicalStore: false,
    locations: [],
    phoneNumbers: [],
    socialLinks: {
      instagram: '',
      facebook: '',
      tiktok: '',
      linkedin: '',
      youtube: '',
      twitter: '',
    },
    website: '',
    serviceCoverage: [],
    coverageZones: '',
    idealClientTypes: [],
    valueProposition: '',
    customInstructions: [],
    lastModified: new Date(),
  },
  policies: {
    generalPolicies: '',
    guarantees: '',
    customInstructions: [],
    lastModified: new Date(),
  },
  services: {
    modality: 'presencial',
    schedule: emptySchedule,
    requirements: [],
    services: [],
    pricingType: 'fijo',
    pricingNote: '',
    customInstructions: [],
    lastModified: new Date(),
  },
  rescheduling: {
    allowRescheduling: true,
    reschedulingDeadline: 24,
    reschedulingConditions: '',
    allowCancellation: true,
    cancellationDeadline: 24,
    cancellationPenalty: 0,
    refundApplies: false,
    refundConditions: '',
    customInstructions: [],
    lastModified: new Date(),
  },
  payments: {
    methods: [
      { type: 'transferencia', enabled: false, details: '' },
      { type: 'tarjeta', enabled: false },
      { type: 'efectivo', enabled: false },
      { type: 'qr', enabled: false },
      { type: 'link', enabled: false, details: '' },
      { type: 'otro', enabled: false },
    ],
    restrictions: [],
    instructions: '',
    requiresDeposit: false,
    depositPercentage: 0,
    customInstructions: [],
    lastModified: new Date(),
  },
  intervention: {
    enabled: false,
    conditions: [],
    customRules: '',
    unqualifiedLeadHandling: 'responder_cerrar',
    customInstructions: [],
    lastModified: new Date(),
  },
  faq: {
    items: [],
    customInstructions: [],
    lastModified: new Date(),
  },
  limits: {
    prohibitedTopics: [],
    prohibitedPromises: '',
    sensitiveInfo: {
      enabled: false,
      description: '',
    },
    avoidedLanguage: [],
    prohibitedTopicAction: 'redirigir',
    customInstructions: [],
    lastModified: new Date(),
  },
};

// ============================================
// API Functions - Return empty data or fetch from Supabase
// ============================================

export async function fetchDashboardData(dateRange?: string): Promise<DashboardMetrics> {
  // Returns empty metrics - real data comes from Dashboard component
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockDashboardMetrics;
}

export async function fetchChats(): Promise<Chat[]> {
  // Returns empty array - real data comes from Supabase
  await new Promise(resolve => setTimeout(resolve, 100));
  return [];
}

export async function fetchChat(chatId: string): Promise<Chat | undefined> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return undefined;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  // Returns empty array - real data comes from Supabase
  await new Promise(resolve => setTimeout(resolve, 100));
  return [];
}

export async function fetchTemplates(): Promise<Template[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [];
}

export async function fetchBillingInfo(): Promise<BillingInfo> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockBilling;
}

export async function fetchAgentSettings(): Promise<AgentSettings> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockAgentSettings;
}

/**
 * Returns empty services - real data comes from Supabase agent_settings_ui
 */
export function getAvailableServices(): string[] {
  return [];
}

export async function fetchAvailableServices(): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [];
}

export async function updateAgentSettingsSection<K extends keyof AgentSettings>(
  section: K,
  data: Partial<AgentSettings[K]>
): Promise<AgentSettings[K]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`Updating ${section}:`, data);
  return { ...mockAgentSettings[section], ...data, lastModified: new Date() } as AgentSettings[K];
}

export async function markHumanIntervention(chatId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`Marked human intervention for chat: ${chatId}`);
}
