import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AgentSettingsSidebar } from "@/components/agent-settings/AgentSettingsSidebar";
import { AgentSettingsHeader } from "@/components/agent-settings/AgentSettingsHeader";
import { PersonalitySection } from "@/components/agent-settings/sections/PersonalitySection";
import { BusinessSection } from "@/components/agent-settings/sections/BusinessSection";
import { PoliciesSection } from "@/components/agent-settings/sections/PoliciesSection";
import { ServicesSection } from "@/components/agent-settings/sections/ServicesSection";
import { ReschedulingSection } from "@/components/agent-settings/sections/ReschedulingSection";
import { PaymentsSection } from "@/components/agent-settings/sections/PaymentsSection";
import { InterventionSection } from "@/components/agent-settings/sections/InterventionSection";
import { FAQSection } from "@/components/agent-settings/sections/FAQSection";
import { LimitsSection } from "@/components/agent-settings/sections/LimitsSection";
import { mockAgentSettings } from "@/lib/mock/data";
import type { AgentSettings as AgentSettingsType } from "@/lib/types";

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

const sectionsList: Omit<AgentSettingsSectionInfo, "lastModified">[] = [
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

export default function AgentSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = (searchParams.get("section") as AgentSettingsSectionId) || "personality";
  const [settings, setSettings] = useState<AgentSettingsType>(mockAgentSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSectionChange = (sectionId: AgentSettingsSectionId) => {
    setSearchParams({ section: sectionId });
  };

  const getLastModified = (sectionId: AgentSettingsSectionId): Date => {
    switch (sectionId) {
      case "personality": return settings.personality.lastModified;
      case "business": return settings.business.lastModified;
      case "policies": return settings.policies.lastModified;
      case "services": return settings.services.lastModified;
      case "rescheduling": return settings.rescheduling.lastModified;
      case "payments": return settings.payments.lastModified;
      case "intervention": return settings.intervention.lastModified;
      case "faq": return settings.faq.lastModified;
      case "limits": return settings.limits.lastModified;
      default: return new Date();
    }
  };

  const sections: AgentSettingsSectionInfo[] = sectionsList.map(s => ({
    ...s,
    lastModified: getLastModified(s.id),
  }));

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  const handleSettingsChange = (newSettings: Partial<AgentSettingsType>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // Mock save - in real app would call API
    console.log("Saving settings:", settings);
    setHasUnsavedChanges(false);
  };

  const handlePublish = () => {
    // Mock publish
    console.log("Publishing settings");
    setHasUnsavedChanges(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "personality":
        return (
          <PersonalitySection
            settings={settings.personality}
            onChange={(personality) => handleSettingsChange({ personality })}
          />
        );
      case "business":
        return (
          <BusinessSection
            settings={settings.business}
            onChange={(business) => handleSettingsChange({ business })}
          />
        );
      case "policies":
        return (
          <PoliciesSection
            settings={settings.policies}
            onChange={(policies) => handleSettingsChange({ policies })}
          />
        );
      case "services":
        return (
          <ServicesSection
            settings={settings.services}
            onChange={(services) => handleSettingsChange({ services })}
          />
        );
      case "rescheduling":
        return (
          <ReschedulingSection
            settings={settings.rescheduling}
            onChange={(rescheduling) => handleSettingsChange({ rescheduling })}
          />
        );
      case "payments":
        return (
          <PaymentsSection
            settings={settings.payments}
            onChange={(payments) => handleSettingsChange({ payments })}
          />
        );
      case "intervention":
        return (
          <InterventionSection
            settings={settings.intervention}
            onChange={(intervention) => handleSettingsChange({ intervention })}
          />
        );
      case "faq":
        return (
          <FAQSection
            settings={settings.faq}
            onChange={(faq) => handleSettingsChange({ faq })}
          />
        );
      case "limits":
        return (
          <LimitsSection
            settings={settings.limits}
            onChange={(limits) => handleSettingsChange({ limits })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar de secciones */}
        <AgentSettingsSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AgentSettingsHeader
            currentSection={currentSection}
            onPublish={handlePublish}
            hasUnsavedChanges={hasUnsavedChanges}
          />

          {/* Contenido de la sección */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {renderSection()}
          </div>

          {/* Botón flotante guardar */}
          {hasUnsavedChanges && (
            <div className="sticky bottom-0 border-t border-border bg-background p-4 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
