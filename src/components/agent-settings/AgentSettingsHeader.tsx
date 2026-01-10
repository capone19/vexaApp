import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import type { AgentSettingsSectionInfo } from "@/pages/AgentSettings";

interface AgentSettingsHeaderProps {
  currentSection: AgentSettingsSectionInfo;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

export function AgentSettingsHeader({
  currentSection,
  onSave,
  hasUnsavedChanges,
}: AgentSettingsHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-6 py-4">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ajustes-agente" className="text-muted-foreground hover:text-foreground">
              Ajustes del Agente
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-foreground font-medium">
              {currentSection.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header con acciones */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{currentSection.title}</h1>
            <p className="text-sm text-muted-foreground">{currentSection.description}</p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
              Sin guardar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" className="gap-2" onClick={onSave}>
            <Upload className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
