// ============================================
// VEXA - Mock Data
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

// Current Client (Tenant)
export const mockClient: Client = {
  id: 'client-001',
  name: 'Beauty Salon Pro',
  plan: 'basic',
  timezone: 'America/Santiago',
  createdAt: new Date('2024-01-15'),
};

// Current User
export const mockUser: User = {
  id: 'user-001',
  name: 'Patricio Araya',
  email: 'patricio@beautysalonpro.cl',
  avatar: undefined,
  role: 'admin',
  clientId: 'client-001',
};

// Dashboard Metrics
export const mockDashboardMetrics: DashboardMetrics = {
  totalChats: 1247,
  totalMessages: 18453,
  avgMessagesPerChat: 14.8,
  botResponseRate: 94.2,
  avgFirstResponseTime: 3.2,
  avgConversionTime: 2.4,
  servicesBooked: 342,
  revenue: 15750000,
  funnel: {
    tofu: 2840,
    mofu: 1247,
    hotLeads: 486,
    bofu: 342,
    deadRate: 18.4,
    warmRate: 43.9,
    hotRate: 24.8,
    conversionRate: 12.9,
  },
};

// Helper to create dates
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const hoursAgo = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

const minutesAgo = (minutes: number): Date => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
};

// Mock Messages for Chats
const createMessages = (chatId: string, userName: string): Message[] => {
  const conversations: Message[][] = [
    [
      { id: `${chatId}-1`, chatId, content: 'Hola! Me interesa agendar una cita para corte de cabello', sender: 'user', timestamp: hoursAgo(2), read: true },
      { id: `${chatId}-2`, chatId, content: '¡Hola! 👋 Bienvenido/a a Beauty Salon Pro. Me encanta que quieras agendar con nosotros. ¿Para qué día te gustaría tu cita?', sender: 'bot', timestamp: hoursAgo(2), read: true },
      { id: `${chatId}-3`, chatId, content: 'Este sábado si es posible, en la mañana', sender: 'user', timestamp: hoursAgo(1.5), read: true },
      { id: `${chatId}-4`, chatId, content: 'Perfecto, tenemos disponibilidad el sábado a las 10:00 y 11:30. ¿Cuál prefieres? 💇‍♀️', sender: 'bot', timestamp: hoursAgo(1.5), read: true },
      { id: `${chatId}-5`, chatId, content: 'Las 10 está bien', sender: 'user', timestamp: hoursAgo(1), read: true },
      { id: `${chatId}-6`, chatId, content: '¡Excelente! Tu cita está confirmada para el sábado a las 10:00. Te enviaré un recordatorio. ¿Necesitas algo más?', sender: 'bot', timestamp: hoursAgo(1), read: true },
    ],
    [
      { id: `${chatId}-1`, chatId, content: 'Cuanto cuesta el tratamiento capilar?', sender: 'user', timestamp: hoursAgo(5), read: true },
      { id: `${chatId}-2`, chatId, content: '¡Hola! Nuestro tratamiento capilar tiene un valor de $45.000 e incluye diagnóstico, aplicación y masaje relajante. ¿Te gustaría agendar? ✨', sender: 'bot', timestamp: hoursAgo(5), read: true },
      { id: `${chatId}-3`, chatId, content: 'Mmm está un poco caro', sender: 'user', timestamp: hoursAgo(4), read: true },
      { id: `${chatId}-4`, chatId, content: 'Entiendo tu preocupación. Este mes tenemos 20% de descuento en tu primera visita. ¿Qué te parece? 🎉', sender: 'bot', timestamp: hoursAgo(4), read: true },
    ],
    [
      { id: `${chatId}-1`, chatId, content: 'Necesito cancelar mi cita de mañana', sender: 'user', timestamp: hoursAgo(3), read: true },
      { id: `${chatId}-2`, chatId, content: 'Lamento que no puedas asistir. Puedo ayudarte a reagendar. ¿Qué día te acomoda mejor? 📅', sender: 'bot', timestamp: hoursAgo(3), read: true },
      { id: `${chatId}-3`, chatId, content: 'La próxima semana, cualquier día después de las 5pm', sender: 'user', timestamp: hoursAgo(2.5), read: true },
      { id: `${chatId}-4`, chatId, content: 'Tenemos disponibilidad el martes y jueves a las 17:30. ¿Cuál prefieres?', sender: 'bot', timestamp: hoursAgo(2.5), read: true },
      { id: `${chatId}-5`, chatId, content: 'Jueves perfecto', sender: 'user', timestamp: hoursAgo(2), read: true },
      { id: `${chatId}-6`, chatId, content: '¡Listo! Tu cita ha sido reagendada para el jueves a las 17:30. Te esperamos. 💅', sender: 'bot', timestamp: hoursAgo(2), read: true },
    ],
  ];
  
  const randomConversation = conversations[Math.floor(Math.random() * conversations.length)];
  return randomConversation.map(msg => ({ ...msg, chatId }));
};

// Mock Chats
export const mockChats: Chat[] = [
  {
    id: 'chat-001',
    sessionId: 'sess_a1b2c3',
    userName: 'María González',
    userPhone: '+59171234567',
    channel: 'whatsapp',
    status: 'active',
    funnelStage: 'hot',
    lastMessageAt: minutesAgo(5),
    hasHumanIntervention: false,
    messages: createMessages('chat-001', 'María González'),
    tags: ['interesada', 'corte'],
    createdAt: hoursAgo(2),
  },
  {
    id: 'chat-002',
    sessionId: 'sess_d4e5f6',
    userName: 'Carlos Mendoza',
    userPhone: '+59172345678',
    channel: 'whatsapp',
    status: 'active',
    funnelStage: 'warm',
    lastMessageAt: minutesAgo(15),
    hasHumanIntervention: false,
    messages: createMessages('chat-002', 'Carlos Mendoza'),
    tags: ['precio', 'tratamiento'],
    createdAt: hoursAgo(5),
  },
  {
    id: 'chat-003',
    sessionId: 'sess_g7h8i9',
    userName: 'Ana Rodríguez',
    userPhone: '+59173456789',
    channel: 'whatsapp',
    status: 'closed',
    funnelStage: 'converted',
    lastMessageAt: hoursAgo(1),
    hasHumanIntervention: false,
    messages: createMessages('chat-003', 'Ana Rodríguez'),
    tags: ['reagendamiento', 'confirmado'],
    summary: 'Cliente reagendó cita de manicure para el jueves.',
    createdAt: hoursAgo(3),
  },
  {
    id: 'chat-004',
    sessionId: 'sess_j1k2l3',
    userName: 'Pedro Silva',
    userPhone: '+59174567890',
    channel: 'whatsapp',
    status: 'active',
    funnelStage: 'dead',
    lastMessageAt: hoursAgo(24),
    hasHumanIntervention: false,
    messages: [
      { id: 'chat-004-1', chatId: 'chat-004', content: 'Hola', sender: 'user', timestamp: hoursAgo(24), read: true },
      { id: 'chat-004-2', chatId: 'chat-004', content: '¡Hola! 👋 Bienvenido/a a Beauty Salon Pro. ¿En qué puedo ayudarte hoy?', sender: 'bot', timestamp: hoursAgo(24), read: true },
    ],
    createdAt: hoursAgo(24),
  },
  {
    id: 'chat-005',
    sessionId: 'sess_m4n5o6',
    userName: 'Valentina Torres',
    userPhone: '+59175678901',
    channel: 'whatsapp',
    status: 'active',
    funnelStage: 'hot',
    lastMessageAt: minutesAgo(30),
    hasHumanIntervention: true,
    messages: createMessages('chat-005', 'Valentina Torres'),
    tags: ['reclamo', 'escalado'],
    createdAt: hoursAgo(1),
  },
  {
    id: 'chat-006',
    sessionId: 'sess_p7q8r9',
    userName: 'Diego Fuentes',
    userPhone: '+59176789012',
    channel: 'whatsapp',
    status: 'closed',
    funnelStage: 'converted',
    lastMessageAt: hoursAgo(3),
    hasHumanIntervention: false,
    messages: createMessages('chat-006', 'Diego Fuentes'),
    summary: 'Agendó corte + barba para el viernes.',
    createdAt: hoursAgo(4),
  },
  {
    id: 'chat-007',
    sessionId: 'sess_s1t2u3',
    userName: 'Camila Reyes',
    userPhone: '+59177890123',
    channel: 'whatsapp',
    status: 'active',
    funnelStage: 'warm',
    lastMessageAt: hoursAgo(2),
    hasHumanIntervention: false,
    messages: createMessages('chat-007', 'Camila Reyes'),
    tags: ['consulta', 'tinte'],
    createdAt: hoursAgo(6),
  },
  {
    id: 'chat-008',
    sessionId: 'sess_v4w5x6',
    userName: 'Roberto Muñoz',
    userPhone: '+59178901234',
    channel: 'whatsapp',
    status: 'closed',
    funnelStage: 'dead',
    lastMessageAt: daysAgo(2),
    hasHumanIntervention: false,
    messages: [
      { id: 'chat-008-1', chatId: 'chat-008', content: 'Info', sender: 'user', timestamp: daysAgo(2), read: true },
      { id: 'chat-008-2', chatId: 'chat-008', content: '¡Hola! Somos Beauty Salon Pro. ¿Qué información necesitas?', sender: 'bot', timestamp: daysAgo(2), read: true },
    ],
    createdAt: daysAgo(2),
  },
];

// Mock Appointments
export const mockAppointments: Appointment[] = [
  {
    id: 'apt-001',
    datetime: new Date(new Date().setHours(10, 0, 0, 0)),
    clientName: 'María González',
    clientPhone: '+59171234567',
    service: 'Corte de cabello',
    source: 'chat',
    status: 'confirmed',
    chatId: 'chat-001',
    createdAt: hoursAgo(2),
  },
  {
    id: 'apt-002',
    datetime: new Date(new Date().setHours(11, 30, 0, 0)),
    clientName: 'Laura Pérez',
    clientPhone: '+59179012345',
    service: 'Manicure + Pedicure',
    source: 'campaign',
    status: 'confirmed',
    createdAt: daysAgo(1),
  },
  {
    id: 'apt-003',
    datetime: new Date(new Date().setHours(14, 0, 0, 0)),
    clientName: 'Sofía Martínez',
    clientPhone: '+59170123456',
    service: 'Tratamiento capilar',
    source: 'chat',
    status: 'pending',
    createdAt: hoursAgo(5),
  },
  {
    id: 'apt-004',
    datetime: new Date(new Date().setHours(15, 30, 0, 0)),
    clientName: 'Javiera López',
    clientPhone: '+59160123456',
    service: 'Tinte + Corte',
    source: 'direct',
    status: 'confirmed',
    createdAt: daysAgo(2),
  },
  {
    id: 'apt-005',
    datetime: new Date(new Date().setHours(17, 0, 0, 0)),
    clientName: 'Fernanda Castro',
    clientPhone: '+59173456789',
    service: 'Alisado permanente',
    source: 'referral',
    status: 'pending',
    createdAt: hoursAgo(12),
  },
  {
    id: 'apt-006',
    datetime: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; })(),
    clientName: 'Catalina Vargas',
    clientPhone: '+59174567890',
    service: 'Corte de cabello',
    source: 'chat',
    status: 'confirmed',
    createdAt: daysAgo(1),
  },
  {
    id: 'apt-007',
    datetime: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; })(),
    clientName: 'Isidora Núñez',
    clientPhone: '+59175678901',
    service: 'Maquillaje evento',
    source: 'campaign',
    status: 'confirmed',
    createdAt: hoursAgo(8),
  },
  {
    id: 'apt-008',
    datetime: (() => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(16, 0, 0, 0); return d; })(),
    clientName: 'Antonia Soto',
    clientPhone: '+59176789012',
    service: 'Depilación',
    source: 'chat',
    status: 'canceled',
    createdAt: daysAgo(3),
  },
];

// Mock Templates
export const mockTemplates: Template[] = [
  {
    id: 'tpl-001',
    name: 'Recordatorio 24h',
    status: 'approved',
    category: 'reminder',
    content: '¡Hola {nombre}! 👋 Te recordamos que tienes una cita mañana a las {hora} para {servicio}. ¡Te esperamos! 💅',
    variables: ['nombre', 'hora', 'servicio'],
    hasButton: false,
    createdAt: daysAgo(30),
    lastUsedAt: hoursAgo(2),
  },
  {
    id: 'tpl-002',
    name: 'Carrito abandonado',
    status: 'approved',
    category: 'followup',
    content: 'Hola {nombre}, vimos que estabas interesado/a en {servicio}. ¿Te gustaría agendar? Tenemos disponibilidad esta semana 🗓️',
    variables: ['nombre', 'servicio'],
    hasButton: true,
    buttonText: 'IR AL CARRITO',
    buttonUrl: 'https://wa.me/56912345678',
    createdAt: daysAgo(15),
    lastUsedAt: daysAgo(1),
  },
  {
    id: 'tpl-003',
    name: 'Reactivación 30 días',
    status: 'approved',
    category: 'reactivation',
    content: '¡Hola {nombre}! 💇‍♀️ Te extrañamos. Han pasado 30 días desde tu última visita. ¿Qué tal si agendamos? Tenemos 15% OFF para ti.',
    variables: ['nombre'],
    hasButton: true,
    buttonText: 'AGENDAR AHORA',
    buttonUrl: 'https://wa.me/56912345678',
    createdAt: daysAgo(20),
    lastUsedAt: daysAgo(3),
  },
  {
    id: 'tpl-004',
    name: 'Post-servicio',
    status: 'approved',
    category: 'postservice',
    content: '¡Gracias por visitarnos, {nombre}! ✨ Esperamos que hayas disfrutado tu {servicio}. ¿Nos dejas una reseña? Significa mucho para nosotros.',
    variables: ['nombre', 'servicio'],
    hasButton: true,
    buttonText: 'DEJAR RESEÑA',
    buttonUrl: 'https://g.page/review',
    createdAt: daysAgo(25),
    lastUsedAt: hoursAgo(5),
  },
  {
    id: 'tpl-005',
    name: 'Promoción verano',
    status: 'pending',
    category: 'promotion',
    content: '☀️ ¡Llegó el verano a Beauty Salon! 30% OFF en todos los tratamientos capilares. Válido hasta fin de mes. ¡Agenda ya!',
    variables: [],
    hasButton: true,
    buttonText: 'VER PROMOCIÓN',
    buttonUrl: 'https://wa.me/56912345678',
    createdAt: daysAgo(2),
  },
  {
    id: 'tpl-006',
    name: 'Confirmación cita',
    status: 'rejected',
    category: 'reminder',
    content: 'Tu cita ha sido confirmada. Servicio: {servicio}. Fecha: {fecha}. Por favor confirma tu asistencia.',
    variables: ['servicio', 'fecha'],
    hasButton: false,
    createdAt: daysAgo(5),
  },
];

// Mock Billing
export const mockBilling: BillingInfo = {
  plan: 'basic',
  status: 'active',
  nextBillingDate: (() => { const d = new Date(); d.setDate(d.getDate() + 15); return d; })(),
  amount: 99,
  currency: 'USD',
  history: [
    { id: 'inv-001', date: daysAgo(15), amount: 99, status: 'paid', invoiceUrl: '#' },
    { id: 'inv-002', date: daysAgo(45), amount: 99, status: 'paid', invoiceUrl: '#' },
    { id: 'inv-003', date: daysAgo(75), amount: 99, status: 'paid', invoiceUrl: '#' },
    { id: 'inv-004', date: daysAgo(105), amount: 150, status: 'paid', invoiceUrl: '#' },
  ],
};

// Mock Agent Settings
export const mockAgentSettings: AgentSettings = {
  personality: {
    formality: 'neutral',
    empathy: 'alta',
    humor: 'sutil',
    emojis: 'ocasional',
    responseLength: 'media',
    primaryObjective: 'agendar',
    salesFlowSteps: [
      {
        id: 'step-1',
        order: 0,
        instruction: 'Saluda al cliente y preséntate como asistente del salón. Pregunta en qué puedes ayudarlo.',
      },
      {
        id: 'step-2',
        order: 1,
        instruction: 'Identifica el servicio que necesita el cliente y ofrece información relevante sobre precios y disponibilidad.',
      },
      {
        id: 'step-3',
        order: 2,
        instruction: 'Propón horarios disponibles y confirma la cita con los detalles (servicio, fecha, hora, ubicación).',
      },
    ],
    lastModified: daysAgo(5),
  },
  business: {
    description: 'Beauty Salon Pro es un salón de belleza premium ubicado en Santiago. Ofrecemos servicios de peluquería, manicure, pedicure, tratamientos capilares y maquillaje profesional.',
    hasPhysicalStore: true,
    locations: [
      {
        id: 'loc-001',
        name: 'Sede Providencia',
        address: 'Av. Providencia 1234, Local 5',
        city: 'Santiago',
        schedule: [
          { day: 'lunes', enabled: true, startTime: '09:00', endTime: '19:00' },
          { day: 'martes', enabled: true, startTime: '09:00', endTime: '19:00' },
          { day: 'miercoles', enabled: true, startTime: '09:00', endTime: '19:00' },
          { day: 'jueves', enabled: true, startTime: '09:00', endTime: '19:00' },
          { day: 'viernes', enabled: true, startTime: '09:00', endTime: '19:00' },
          { day: 'sabado', enabled: true, startTime: '10:00', endTime: '15:00' },
          { day: 'domingo', enabled: false, startTime: '', endTime: '' },
        ],
      },
    ],
    phoneNumbers: ['+59171234567', '+59172345678'],
    socialLinks: {
      instagram: 'https://instagram.com/beautysalonpro',
      facebook: 'https://facebook.com/beautysalonpro',
      tiktok: '',
      linkedin: '',
      youtube: '',
      twitter: '',
    },
    website: 'https://www.beautysalonpro.cl',
    serviceCoverage: ['presencial_local'],
    coverageZones: '',
    idealClientTypes: ['personas_naturales', 'premium'],
    valueProposition: 'Experiencia premium en belleza con atención personalizada y resultados garantizados.',
    lastModified: daysAgo(10),
  },
  policies: {
    generalPolicies: 'Todos nuestros servicios incluyen una consulta inicial gratuita. Nos reservamos el derecho de rechazar servicios si el cliente llega tarde más de 15 minutos.',
    guarantees: 'Si no quedas satisfecho/a con el resultado, ofrecemos una corrección gratuita dentro de los 7 días siguientes.',
    lastModified: daysAgo(20),
  },
  services: {
    modality: 'presencial',
    schedule: [
      { day: 'lunes', enabled: true, startTime: '09:00', endTime: '19:00' },
      { day: 'martes', enabled: true, startTime: '09:00', endTime: '19:00' },
      { day: 'miercoles', enabled: true, startTime: '09:00', endTime: '19:00' },
      { day: 'jueves', enabled: true, startTime: '09:00', endTime: '19:00' },
      { day: 'viernes', enabled: true, startTime: '09:00', endTime: '19:00' },
      { day: 'sabado', enabled: true, startTime: '10:00', endTime: '15:00' },
      { day: 'domingo', enabled: false, startTime: '', endTime: '' },
    ],
    requirements: [
      'Llegar 10 minutos antes de la cita',
      'Cabello limpio para servicios de corte/tinte',
      'Uñas sin esmalte para manicure',
    ],
    services: [
      { id: 'svc-001', name: 'Corte de cabello', description: 'Corte profesional con lavado incluido', duration: 45, price: 15000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'email', 'fecha_preferida'], capacityPerSlot: 3, noAvailabilityAction: 'sugerir_horario' },
      { id: 'svc-002', name: 'Tinte + Corte', description: 'Tinte completo + corte profesional', duration: 150, price: 55000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'email', 'fecha_preferida', 'observaciones'], capacityPerSlot: 2, noAvailabilityAction: 'lista_espera' },
      { id: 'svc-003', name: 'Manicure + Pedicure', description: 'Combo manicure y pedicure completo', duration: 120, price: 28000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'fecha_preferida'], capacityPerSlot: 3, noAvailabilityAction: 'sugerir_horario' },
      { id: 'svc-004', name: 'Tratamiento capilar', description: 'Hidratación profunda + masaje', duration: 60, price: 35000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'email', 'observaciones'], capacityPerSlot: 2, noAvailabilityAction: 'derivar_humano' },
      { id: 'svc-005', name: 'Alisado permanente', description: 'Alisado keratina o brasileño', duration: 180, price: 85000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'email', 'fecha_preferida', 'observaciones'], capacityPerSlot: 1, noAvailabilityAction: 'lista_espera' },
      { id: 'svc-006', name: 'Maquillaje evento', description: 'Maquillaje profesional para eventos', duration: 90, price: 45000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'fecha_preferida', 'observaciones'], capacityPerSlot: 2, noAvailabilityAction: 'sugerir_horario' },
      { id: 'svc-007', name: 'Depilación', description: 'Depilación con cera o láser', duration: 45, price: 25000, currency: 'CLP', actionObjective: 'agendar', requiredData: ['nombre', 'telefono', 'fecha_preferida'], capacityPerSlot: 3, noAvailabilityAction: 'sugerir_horario' },
    ],
    pricingType: 'fijo',
    lastModified: daysAgo(7),
  },
  rescheduling: {
    allowRescheduling: true,
    reschedulingDeadline: 24,
    reschedulingConditions: 'Se permite reagendar hasta 24 horas antes de la cita sin costo adicional.',
    allowCancellation: true,
    cancellationDeadline: 24,
    cancellationPenalty: 50,
    refundApplies: true,
    refundConditions: 'Devolución del 50% si se cancela con más de 24 horas de anticipación.',
    lastModified: daysAgo(15),
  },
  payments: {
    methods: [
      { type: 'transferencia', enabled: true, details: 'Banco Estado - Cta. 12345678' },
      { type: 'tarjeta', enabled: true },
      { type: 'efectivo', enabled: true },
      { type: 'qr', enabled: false },
      { type: 'link', enabled: true, details: 'Mercado Pago' },
      { type: 'otro', enabled: false },
    ],
    restrictions: [],
    instructions: 'Se requiere un abono del 30% para confirmar citas de más de 1 hora.',
    requiresDeposit: true,
    depositPercentage: 30,
    lastModified: daysAgo(12),
  },
  intervention: {
    enabled: true,
    conditions: [
      { id: 'cond-001', label: 'Solicitud explícita de hablar con humano', enabled: true },
      { id: 'cond-002', label: 'Detección de reclamo o conflicto', enabled: true },
      { id: 'cond-003', label: 'Consulta fuera del alcance del bot', enabled: true },
      { id: 'cond-004', label: 'Cliente identificado como prioritario', enabled: false },
    ],
    customRules: 'Escalar si el cliente menciona "problema", "queja" o "gerente".',
    unqualifiedLeadHandling: 'ofrecer_alternativa',
    lastModified: daysAgo(8),
  },
  faq: {
    items: [
      { id: 'faq-001', question: '¿Cuáles son sus horarios de atención?', answer: 'Atendemos de lunes a viernes de 9:00 a 19:00 y sábados de 10:00 a 15:00.', order: 1 },
      { id: 'faq-002', question: '¿Dónde están ubicados?', answer: 'Estamos en Av. Providencia 1234, Local 5, Santiago.', order: 2 },
      { id: 'faq-003', question: '¿Aceptan tarjetas?', answer: 'Sí, aceptamos todas las tarjetas de crédito y débito.', order: 3 },
      { id: 'faq-004', question: '¿Necesito reservar con anticipación?', answer: 'Recomendamos reservar al menos con 1 día de anticipación, especialmente para fines de semana.', order: 4 },
    ],
    lastModified: daysAgo(3),
  },
  limits: {
    prohibitedTopics: ['política', 'religión', 'competencia'],
    prohibitedPromises: 'No prometer descuentos no autorizados ni resultados garantizados en tratamientos.',
    sensitiveInfo: {
      enabled: true,
      description: 'No revelar información personal de otros clientes ni datos financieros del negocio.',
    },
    avoidedLanguage: ['jerga', 'groserías', 'diminutivos excesivos'],
    prohibitedTopicAction: 'redirigir',
    lastModified: daysAgo(6),
  },
};

// ============================================
// API Placeholder Functions
// ============================================

export async function fetchDashboardData(dateRange?: string): Promise<DashboardMetrics> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // En producción, aquí se filtrarían los datos según dateRange
  // Por ahora retornamos los datos mock, pero la estructura está lista
  console.log("[fetchDashboardData] Filtrando por:", dateRange || "30d");
  
  return mockDashboardMetrics;
}

export async function fetchChats(): Promise<Chat[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockChats;
}

export async function fetchChat(chatId: string): Promise<Chat | undefined> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockChats.find(c => c.id === chatId);
}

export async function fetchAppointments(): Promise<Appointment[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockAppointments;
}

export async function fetchTemplates(): Promise<Template[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockTemplates;
}

export async function fetchBillingInfo(): Promise<BillingInfo> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockBilling;
}

export async function fetchAgentSettings(): Promise<AgentSettings> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockAgentSettings;
}

/**
 * Obtiene los nombres de los servicios configurados en AgentSettings
 * Sincronizado con la sección de Servicios
 */
export function getAvailableServices(): string[] {
  return mockAgentSettings.services.services.map(s => s.name);
}

export async function fetchAvailableServices(): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return getAvailableServices();
}

export async function updateAgentSettingsSection<K extends keyof AgentSettings>(
  section: K,
  data: Partial<AgentSettings[K]>
): Promise<AgentSettings[K]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  // In real implementation, this would update the backend
  console.log(`Updating ${section}:`, data);
  return { ...mockAgentSettings[section], ...data, lastModified: new Date() } as AgentSettings[K];
}

export async function markHumanIntervention(chatId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log(`Marked human intervention for chat: ${chatId}`);
}
