/**
 * Prompt Generators
 * 
 * Each function takes structured UI data and generates a text prompt
 * that will be stored in the corresponding agent_prompts column.
 * 
 * These prompts are later injected into the AI system prompt by n8n.
 */

// ============================================
// PERSONALITY PROMPT GENERATOR
// ============================================
export interface PersonalityData {
  objective: 'schedule' | 'sell' | 'support' | 'mixed';
  actionPriority: 'high' | 'medium' | 'low';
  closingStyle: 'direct' | 'soft' | 'consultive';
  formality: number; // 0-10
  empathy: number; // 0-10
  humor: number; // 0-10
  emojiUsage: number; // 0-10
  responseLength: 'corta' | 'media' | 'extensa';
}

export function generatePersonalityPrompt(data: PersonalityData): string {
  const objectiveMap = {
    schedule: 'agendar citas y reservaciones',
    sell: 'cerrar ventas y convertir prospectos',
    support: 'brindar soporte y resolver dudas',
    mixed: 'una combinación de agendar, vender y dar soporte según el contexto'
  };

  const priorityMap = {
    high: 'Debes ser proactivo y guiar la conversación hacia el objetivo.',
    medium: 'Mantén un balance entre resolver dudas y avanzar hacia el objetivo.',
    low: 'Prioriza resolver las dudas del cliente antes de proponer acciones.'
  };

  const closingMap = {
    direct: 'Cierra de manera directa cuando detectes interés.',
    soft: 'Sugiere el siguiente paso de forma sutil y sin presión.',
    consultive: 'Actúa como consultor, haciendo preguntas para entender mejor antes de proponer.'
  };

  const responseLengthMap = {
    corta: 'Responde de forma concisa y directa, usando 1-2 párrafos cortos máximo. Ve al punto rápidamente.',
    media: 'Usa respuestas de extensión moderada, entre 3-4 párrafos. Balancea información con brevedad.',
    extensa: 'Proporciona respuestas completas y detalladas, 4 o más párrafos cuando sea necesario. Explica con profundidad.'
  };

  return `## Personalidad del Agente

Tu objetivo principal es ${objectiveMap[data.objective]}.

${priorityMap[data.actionPriority]}

${closingMap[data.closingStyle]}

### Tono de comunicación:
- Formalidad: ${data.formality}/10 ${data.formality >= 7 ? '(mantén un tono profesional y formal)' : data.formality >= 4 ? '(tono balanceado, ni muy formal ni muy casual)' : '(tono casual y cercano)'}
- Empatía: ${data.empathy}/10 ${data.empathy >= 7 ? '(muestra comprensión genuina por las necesidades del cliente)' : ''}
- Humor: ${data.humor}/10 ${data.humor >= 5 ? '(puedes usar humor ligero cuando sea apropiado)' : '(mantén un tono serio y profesional)'}
- Uso de emojis: ${data.emojiUsage}/10 ${data.emojiUsage >= 5 ? '(usa emojis para hacer la conversación más amigable)' : '(usa emojis con moderación o evítalos)'}

### Extensión de respuestas:
${responseLengthMap[data.responseLength || 'media']}`;
}

// ============================================
// BUSINESS CONTEXT PROMPT GENERATOR
// ============================================
export interface LocationData {
  address: string;
  schedule: string;
  phone?: string;
}

export interface BusinessData {
  name: string;
  description: string;
  valueProposition: string;
  hasPhysicalStore: boolean;
  locations: LocationData[];
  coverageZones: string;
  contactChannels: string[];
}

export function generateBusinessPrompt(data: BusinessData): string {
  let prompt = `## Información del Negocio

**Nombre:** ${data.name}

**Descripción:** ${data.description}

**Propuesta de valor:** ${data.valueProposition}

**Canales de contacto disponibles:** ${data.contactChannels.join(', ')}`;

  if (data.hasPhysicalStore && data.locations.length > 0) {
    prompt += `\n\n### Ubicaciones físicas:`;
    data.locations.forEach((loc, i) => {
      prompt += `\n${i + 1}. ${loc.address}`;
      prompt += `\n   Horario: ${loc.schedule}`;
      if (loc.phone) prompt += `\n   Teléfono: ${loc.phone}`;
    });
  }

  if (data.coverageZones) {
    prompt += `\n\n**Zonas de cobertura:** ${data.coverageZones}`;
  }

  return prompt;
}

// ============================================
// POLICIES PROMPT GENERATOR
// ============================================
export interface PoliciesData {
  serviceRules: string;
  guarantees: string;
  edgeCases: string;
}

export function generatePoliciesPrompt(data: PoliciesData): string {
  return `## Políticas Generales

### Reglas del servicio:
${data.serviceRules}

### Garantías:
${data.guarantees}

### Manejo de casos especiales:
${data.edgeCases}`;
}

// ============================================
// SERVICES PROMPT GENERATOR
// ============================================
export interface ServiceData {
  name: string;
  price: number | null;
  priceType: 'fixed' | 'variable' | 'referential';
  duration?: number;
  requirements?: string;
}

export interface ServicesConfigData {
  modalities: ('presencial' | 'domicilio' | 'virtual')[];
  operatingHours: string;
  services: ServiceData[];
  pricingPolicy: string;
}

export function generateServicesPrompt(data: ServicesConfigData): string {
  let prompt = `## Servicios

**Modalidades disponibles:** ${data.modalities.join(', ')}

**Horarios de operación:** ${data.operatingHours}

### Catálogo de servicios:`;

  data.services.forEach((service, i) => {
    const priceText = service.price === null 
      ? 'Precio variable (consultar)' 
      : service.priceType === 'referential' 
        ? `Desde $${service.price} (precio referencial)`
        : `$${service.price}`;
    
    prompt += `\n\n${i + 1}. **${service.name}**`;
    prompt += `\n   - Precio: ${priceText}`;
    if (service.duration) prompt += `\n   - Duración: ${service.duration} minutos`;
    if (service.requirements) prompt += `\n   - Requisitos: ${service.requirements}`;
  });

  if (data.pricingPolicy) {
    prompt += `\n\n**Política de precios:** ${data.pricingPolicy}`;
  }

  return prompt;
}

// ============================================
// RESCHEDULING PROMPT GENERATOR
// ============================================
export interface ReschedulingData {
  cancellationWindowHours: number;
  penaltyPercentage: number;
  refundPolicy: string;
  maxReschedules: number;
}

export function generateReschedulingPrompt(data: ReschedulingData): string {
  return `## Políticas de Re-agendamiento y Cancelación

- **Ventana de cancelación:** Se permite cancelar hasta ${data.cancellationWindowHours} horas antes de la cita.
- **Penalización por cancelación tardía:** ${data.penaltyPercentage}% del valor del servicio.
- **Máximo de re-agendamientos permitidos:** ${data.maxReschedules} veces por reservación.

### Política de reembolsos:
${data.refundPolicy}`;
}

// ============================================
// PAYMENTS PROMPT GENERATOR
// ============================================
export interface PaymentMethodData {
  method: string;
  enabled: boolean;
  details?: string;
}

export interface PaymentsData {
  methods: PaymentMethodData[];
  requiresDeposit: boolean;
  depositPercentage: number;
  restrictions: string;
}

export function generatePaymentsPrompt(data: PaymentsData): string {
  const enabledMethods = data.methods.filter(m => m.enabled);
  
  let prompt = `## Opciones de Pago

**Métodos aceptados:**`;
  
  enabledMethods.forEach(method => {
    prompt += `\n- ${method.method}`;
    if (method.details) prompt += `: ${method.details}`;
  });

  if (data.requiresDeposit) {
    prompt += `\n\n**Anticipo requerido:** Sí, ${data.depositPercentage}% del valor total para confirmar la reservación.`;
  } else {
    prompt += `\n\n**Anticipo requerido:** No, el pago se realiza al momento del servicio.`;
  }

  if (data.restrictions) {
    prompt += `\n\n**Restricciones:** ${data.restrictions}`;
  }

  return prompt;
}

// ============================================
// HANDOVER PROMPT GENERATOR
// ============================================
export interface HandoverData {
  enabled: boolean;
  predefinedConditions: string[];
  customConditions: string[];
  handoffMessage: string;
  priorityClientCriteria: string;
}

export function generateHandoverPrompt(data: HandoverData): string {
  if (!data.enabled) {
    return `## Intervención Asistida

La intervención humana está deshabilitada. El agente debe manejar todas las conversaciones de forma autónoma.`;
  }

  const allConditions = [...data.predefinedConditions, ...data.customConditions];

  return `## Intervención Asistida

### Escalar a un humano cuando:
${allConditions.map(c => `- ${c}`).join('\n')}

### Mensaje de handoff:
"${data.handoffMessage}"

### Clientes prioritarios:
${data.priorityClientCriteria}`;
}

// ============================================
// FAQ PROMPT GENERATOR
// ============================================
export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQData {
  items: FAQItem[];
}

export function generateFAQPrompt(data: FAQData): string {
  if (data.items.length === 0) {
    return '';
  }

  let prompt = `## Preguntas Frecuentes

Cuando el cliente pregunte sobre estos temas, responde según las siguientes guías:`;

  data.items.forEach((faq, i) => {
    prompt += `\n\n**P${i + 1}: ${faq.question}**\nR: ${faq.answer}`;
  });

  return prompt;
}

// ============================================
// LIMITS PROMPT GENERATOR
// ============================================
export interface LimitsData {
  forbiddenTopics: string[];
  forbiddenPromises: string[];
  sensitiveData: string[];
  avoidLanguage: string[];
}

export function generateLimitsPrompt(data: LimitsData): string {
  let prompt = `## Límites del Agente

### Temas prohibidos (no discutir bajo ninguna circunstancia):
${data.forbiddenTopics.map(t => `- ${t}`).join('\n')}

### Promesas que NO puedes hacer:
${data.forbiddenPromises.map(p => `- ${p}`).join('\n')}

### Información sensible a proteger:
${data.sensitiveData.map(s => `- ${s}`).join('\n')}

### Lenguaje a evitar:
${data.avoidLanguage.map(l => `- ${l}`).join('\n')}

**IMPORTANTE:** Si hay incertidumbre sobre algún tema, siempre prefiere escalar a un humano antes de dar información incorrecta.`;

  return prompt;
}
