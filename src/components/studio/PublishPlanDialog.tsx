import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import {
  hasPublishPlan,
  newRule,
  normalizePlan,
  PLAN_PRESETS,
  presetRules,
  REEL_PLAN_PRESETS,
  SLOT_FORMAT_LABELS,
  WEEK_DAYS,
  type PlanRule,
  type SlotFormat,
} from "@/lib/studio/publish-plan";
import type { SocialAccount } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

interface PublishPlanDialogProps {
  account: SocialAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Frecuencia de publicación: qué días y a qué hora sale cada formato */
export function PublishPlanDialog({ account, open, onOpenChange }: PublishPlanDialogProps) {
  const { updateAccountPlan } = useStudio();
  const { toast } = useToast();
  const [rules, setRules] = useState<PlanRule[]>([]);
  const [saving, setSaving] = useState(false);
  // Instagram solo publica Reels: un formato y sus propias plantillas
  const isReels = account?.platform === "instagram";
  const presets = isReels ? REEL_PLAN_PRESETS : PLAN_PRESETS;

  useEffect(() => {
    if (!open) return;
    if (isReels) setRules(hasPublishPlan(account?.publishPlan) ? normalizePlan(account?.publishPlan).rules : presetRules("reel-recomendado"));
    else setRules(normalizePlan(account?.publishPlan).rules);
  }, [open, account, isReels]);

  const update = (id: string, patch: Partial<PlanRule>) => setRules((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const toggleDay = (rule: PlanRule, day: number) =>
    update(rule.id, { days: rule.days.includes(day) ? rule.days.filter((d) => d !== day) : [...rule.days, day] });

  const perWeek = (format: SlotFormat) => rules.filter((r) => r.format === format).reduce((n, r) => n + r.days.length, 0);
  const shorts = perWeek("short");
  const videos = perWeek("video");
  const reels = perWeek("reel");

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      await updateAccountPlan(account.id, { rules: rules.filter((r) => r.days.length > 0) });
      toast({ title: "Frecuencia guardada", description: "El calendario ya muestra los nuevos espacios." });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "No se pudo guardar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Frecuencia de publicación</DialogTitle>
          <DialogDescription>
            {isReels
              ? "Define qué días y a qué hora sale cada Reel. El calendario arma los espacios de cada semana y los usa al replicar desde YouTube."
              : "Define qué días y a qué hora sale cada formato. El calendario arma los espacios de cada semana y reparte tus videos solo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Empezar desde una plantilla</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setRules(presetRules(preset.id))}
                  className="rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <p className="text-sm font-medium">{preset.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{preset.detail}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horarios</Label>
              <span className="text-xs text-muted-foreground">
                {isReels
                  ? `${reels} ${reels === 1 ? "Reel" : "Reels"} por semana`
                  : `${shorts} Shorts y ${videos} ${videos === 1 ? "video" : "videos"} por semana`}
              </span>
            </div>
            {rules.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Agrega al menos un horario.</p>
            )}
            {rules.map((rule) => (
              <div key={rule.id} className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  {isReels ? (
                    <span className="rounded-md bg-pink-500/15 px-2.5 py-1 text-xs font-medium text-pink-300">{SLOT_FORMAT_LABELS.reel}</span>
                  ) : (
                    <div className="flex rounded-lg bg-secondary/60 p-0.5">
                      {(["short", "video"] as SlotFormat[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => update(rule.id, { format: f })}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            rule.format === f ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {SLOT_FORMAT_LABELS[f]}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    type="time"
                    value={rule.time}
                    onChange={(e) => e.target.value && update(rule.id, { time: e.target.value })}
                    className="h-8 w-[110px]"
                    aria-label="Hora"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setRules((list) => list.filter((r) => r.id !== rule.id))}
                    aria-label="Quitar horario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      title={day.long}
                      onClick={() => toggleDay(rule, day.value)}
                      className={cn(
                        "h-8 w-8 rounded-full border text-xs font-semibold transition-colors",
                        rule.days.includes(day.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              {isReels ? (
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setRules((l) => [...l, newRule("reel")])}>
                  <Plus className="h-3.5 w-3.5" />
                  Horario de Reels
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setRules((l) => [...l, newRule("short")])}>
                    <Plus className="h-3.5 w-3.5" />
                    Horario de Shorts
                  </Button>
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setRules((l) => [...l, { ...newRule("video"), days: [6] }])}>
                    <Plus className="h-3.5 w-3.5" />
                    Horario de videos
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {isReels
              ? "Las horas son las de este computador. Instagram publica cada Reel solo a su hora, aunque este PC esté apagado."
              : "Las horas son las de este computador. Cada subida gasta cuota de la API de YouTube (~1.600 unidades de 10.000 diarias): una semana completa se programa en 1 o 2 días."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || rules.length === 0} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar frecuencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
