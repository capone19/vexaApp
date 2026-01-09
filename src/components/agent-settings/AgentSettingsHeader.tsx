import { ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  activeTab: "live" | "playground";
  onTabChange: (tab: "live" | "playground") => void;
  onPublish: () => void;
  hasUnsavedChanges: boolean;
}

export function AgentSettingsHeader({
  currentSection,
  activeTab,
  onTabChange,
  onPublish,
  hasUnsavedChanges,
}: AgentSettingsHeaderProps) {
  return (
    <div className="border-b border-border bg-card/30 px-6 py-4">
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
            <Badge variant="outline" className="border-warning text-warning">
              Sin guardar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs versión */}
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "live" | "playground")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="live" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Versión en vivo
              </TabsTrigger>
              <TabsTrigger value="playground" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Playground
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Botones */}
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Probar en playground
          </Button>
          <Button size="sm" className="gap-2 glow-subtle" onClick={onPublish}>
            <Upload className="h-4 w-4" />
            Publicar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
