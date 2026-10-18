import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Rocket, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelProfileDialog } from "@/components/studio/ChannelProfileDialog";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { YouTubeDraftEditor } from "@/components/studio/YouTubeDraftEditor";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeProfile } from "@/lib/studio/ai";
import { PLATFORMS } from "@/lib/studio/platforms";
import type { SocialAccount } from "@/lib/studio/types";
import { draftProblems, newDraft, publishDraft, saveDraft, type YouTubeDraft } from "@/lib/studio/youtube-draft";
import type { Privacy } from "@/lib/studio/youtube-upload";
import { cn } from "@/lib/utils";

type PublishMode = "ahora" | "programar" | "borrador";

const modeLabels: Record<PublishMode, { label: string; icon: React.ElementType }> = {
  ahora: { label: "Publicar ahora", icon: Rocket },
  programar: { label: "Programar", icon: CalendarClock },
  borrador: { label: "Guardar borrador", icon: Save },
};

const privacyLabels: Record<Privacy, string> = {
  public: "Público",
  unlisted: "No listado",
  private: "Privado",
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function defaultSchedule() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return toLocalInput(d);
}

interface YouTubeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Canal preseleccionado */
  accountId?: string;
}

/** Subir un video a YouTube: publicarlo ya, programarlo o dejarlo como borrador en la Programación */
export function YouTubeUploadDialog({ open, onOpenChange, accountId }: YouTubeUploadDialogProps) {
  const meta = PLATFORMS.youtube;
  const { accountsFor, addPost } = useStudio();
  const { toast } = useToast();
  const channels = useMemo(() => accountsFor("youtube").filter((a) => a.managed && a.remote), [accountsFor]);

  const [channelId, setChannelId] = useState("");
  const [draft, setDraft] = useState<YouTubeDraft | null>(null);
  const [mode, setMode] = useState<PublishMode>("ahora");
  const [scheduledAt, setScheduledAt] = useState(defaultSchedule);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [profileAccount, setProfileAccount] = useState<SocialAccount | null>(null);

  const channel = channels.find((a) => a.id === channelId) ?? null;
  const profile = useMemo(() => normalizeProfile(channel?.aiProfile), [channel]);

  useEffect(() => {
    if (!open) return;
    const initial = channels.find((a) => a.id === accountId) ?? channels[0];
    setChannelId(initial?.id ?? "");
    setDraft(initial ? newDraft(initial.id, normalizeProfile(initial.aiProfile)) : null);
    setMode("ahora");
    setScheduledAt(defaultSchedule());
    setPrivacy("public");
    setStatus(null);
    setProgress(0);
    // Solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeChannel = (id: string) => {
    setChannelId(id);
    const next = channels.find((a) => a.id === id);
    const p = normalizeProfile(next?.aiProfile);
    setDraft((d) => (d ? { ...d, accountId: id, language: p.language, useLocalizations: p.localize_to.length > 0 } : d));
  };

  const update = (patch: Partial<YouTubeDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const problems = draft ? draftProblems(draft, false).filter((p) => mode !== "borrador" || p !== "Falta el título") : [];
  const canSubmit = Boolean(draft && channel) && problems.length === 0 && !busy && !submitting;

  const handleSubmit = async () => {
    if (!draft || !channel || !canSubmit) return;
    const publishAt = mode === "programar" ? new Date(scheduledAt).toISOString() : undefined;
    if (publishAt && new Date(publishAt).getTime() < Date.now() + 15 * 60_000) {
      toast({ title: "Elige una hora futura", description: "Programa al menos 15 minutos después de ahora.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "borrador") {
        await saveDraft({ ...draft, scheduledAt: null });
        toast({ title: "Borrador guardado", description: "Lo encuentras en Programación, listo para asignarle fecha." });
        onOpenChange(false);
        return;
      }
      setProgress(0);
      const { videoId, warnings } = await publishDraft(draft, {
        categoryId: profile.category_id,
        privacy,
        publishAt,
        onStatus: setStatus,
        onProgress: setProgress,
      });
      addPost({
        platform: "youtube",
        accountId: channel.id,
        format: draft.format,
        title: draft.title.trim(),
        description: draft.description,
        tags: [],
        status: publishAt ? "programado" : "publicado",
        scheduledAt: publishAt,
        externalId: videoId,
        url: `https://youtu.be/${videoId}`,
      });
      toast({
        title: publishAt ? "Video programado en YouTube" : "Video subido a YouTube",
        description: warnings.length ? warnings.join(" · ") : "YouTube lo está procesando; aparecerá en el canal en unos minutos.",
      });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "No se pudo subir", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setStatus(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !submitting && !busy && onOpenChange(next)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", meta.chipClassName)}>
                <PlatformIcon platform="youtube" />
              </span>
              Subir video
            </DialogTitle>
            <DialogDescription>El archivo va directo de tu PC a YouTube, con título, descripción, subtítulos y miniatura.</DialogDescription>
          </DialogHeader>

          {channels.length === 0 || !draft ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Conecta un canal de YouTube en "Cuentas conectadas" para subir videos.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channelId} onValueChange={changeChannel} disabled={submitting || busy}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.handle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {channel && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setProfileAccount(channel)}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Perfil del canal
                  </Button>
                )}
              </div>

              <YouTubeDraftEditor
                draft={draft}
                onChange={update}
                profile={profile}
                channelName={channel?.displayName}
                disabled={submitting}
                onBusyChange={setBusy}
              />

              <div className="space-y-3">
                <Label>Cuándo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(modeLabels) as PublishMode[]).map((m) => {
                    const Icon = modeLabels[m].icon;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={submitting}
                        onClick={() => setMode(m)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                          mode === m ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {modeLabels[m].label}
                      </button>
                    );
                  })}
                </div>
                {mode === "programar" && (
                  <>
                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} disabled={submitting} />
                    <p className="text-xs text-muted-foreground">Se sube ahora como privado y YouTube lo publica solo a esa hora.</p>
                  </>
                )}
                {mode === "ahora" && (
                  <Select value={privacy} onValueChange={(v) => setPrivacy(v as Privacy)} disabled={submitting}>
                    <SelectTrigger aria-label="Visibilidad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(privacyLabels) as Privacy[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {privacyLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {mode === "borrador" && (
                  <p className="text-xs text-muted-foreground">
                    Queda guardado en este PC (con el video) dentro de Programación, para asignarle fecha después.
                  </p>
                )}
              </div>

              {status && (
                <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{status}</span>
                    <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
                  </div>
                  <Progress value={progress * 100} />
                  <p className="text-xs text-muted-foreground">No cierres esta ventana hasta que termine.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="items-center gap-2">
            {problems.length > 0 && draft?.file && <p className="mr-auto text-xs text-muted-foreground">{problems.join(" · ")}</p>}
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting || busy}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!canSubmit} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {modeLabels[mode].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChannelProfileDialog account={profileAccount} onOpenChange={(next) => !next && setProfileAccount(null)} />
    </>
  );
}
