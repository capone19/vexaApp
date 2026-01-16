import { useState, useEffect, useCallback, useRef } from "react";
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
import { getEmptyAgentSettings } from "@/lib/mock/empty-defaults";
import type { AgentSettings as AgentSettingsType } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { saveAgentSection, loadAgentSection } from "@/lib/api/save-agent-section";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const [settings, setSettings] = useState<AgentSettingsType>(getEmptyAgentSettings());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();

  // Cargar datos guardados de todas las secciones al montar
  const loadAllSections = useCallback(async () => {
    if (!user?.tenantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const sectionIds: AgentSettingsSectionId[] = [
        "personality", "business", "policies", "services", 
        "rescheduling", "payments", "intervention", "faq", "limits"
      ];

      // Cargar todas las secciones en paralelo
      const loadPromises = sectionIds.map(async (sectionId) => {
        const data = await loadAgentSection(sectionId, user.tenantId!);
        return { sectionId, data };
      });

      const results = await Promise.all(loadPromises);

      // Aplicar los datos cargados al estado
      setSettings(prev => {
        const updated = { ...prev };
        
        for (const { sectionId, data } of results) {
          if (data) {
            // Merge con los datos existentes para mantener estructura
            const emptyDefaults = getEmptyAgentSettings();
            (updated as any)[sectionId] = {
              ...emptyDefaults[sectionId as keyof typeof emptyDefaults],
              ...data,
              lastModified: data.lastModified ? new Date(data.lastModified as string) : new Date(),
            };
          }
        }
        
        return updated;
      });

      console.log("[AgentSettings] Datos cargados desde DB:", results.filter(r => r.data).length, "secciones");
    } catch (error) {
      console.error("[AgentSettings] Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId]);

  // Cargar datos al montar y cuando cambie el tenant
  useEffect(() => {
    loadAllSections();
  }, [loadAllSections]);

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

  // Ref para evitar clicks concurrentes (más confiable que solo el estado)
  const isSavingRef = useRef(false);

  const handleSave = async () => {
    // Doble verificación: estado + ref para evitar race conditions
    if (isSaving || isSavingRef.current) {
      console.log("[AgentSettings] Guardado ignorado - ya hay uno en progreso");
      return;
    }

    // No permitir guardar si aún no tenemos tenantId (evita usar DEV_CLIENT_ID y que falle RLS)
    if (!user?.tenantId) {
      console.warn("[AgentSettings] tenantId no disponible:", { user, tenantId: user?.tenantId });
      toast({
        title: "Cargando sesión...",
        description: "Espera un momento mientras se carga tu sesión.",
      });
      return;
    }

    // Marcar como guardando ANTES de cualquier operación async
    isSavingRef.current = true;
    setIsSaving(true);

    // Timeout de seguridad: nunca dejar el botón bloqueado más de 15 segundos
    const safetyTimeout = setTimeout(() => {
      console.warn("[AgentSettings] Safety timeout reached - resetting save state");
      isSavingRef.current = false;
      setIsSaving(false);
      toast({
        title: "Tiempo agotado",
        description: "El guardado tardó demasiado. Los cambios pueden haberse guardado parcialmente.",
        variant: "destructive",
      });
    }, 15000);

    try {
      const sectionData = getSectionData(activeSection);

      console.log("[AgentSettings] Iniciando guardado de sección:", activeSection);

      const tenantId = user.tenantId;

      // REGLA: 1 botón = 1 evento = 1 sección
      // Envía DATA RAW COMPLETA de la sección activa
      const result = await saveAgentSection(
        activeSection,
        sectionData,
        tenantId,
        user?.id || null
      );

      clearTimeout(safetyTimeout);

      if (result.success) {
        toast({
          title: "✅ Cambios guardados",
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
          description: result.error || "No se pudo guardar. Reintenta.",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error("[AgentSettings] Error al guardar:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar. Reintenta.",
        variant: "destructive",
      });
    } finally {
      clearTimeout(safetyTimeout);
      isSavingRef.current = false;
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
            services={settings.services.services}
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
              tenantId={user?.tenantId}
            />

            {/* Contenido de la sección */}
            <div className={cn(
              "flex-1 overflow-y-auto bg-background",
              isMobile ? "p-4" : "p-6"
            )}>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderSection()
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
