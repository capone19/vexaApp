import { Clock, Workflow } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { AiBadge, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useToast } from "@/hooks/use-toast";
import { sendStudioEvent } from "@/lib/studio/n8n";
import type { StudioAutomation } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export default function StudioAutomatizaciones() {
  const { automations, toggleAutomation } = useStudio();
  const { tenantId } = useEffectiveTenant();
  const { toast } = useToast();

  const handleToggle = async (automation: StudioAutomation) => {
    const enabled = !automation.enabled;
    toggleAutomation(automation.id);
    const result = await sendStudioEvent({
      event: "studio.automation.toggle",
      tenant_id: tenantId,
      platform: automation.platforms.length === 1 ? automation.platforms[0] : "multi",
      account_ids: [],
      data: { automation_id: automation.id, enabled, cron: automation.cron ?? null },
    });
    if (!result.success && !result.notConfigured) {
      toast({ title: "No se pudo avisar a n8n", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <StudioPageHeader
        eyebrow="Piloto automático"
        title="Automatizaciones"
        subtitle="Reglas que corren solas en n8n: cronos, cross-post y generación con IA."
        icon={
          <span className="studio-gradient-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white">
            <Workflow className="h-7 w-7" />
          </span>
        }
      />

      <div className="space-y-3">
        {automations.map((a) => (
          <StudioCard
            key={a.id}
            className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", a.enabled && "studio-glow")}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{a.title}</p>
                {a.ai && <AiBadge />}
              </div>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {a.trigger}
                  {a.cron && <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{a.cron}</code>}
                </span>
                <span className="flex items-center gap-1">
                  {a.platforms.map((p) => (
                    <PlatformIcon key={p} platform={p} className="h-3.5 w-3.5" />
                  ))}
                </span>
              </div>
            </div>
            <Switch checked={a.enabled} onCheckedChange={() => handleToggle(a)} aria-label={`Activar ${a.title}`} />
          </StudioCard>
        ))}
      </div>
    </div>
  );
}
