import type { FieldOp } from './apply-field-change';

const FIELD_LABELS: Record<string, string> = {
  customInstructions: 'Instrucciones personalizadas',
  salesFlowSteps: 'Flujo de venta',
  generalPolicies: 'Políticas generales',
  guarantees: 'Garantías',
  instructions: 'Instrucciones de pago',
  pricingNote: 'Nota de precios',
  customRules: 'Reglas de intervención',
  items: 'Pregunta frecuente',
  prohibitedPromises: 'Promesas prohibidas',
  prohibitedTopics: 'Temas prohibidos',
  avoidedLanguage: 'Lenguaje a evitar',
  description: 'Descripción del negocio',
  valueProposition: 'Propuesta de valor',
  coverageZones: 'Zonas de cobertura',
  requirements: 'Requisitos',
};

export const FIELD_OP_LABEL: Record<FieldOp, string> = {
  add: 'Agregar',
  edit: 'Editar',
  remove: 'Quitar',
  set: 'Cambiar',
};

function orderFrom(value: unknown): number | null {
  if (typeof value === 'object' && value !== null && 'order' in value) {
    const order = (value as { order: unknown }).order;
    return typeof order === 'number' ? order : null;
  }
  return null;
}

export function getFieldLabel(field: string | null | undefined, sample?: unknown): string {
  if (!field) return 'campo';
  if (field === 'salesFlowSteps') {
    const order = orderFrom(sample);
    return order !== null ? `Flujo de venta (paso ${order})` : 'Flujo de venta';
  }
  return FIELD_LABELS[field] ?? field;
}
