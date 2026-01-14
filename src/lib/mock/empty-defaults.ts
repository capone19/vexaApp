// ============================================
// VEXA - Empty Defaults for New Clients
// ============================================
// Estos son los valores por defecto para un cliente nuevo
// sin ninguna configuración previa

import type { AgentSettings, DaySchedule, Service } from '../types';

// Default schedule (all days disabled)
const emptySchedule: DaySchedule[] = [
  { day: 'lunes', enabled: false, startTime: '09:00', endTime: '18:00' },
  { day: 'martes', enabled: false, startTime: '09:00', endTime: '18:00' },
  { day: 'miercoles', enabled: false, startTime: '09:00', endTime: '18:00' },
  { day: 'jueves', enabled: false, startTime: '09:00', endTime: '18:00' },
  { day: 'viernes', enabled: false, startTime: '09:00', endTime: '18:00' },
  { day: 'sabado', enabled: false, startTime: '09:00', endTime: '13:00' },
  { day: 'domingo', enabled: false, startTime: '00:00', endTime: '00:00' },
];

// Empty Agent Settings for new client
export const emptyAgentSettings: AgentSettings = {
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
      { type: 'efectivo', enabled: false, details: '' },
      { type: 'transferencia', enabled: false, details: '' },
      { type: 'qr', enabled: false, details: '' },
      { type: 'tarjeta', enabled: false, details: '' },
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
    conditions: [
      { id: 'precio', label: 'Cliente pregunta por precio no listado', enabled: false },
      { id: 'queja', label: 'Cliente expresa queja o insatisfacción', enabled: false },
      { id: 'urgente', label: 'Solicitud urgente o especial', enabled: false },
      { id: 'datos', label: 'Cliente solicita datos sensibles', enabled: false },
    ],
    customRules: '',
    unqualifiedLeadHandling: 'finalizar_educadamente',
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

// Helper function to get empty settings with fresh dates
export function getEmptyAgentSettings(): AgentSettings {
  const now = new Date();
  return {
    ...emptyAgentSettings,
    personality: { ...emptyAgentSettings.personality, lastModified: now },
    business: { ...emptyAgentSettings.business, lastModified: now },
    policies: { ...emptyAgentSettings.policies, lastModified: now },
    services: { ...emptyAgentSettings.services, lastModified: now },
    rescheduling: { ...emptyAgentSettings.rescheduling, lastModified: now },
    payments: { ...emptyAgentSettings.payments, lastModified: now },
    intervention: { ...emptyAgentSettings.intervention, lastModified: now },
    faq: { ...emptyAgentSettings.faq, lastModified: now },
    limits: { ...emptyAgentSettings.limits, lastModified: now },
  };
}

