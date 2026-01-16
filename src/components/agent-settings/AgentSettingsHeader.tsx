import { Upload, Loader2 } from "lucide-react";
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
import { PlaygroundChat } from "./PlaygroundChat";
import type { AgentSettingsSectionInfo } from "@/pages/AgentSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AgentSettingsHeaderProps {
  currentSection: AgentSettingsSectionInfo;
  onSave: () => void;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  tenantId?: string;
  isReady?: boolean;
}

export function AgentSettingsHeader({
  currentSection,
  onSave,
  hasUnsavedChanges,
  isSaving = false,
  tenantId,
  isReady = true,
}: AgentSettingsHeaderProps) {
  const isMobile = useIsMobile();
  
  // El botón está deshabilitado si está guardando O si el usuario no está listo
  const isButtonDisabled = isSaving || !isReady;

  return (
    <div className={cn(
      "border-b border-border bg-background",
      isMobile ? "px-4 py-3" : "px-6 py-4"
    )}>
      {/* Breadcrumb - Desktop only */}
      {!isMobile && (
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
      )}

      {/* Header con acciones */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className={cn(
              "font-semibold text-foreground truncate",
              isMobile ? "text-base" : "text-xl"
            )}>
              {currentSection.title}
            </h1>
            {!isMobile && (
              <p className="text-sm text-muted-foreground">{currentSection.description}</p>
            )}
          </div>
          {hasUnsavedChanges && (
            <Badge 
              variant="outline" 
              className={cn(
                "border-warning/50 bg-warning/10 text-warning shrink-0",
                isMobile && "text-[10px] px-1.5 py-0.5"
              )}
            >
              Sin guardar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Playground */}
          <PlaygroundChat tenantId={tenantId} />
          
          {/* Botón Guardar */}
          <Button 
            size={isMobile ? "sm" : "sm"} 
            className={cn("gap-2", isMobile && "px-3")} 
            onClick={onSave}
            disabled={isButtonDisabled}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {!isMobile && (isSaving ? "Guardando..." : "Guardar cambios")}
            {isMobile && (isSaving ? "..." : "Guardar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
