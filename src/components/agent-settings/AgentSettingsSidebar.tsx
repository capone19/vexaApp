import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Smile,
  Building2,
  FileText,
  Briefcase,
  CalendarClock,
  CreditCard,
  Users,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import type { AgentSettingsSectionId, AgentSettingsSectionInfo } from "@/pages/AgentSettings";

interface AgentSettingsSidebarProps {
  sections: AgentSettingsSectionInfo[];
  activeSection: AgentSettingsSectionId;
  onSectionChange: (sectionId: AgentSettingsSectionId) => void;
}

const sectionIcons: Record<AgentSettingsSectionId, React.ElementType> = {
  personality: Smile,
  business: Building2,
  policies: FileText,
  services: Briefcase,
  rescheduling: CalendarClock,
  payments: CreditCard,
  intervention: Users,
  faq: HelpCircle,
  limits: ShieldAlert,
};

export function AgentSettingsSidebar({
  sections,
  activeSection,
  onSectionChange,
}: AgentSettingsSidebarProps) {
  return (
    <aside className="w-80 border-r border-border bg-card overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-foreground mb-1">Configuración</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Personaliza el comportamiento de tu agente
        </p>

        <div className="space-y-1">
          {sections.map((section) => {
            const Icon = sectionIcons[section.id];
            const isActive = section.id === activeSection;

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full text-left rounded-lg p-3 transition-all",
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-background hover:bg-secondary border border-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "font-medium text-sm truncate",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {section.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {section.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Modificado: {format(section.lastModified, "dd MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
