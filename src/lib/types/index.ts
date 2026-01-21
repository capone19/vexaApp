// ============================================
// VEXA - Type Definitions
// ============================================

// Client (Tenant)
export interface Client {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
  timezone: string;
  createdAt: Date;
}

// User
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'operator' | 'viewer';
  clientId: string;
}

// Custom Instructions (shared across sections)
export type InstructionPriority = 'alta' | 'media' | 'baja';

export interface CustomInstruction {
  id: string;
  instruction: string;
  priority: InstructionPriority;
}

// Sales Flow Step
export interface SalesFlowStep {
  id: string;
  order: number;
  instruction: string;
}

// Agent Settings
export interface AgentSettings {
  personality: PersonalitySettings;
  business: BusinessSettings;
  policies: PoliciesSettings;
  services: ServicesSettings;
  rescheduling: ReschedulingSettings;
  payments: PaymentSettings;
  intervention: InterventionSettings;
  faq: FAQSettings;
  limits: LimitsSettings;
}

export interface PersonalitySettings {
  formality: 'muy_informal' | 'informal' | 'neutral' | 'formal' | 'muy_formal';
  empathy: 'baja' | 'media' | 'alta';
  humor: 'ausente' | 'sutil' | 'moderado' | 'marcado';
  emojis: 'nunca' | 'ocasional' | 'frecuente';
  responseLength: 'corta' | 'media' | 'extensa';
  // Objective
  primaryObjective: 'agendar' | 'vender' | 'calificar' | 'informar' | 'mixto';
  // Sales flow steps
  salesFlowSteps?: SalesFlowStep[];
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface BusinessSettings {
  description: string;
  hasPhysicalStore: boolean;
  locations: Location[];
  phoneNumbers: string[];
  // Social links & website
  socialLinks: SocialLinks;
  website: string;
  // New fields
  serviceCoverage: ServiceCoverageType[];
  coverageZones: string;
  idealClientTypes: IdealClientType[];
  valueProposition: string;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

export type ServiceCoverageType = 'presencial_local' | 'domicilio' | 'online' | 'hibrido';
export type IdealClientType = 'personas_naturales' | 'empresas' | 'premium' | 'masivo' | 'urgente' | 'planificado';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  schedule: DaySchedule[];
}

export interface DaySchedule {
  day: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface PoliciesSettings {
  generalPolicies: string;
  guarantees: string;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface ServicesSettings {
  modality: 'online' | 'presencial' | 'mixta';
  schedule: DaySchedule[];
  requirements: string[];
  services: Service[];
  pricingType: 'fijo' | 'variable' | 'referencial';
  pricingNote?: string;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  currency: string;
  // New fields
  actionObjective: ServiceActionType;
  requiredData: RequiredDataType[];
  otherRequiredData?: string; // Custom field when 'otros' is selected
  capacityPerSlot?: number;
  noAvailabilityAction: NoAvailabilityActionType;
}

export type ServiceActionType = 'agendar' | 'cotizar' | 'informar' | 'derivar_humano';
export type RequiredDataType = 'nombre' | 'telefono' | 'email' | 'servicio' | 'fecha_preferida' | 'horario' | 'medio_pago' | 'observaciones' | 'otros';
export type NoAvailabilityActionType = 'lista_espera' | 'sugerir_horario' | 'derivar_humano' | 'solicitar_flexibilidad' | 'no_aplica';

export interface ReschedulingSettings {
  allowRescheduling: boolean;
  reschedulingDeadline: number; // hours before
  reschedulingConditions: string;
  allowCancellation: boolean;
  cancellationDeadline: number; // hours before
  cancellationPenalty: number; // percentage
  refundApplies: boolean;
  refundConditions: string;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface PaymentSettings {
  methods: PaymentMethod[];
  restrictions: PaymentRestriction[];
  instructions: string;
  // New fields
  requiresDeposit: boolean;
  depositPercentage: number;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface PaymentMethod {
  type: 'qr' | 'transferencia' | 'efectivo' | 'tarjeta' | 'link' | 'otro';
  enabled: boolean;
  details?: string;
}

export interface PaymentRestriction {
  serviceId: string;
  allowedMethods: string[];
}

export interface InterventionSettings {
  enabled: boolean;
  conditions: InterventionCondition[];
  customRules: string;
  // New field
  unqualifiedLeadHandling: UnqualifiedLeadHandlingType;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export type UnqualifiedLeadHandlingType = 'responder_cerrar' | 'ofrecer_alternativa' | 'derivar_humano' | 'finalizar_educadamente';

export interface InterventionCondition {
  id: string;
  label: string;
  enabled: boolean;
}

export interface FAQSettings {
  items: FAQItem[];
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface LimitsSettings {
  prohibitedTopics: string[];
  prohibitedPromises: string;
  sensitiveInfo: {
    enabled: boolean;
    description: string;
  };
  avoidedLanguage: string[];
  // New field
  prohibitedTopicAction: ProhibitedTopicActionType;
  customInstructions?: CustomInstruction[];
  lastModified: Date;
}

export type ProhibitedTopicActionType = 'redirigir' | 'responder_genericamente' | 'derivar_humano';

// Chat & Messages
export type FunnelStage = 'dead' | 'warm' | 'hot' | 'converted';
export type ChatStatus = 'active' | 'closed';
export type Channel = 'whatsapp';

export interface Chat {
  id: string;
  sessionId: string;
  userName: string;
  userPhone?: string;
  channel: Channel;
  status: ChatStatus;
  funnelStage: FunnelStage;
  lastMessageAt: Date;
  hasHumanIntervention: boolean;
  messages: Message[];
  tags?: string[];
  summary?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  sender: 'user' | 'bot' | 'human';
  timestamp: Date;
  read: boolean;
}

// Appointments
export type AppointmentStatus = 'confirmed' | 'pending' | 'canceled';
export type AppointmentSource = 'chat' | 'campaign' | 'direct' | 'referral';
export type AppointmentType = 'service' | 'product';

export interface Appointment {
  id: string;
  datetime: Date;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  service: string;
  source: AppointmentSource;
  sourceRaw?: string; // Valor original de la BD (ej: "Shopify", "chat", etc.)
  status: AppointmentStatus;
  notes?: string;
  chatId?: string;
  createdAt: Date;
  // Nuevos campos para diferenciar servicios y productos
  type: AppointmentType;
  time?: string;        // Solo para servicios (ej: "10:30")
  price?: number;
  currency?: string;
}

// Templates (Marketing)
export type TemplateStatus = 'approved' | 'pending' | 'rejected';
export type TemplateCategory = 'followup' | 'reminder' | 'reactivation' | 'postservice' | 'promotion';

export interface Template {
  id: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  content: string;
  variables: string[];
  hasButton: boolean;
  buttonText?: string;
  buttonUrl?: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

// Metrics
export interface DashboardMetrics {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  botResponseRate: number;
  avgFirstResponseTime: number; // seconds
  avgConversionTime: number; // hours
  servicesBooked: number;
  revenue: number;
  funnel: FunnelMetrics;
  // Time series data for charts
  dailyData?: DailyMetric[];
}

export interface DailyMetric {
  date: string; // ISO date string or day name
  day: string; // Display name (e.g., "Lun", "Mar")
  chats: number;
  messages: number;
  avgMessages: number;
  abandonmentRate: number;
}

export interface FunnelMetrics {
  tofu: number;
  mofu: number;
  hotLeads: number;
  bofu: number;
  deadRate: number;
  warmRate: number;
  hotRate: number;
  conversionRate: number;
}

export interface ChannelMetrics {
  channel: Channel;
  chats: number;
  conversions: number;
  conversionRate: number;
}

// Billing
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'canceled';

export interface BillingInfo {
  plan: 'basic' | 'pro' | 'enterprise';
  status: SubscriptionStatus;
  nextBillingDate: Date;
  amount: number;
  currency: string;
  history: BillingRecord[];
}

export interface BillingRecord {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

// Date Range Filter
export type DateRangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate?: Date;
  endDate?: Date;
}

// Navigation
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  isUpgrade?: boolean;
  children?: NavItem[];
}
