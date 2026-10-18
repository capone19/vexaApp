import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, FileVideo, Loader2, Rocket, Save, UploadCloud, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { AiBadge } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useToast } from "@/hooks/use-toast";
import { sendStudioEvent } from "@/lib/studio/n8n";
import { FORMAT_LABELS, PLATFORMS } from "@/lib/studio/platforms";
import type { PlatformAction, PlatformId, PostFormat, PostStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

type PublishMode = "ahora" | "programar" | "borrador";

interface GeneratedMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

interface PostComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PlatformId;
  action: PlatformAction | null;
  /** Cuentas preseleccionadas */
  accountIds?: string[];
}

const modeLabels: Record<PublishMode, { label: string; icon: React.ElementType }> = {
  ahora: { label: "Publicar ahora", icon: Rocket },
  programar: { label: "Programar", icon: CalendarClock },
  borrador: { label: "Guardar borrador", icon: Save },
};

function defaultScheduleValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Compositor genérico de Instagram y TikTok (YouTube usa YouTubeUploadDialog y la Programación) */
export function PostComposerDialog({ open, onOpenChange, platform, action, accountIds }: PostComposerDialogProps) {
  const meta = PLATFORMS[platform];
  const { accountsFor, addPost } = useStudio();
  const { tenantId } = useEffectiveTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const managedAccounts = useMemo(() => accountsFor(platform).filter((a) => a.managed), [accountsFor, platform]);

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [format, setFormat] = useState<PostFormat>(meta.formats[0]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<PublishMode>("programar");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue);
  const [shortsCount, setShortsCount] = useState("3");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isShorts = action?.id === "video-a-shorts";
  const isSchedule = action?.id === "programar";

  useEffect(() => {
    if (!open) return;
    const preselected = accountIds?.filter((id) => managedAccounts.some((a) => a.id === id)) ?? [];
    setSelectedAccounts(preselected.length ? preselected : managedAccounts.slice(0, 1).map((a) => a.id));
    setFormat(action?.format ?? meta.formats[0]);
    setFile(null);
    setTitle("");
    setDescription("");
    setTags("");
    setMode(isSchedule ? "programar" : "ahora");
    setScheduledAt(defaultScheduleValue());
    // Solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleAccount = (id: string) =>
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await sendStudioEvent<GeneratedMetadata>({
      event: `${platform}.metadata.generate`,
      tenant_id: tenantId,
      platform,
      account_ids: selectedAccounts,
      data: { format, file_name: file?.name ?? null, title, description, tags: parsedTags },
    });
    setGenerating(false);

    if (result.notConfigured) {
      toast({
        title: "IA sin conectar todavía",
        description: "Falta configurar NEXT_PUBLIC_N8N_WEBHOOK_STUDIO para generar título, descripción y tags.",
      });
      return;
    }
    if (!result.success || !result.data) {
      toast({ title: "No se pudo generar", description: result.error ?? "n8n no devolvió datos.", variant: "destructive" });
      return;
    }
    if (result.data.title) setTitle(result.data.title);
    if (result.data.description) setDescription(result.data.description);
    if (result.data.tags?.length) setTags(result.data.tags.join(", "));
    toast({ title: "Contenido generado con IA" });
  };

  const canSubmit = selectedAccounts.length > 0 && (title.trim().length > 0 || isShorts) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !action) return;
    setSubmitting(true);

    const status: PostStatus = mode === "borrador" ? "borrador" : mode === "programar" ? "programado" : "procesando";
    const scheduledIso = mode === "programar" ? new Date(scheduledAt).toISOString() : undefined;
    const postTitle = title.trim() || `Shorts de ${file?.name ?? "video"}`;

    selectedAccounts.forEach((accountId) =>
      addPost({
        platform,
        accountId,
        format: isShorts ? "short" : format,
        title: postTitle,
        description,
        tags: parsedTags,
        status,
        scheduledAt: scheduledIso,
      })
    );

    // El archivo se sube a storage en la siguiente fase; por ahora n8n recibe sus metadatos
    const result =
      mode === "borrador"
        ? { success: true }
        : await sendStudioEvent({
            event: action.n8nEvent,
            tenant_id: tenantId,
            platform,
            account_ids: selectedAccounts,
            data: {
              format: isShorts ? "short" : format,
              title: postTitle,
              description,
              tags: parsedTags,
              scheduled_at: scheduledIso ?? null,
              publish_now: mode === "ahora",
              file: file ? { name: file.name, size: file.size, type: file.type } : null,
              ...(isShorts ? { shorts_count: Number(shortsCount) } : {}),
            },
          });

    setSubmitting(false);
    const notConfigured = "notConfigured" in result && result.notConfigured;
    toast({
      title: mode === "borrador" ? "Borrador guardado" : mode === "programar" ? "Publicación programada" : "Enviado a publicar",
      description: notConfigured
        ? "Guardado en el Studio. Para publicar de verdad falta conectar el webhook de n8n."
        : result.success
          ? undefined
          : `n8n no respondió: ${"error" in result ? result.error : ""}`,
    });
    onOpenChange(false);
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", meta.chipClassName)}>
              <PlatformIcon platform={platform} />
            </span>
            <span className="flex items-center gap-2">
              {action.title}
              {action.ai && <AiBadge />}
            </span>
          </DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cuentas */}
          <div className="space-y-2">
            <Label>Publicar en</Label>
            {managedAccounts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                No tienes cuentas de {meta.name} gestionadas. Conéctalas en "Cuentas conectadas".
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {managedAccounts.map((acc) => {
                  const checked = selectedAccounts.includes(acc.id);
                  return (
                    <label
                      key={acc.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                        checked ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleAccount(acc.id)} />
                      {acc.handle}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Archivo */}
          <div className="space-y-2">
            <Label>{isShorts ? "Video original" : "Archivo"}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={format === "carrusel" || format === "imagen" ? "image/*,video/*" : "video/*"}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                <FileVideo className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFile(null)} aria-label="Quitar archivo">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <UploadCloud className="h-8 w-8 text-primary" />
                Arrastra tu archivo o haz clic para seleccionarlo
              </button>
            )}
          </div>

          {isShorts ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cantidad de Shorts</Label>
                <Select value={shortsCount} onValueChange={setShortsCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {n} {n === "1" ? "Short" : "Shorts"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título base (opcional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="La IA lo propone si lo dejas vacío" />
              </div>
            </div>
          ) : (
            <>
              {meta.formats.length > 1 && (
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <div className="flex flex-wrap gap-2">
                    {meta.formats.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          format === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {FORMAT_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadatos */}
              <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Contenido</p>
                  <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating} className="gap-2">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
                    Rellenar con IA
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="composer-title">{platform === "youtube" ? "Título" : "Nombre interno"}</Label>
                  <Input id="composer-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="composer-desc">{platform === "youtube" ? "Descripción" : "Caption"}</Label>
                  <Textarea id="composer-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="composer-tags">{platform === "youtube" ? "Tags" : "Hashtags"} (separados por coma)</Label>
                  <Input id="composer-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ia, automatizacion, ventas" />
                </div>
              </div>
            </>
          )}

          {/* Publicación */}
          <div className="space-y-3">
            <Label>Cuándo</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(modeLabels) as PublishMode[]).map((m) => {
                const Icon = modeLabels[m].icon;
                return (
                  <button
                    key={m}
                    type="button"
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
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isShorts ? "Generar Shorts" : modeLabels[mode].label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
