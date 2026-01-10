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
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { saveAgentSection } from "@/lib/api/save-agent-section";
import { useToast } from "@/hooks/use-toast";

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
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Obtener la data de la sección activa
  const getSectionData = (sectionId: AgentSettingsSectionId): Record<string, unknown> => {
    switch (sectionId) {
      case "personality": return settings.personality as unknown as Record<string, unknown>;
      case "business": return settings.business as unknown as Record<string, unknown>;
      case "policies": return settings.policies as unknown as Record<string, unknown>;
      case "services": return settings.services as unknown as Record<string, unknown>;
      case "rescheduling": return settings.rescheduling as unknown as Record<string, unknown>;
      case "payments": return settings.payments as unknown as Record<string, unknown>;
      case "intervention": return settings.intervention as unknown as Record<string, unknown>;
      case "faq": return settings.faq as unknown as Record<string, unknown>;
      case "limits": return settings.limits as unknown as Record<string, unknown>;
      default: return {};
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const sectionData = getSectionData(activeSection);
      
      // REGLA: 1 botón = 1 evento = 1 sección
      // Envía DATA RAW COMPLETA de la sección activa
      const result = await saveAgentSection(
        activeSection,
        sectionData,
        user?.tenantId || "demo-tenant",
        user?.id || null
      );

      if (result.success) {
        toast({
          title: "Cambios guardados",
          description: "Cambios guardados y enviados para procesamiento.",
        });
        setHasUnsavedChanges(false);
      } else if (result.cloudSaved && !result.webhookSent) {
        // Guardado local pero webhook falló
        toast({
          title: "Guardado parcial",
          description: "Cambios guardados localmente. El procesamiento se reintentará.",
          variant: "default",
        });
        setHasUnsavedChanges(false);
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar la información. Reintenta.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[AgentSettings] Error al guardar:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la información. Reintenta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className={cn(
        "flex flex-col overflow-hidden",
        isMobile ? "h-auto min-h-[calc(100vh-8rem)]" : "h-[calc(100vh-4rem)]"
      )}>
        {/* Mobile: Horizontal section tabs at top */}
        {isMobile && (
          <AgentSettingsSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        )}

        <div className={cn(
          "flex flex-1 overflow-hidden",
          isMobile ? "flex-col" : "flex-row"
        )}>
          {/* Desktop: Sidebar de secciones */}
          {!isMobile && (
            <AgentSettingsSidebar
              sections={sections}
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />
          )}

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <AgentSettingsHeader
              currentSection={currentSection}
              onSave={handleSave}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
            />

            {/* Contenido de la sección */}
            <div className={cn(
              "flex-1 overflow-y-auto bg-background",
              isMobile ? "p-4" : "p-6"
            )}>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
