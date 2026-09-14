export type AgentSettingsSectionId =
  | "personality"
  | "business"
  | "policies"
  | "services"
  | "rescheduling"
  | "payments"
  | "intervention"
  | "faq"
  | "limits";

export interface AgentSettingsSectionInfo {
  id: AgentSettingsSectionId;
  title: string;
  description: string;
  lastModified: Date;
}

export const sectionsList: Omit<AgentSettingsSectionInfo, "lastModified">[] = [
  { id: "personality", title: "Personalidad del Agente", description: "Tono, formalidad y estilo de comunicación" },
  { id: "business", title: "Sobre tu negocio", description: "Información general y ubicaciones" },
  { id: "policies", title: "Políticas generales", description: "Reglas y garantías de servicio" },
  { id: "services", title: "Servicios", description: "Catálogo, horarios y precios" },
  { id: "rescheduling", title: "Re-agendamientos", description: "Reglas de cancelación y cambios" },
  { id: "payments", title: "Opciones de pago", description: "Métodos y restricciones" },
  { id: "intervention", title: "Intervención asistida", description: "Cuándo escalar a humanos" },
  { id: "faq", title: "Preguntas frecuentes", description: "Respuestas predefinidas" },
  { id: "limits", title: "Límites del agente", description: "Prohibiciones y restricciones" },
];

const SECTION_IDS = new Set<string>(sectionsList.map((s) => s.id));

export function isAgentSettingsSectionId(value: string | null | undefined): value is AgentSettingsSectionId {
  return !!value && SECTION_IDS.has(value);
}

export function getSectionTitle(sectionId: string | null | undefined): string {
  if (!sectionId) return "Sección";
  return sectionsList.find((s) => s.id === sectionId)?.title ?? sectionId;
}
