import { useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/components/studio/YouTubeUploadDialog";
import { useToast } from "@/hooks/use-toast";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Nombre de lo que se mueve (Reel, Short o video) */
  itemTitle: string;
  current: Date;
  /** Margen mínimo desde ahora para aceptar la nueva hora */
  minLeadMs: number;
  /** Próximo espacio libre del plan (si hay plan) */
  suggest?: () => Date | null;
  /** Aviso no bloqueante para la hora elegida (por ejemplo, choca con otro Reel) */
  warning?: (at: Date) => string | null;
  /** Texto del checkbox para mover también la publicación gemela */
  twinLabel?: string | null;
  onConfirm: (at: Date, moveTwin: boolean) => Promise<void>;
}

/** Cambiar la fecha y hora de algo que todavía no se publica */
export function RescheduleDialog({
  open,
  onOpenChange,
  title,
  itemTitle,
  current,
  minLeadMs,
  suggest,
  warning,
  twinLabel,
  onConfirm,
}: RescheduleDialogProps) {
  const { toast } = useToast();
  const [whenLocal, setWhenLocal] = useState("");
  const [moveTwin, setMoveTwin] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWhenLocal(toLocalInput(current));
    setMoveTwin(true);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const when = whenLocal ? new Date(whenLocal) : null;
  const valid = Boolean(when && !Number.isNaN(when.getTime()));
  const tooSoon = !valid || (when as Date).getTime() < Date.now() + minLeadMs;
  const unchanged = valid && (when as Date).getTime() === new Date(toLocalInput(current)).getTime();
  const notice = valid && !tooSoon && warning ? warning(when as Date) : null;
  const suggested = suggest?.() ?? null;
  const leadMinutes = Math.round(minLeadMs / 60_000);

  const confirm = async () => {
    if (!when || tooSoon) return;
    setBusy(true);
    try {
      await onConfirm(when, Boolean(twinLabel) && moveTwin);
      onOpenChange(false);
    } catch (err) {
      toast({ title: "No se pudo cambiar la fecha", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="line-clamp-2">{itemTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-when">Nueva fecha y hora</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="reschedule-when"
                type="datetime-local"
                value={whenLocal}
                disabled={busy}
                onChange={(e) => setWhenLocal(e.target.value)}
                className="w-auto"
              />
              {suggested && (
                <Button variant="secondary" size="sm" className="h-10 gap-1.5" disabled={busy} onClick={() => setWhenLocal(toLocalInput(suggested))}>
                  <CalendarPlus className="h-4 w-4" />
                  Próximo hueco
                </Button>
              )}
            </div>
            {tooSoon && <p className="text-[11px] text-amber-400">Elige una hora con al menos {leadMinutes} minutos de anticipación.</p>}
            {notice && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-400">
                <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                {notice}
              </p>
            )}
          </div>

          {twinLabel && (
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <Checkbox checked={moveTwin} disabled={busy} onCheckedChange={(v) => setMoveTwin(v === true)} className="mt-0.5" />
              <span>{twinLabel}</span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="gap-1.5" disabled={busy || tooSoon || unchanged} onClick={() => void confirm()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            Guardar nueva fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
