import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Captions,
  Copy,
  FileVideo,
  ImageIcon,
  Languages,
  Loader2,
  Rocket,
  Save,
  Settings2,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChannelProfileDialog } from "@/components/studio/ChannelProfileDialog";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { AiBadge } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useToast } from "@/hooks/use-toast";
import { ANGLE_LABELS, generateMetadata, LANGUAGES, normalizeProfile, transcribeAudio, type GeneratedMetadata } from "@/lib/studio/ai";
import { captureFrames, extractAudioChunks, getVideoInfo, type VideoInfo } from "@/lib/studio/media";
import { sendStudioEvent } from "@/lib/studio/n8n";
import { FORMAT_LABELS, PLATFORMS } from "@/lib/studio/platforms";
import { cuesToTranscript, parseSubtitles, type Cue } from "@/lib/studio/subtitles";
import type { PlatformAction, PlatformId, PostFormat, PostStatus, SocialAccount } from "@/lib/studio/types";
import { getUploadToken, setThumbnail, uploadCaptions, uploadVideo, type Privacy } from "@/lib/studio/youtube-upload";
import { cn } from "@/lib/utils";

type PublishMode = "ahora" | "programar" | "borrador";

interface N8nMetadata {
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

const privacyLabels: Record<Privacy, string> = {
  public: "Público",
  unlisted: "No listado",
  private: "Privado",
};

/** Whisper cobra ~US$0,006 por minuto */
const TRANSCRIBE_USD_PER_MIN = 0.006;

function defaultScheduleValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SmallFilePicker({
  icon: Icon,
  label,
  accept,
  file,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file ? (
        <>
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(null)} aria-label={`Quitar ${label}`}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="flex-1 text-left text-muted-foreground hover:text-foreground">
          {label}
        </button>
      )}
    </div>
  );
}

export function PostComposerDialog({ open, onOpenChange, platform, action, accountIds }: PostComposerDialogProps) {
  const meta = PLATFORMS[platform];
  const { accountsFor, addPost } = useStudio();
  const { tenantId } = useEffectiveTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Transcripción ya pagada de este archivo: cambiar idioma o regenerar no vuelve a transcribir
  const transcriptCache = useRef<{ file: File; cues: Cue[] } | null>(null);

  const managedAccounts = useMemo(() => accountsFor(platform).filter((a) => a.managed), [accountsFor, platform]);

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [format, setFormat] = useState<PostFormat>(meta.formats[0]);
  const [file, setFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("en");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [mode, setMode] = useState<PublishMode>("programar");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue);
  const [shortsCount, setShortsCount] = useState("3");
  const [generating, setGenerating] = useState(false);
  const [aiStep, setAiStep] = useState<string | null>(null);
  const [needsTranscribe, setNeedsTranscribe] = useState(false);
  const [ai, setAi] = useState<GeneratedMetadata | null>(null);
  const [useLocalizations, setUseLocalizations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [profileAccount, setProfileAccount] = useState<SocialAccount | null>(null);

  const isShorts = action?.id === "video-a-shorts";
  const isSchedule = action?.id === "programar";
  const isYouTubeUpload = platform === "youtube" && !isShorts;

  const primaryAccount = managedAccounts.find((a) => a.id === selectedAccounts[0]) ?? null;
  const profile = useMemo(() => normalizeProfile(primaryAccount?.aiProfile), [primaryAccount]);

  useEffect(() => {
    if (!open) return;
    const preselected = accountIds?.filter((id) => managedAccounts.some((a) => a.id === id)) ?? [];
    setSelectedAccounts(preselected.length ? preselected : managedAccounts.slice(0, 1).map((a) => a.id));
    setFormat(action?.format ?? meta.formats[0]);
    setFile(null);
    setVideoInfo(null);
    setSubtitleFile(null);
    setThumbnailFile(null);
    setTitle("");
    setDescription("");
    setTags("");
    setNotes("");
    setAi(null);
    setNeedsTranscribe(false);
    setPrivacy("public");
    setMode(isSchedule ? "programar" : "ahora");
    setScheduledAt(defaultScheduleValue());
    setUploadStatus(null);
    setUploadProgress(0);
    transcriptCache.current = null;
    // Solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // El idioma y las traducciones por defecto salen del perfil del canal elegido
  useEffect(() => {
    setLanguage(profile.language);
    setUseLocalizations(profile.localize_to.length > 0);
  }, [profile]);

  const handleFile = (next: File | null) => {
    setFile(next);
    setVideoInfo(null);
    setNeedsTranscribe(false);
    if (!next || !next.type.startsWith("video/")) return;
    getVideoInfo(next)
      .then((info) => {
        setVideoInfo(info);
        // Vertical y de hasta 3 minutos: YouTube lo trata como Short
        if (platform === "youtube" && !isShorts && info.height > info.width && info.duration <= 180) setFormat("short");
      })
      .catch(() => undefined);
  };

  const toggleAccount = (id: string) =>
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

  const handleGenerateN8n = async () => {
    setGenerating(true);
    const result = await sendStudioEvent<N8nMetadata>({
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

  /** Subtítulos del creador > transcripción ya hecha > transcribir el audio (solo si lo confirma) */
  const resolveTranscript = async (allowTranscribe: boolean): Promise<Cue[] | null> => {
    if (subtitleFile) {
      const cues = parseSubtitles(await subtitleFile.text());
      if (!cues.length) throw new Error("El archivo de subtítulos está vacío o no es .srt/.vtt.");
      return cues;
    }
    if (file && transcriptCache.current?.file === file) return transcriptCache.current.cues;
    if (!file || !file.type.startsWith("video/")) return [];
    if (!allowTranscribe) return null;
    setAiStep("Extrayendo el audio…");
    const chunks = await extractAudioChunks(file);
    const cues = await transcribeAudio(chunks, (done, total) =>
      setAiStep(total > 1 ? `Transcribiendo ${Math.min(done + 1, total)} de ${total}…` : "Transcribiendo el audio…")
    );
    transcriptCache.current = { file, cues };
    return cues;
  };

  const handleGenerate = async (allowTranscribe = false) => {
    if (!isYouTubeUpload) return handleGenerateN8n();
    setNeedsTranscribe(false);
    setGenerating(true);
    try {
      const cues = await resolveTranscript(allowTranscribe);
      if (cues === null) {
        // Sin subtítulos: pedir confirmación antes de gastar en transcribir
        setNeedsTranscribe(true);
        return;
      }
      if (!cues.length && !notes.trim()) {
        toast({ title: "Falta contexto", description: "Sube el video con sus subtítulos (.srt) o escribe notas sobre el video." });
        return;
      }
      setAiStep("Mirando el video…");
      const frames = file?.type.startsWith("video/") ? await captureFrames(file).catch(() => []) : [];
      setAiStep("Escribiendo títulos y descripción…");
      const result = await generateMetadata({
        language,
        format: format === "short" ? "short" : "video",
        transcript: cuesToTranscript(cues),
        durationSeconds: videoInfo?.duration ?? cues.at(-1)?.end,
        notes,
        frames,
        profile,
        channelName: primaryAccount?.displayName,
        localizeTo: profile.localize_to,
        current: { title, description },
      });
      setAi(result);
      if (result.titles[0]) setTitle(result.titles[0].text);
      setDescription(result.description);
      setTags(result.tags.join(", "));
      toast({ title: "Listo: revisa las opciones de título" });
    } catch (err) {
      toast({ title: "No se pudo generar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setGenerating(false);
      setAiStep(null);
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  };

  const needsFile = isYouTubeUpload && mode !== "borrador";
  const canSubmit =
    selectedAccounts.length > 0 && (title.trim().length > 0 || isShorts) && (!needsFile || Boolean(file)) && !submitting && !generating;

  const publishYouTube = async () => {
    if (!file) return;
    const scheduledIso = mode === "programar" ? new Date(scheduledAt).toISOString() : undefined;
    if (scheduledIso && new Date(scheduledIso).getTime() < Date.now() + 5 * 60_000) {
      toast({ title: "Elige una hora futura", description: "La publicación programada debe ser al menos 5 minutos después de ahora.", variant: "destructive" });
      return;
    }
    const localizations = useLocalizations ? ai?.localizations.filter((l) => l.lang !== language) : undefined;
    const warnings: string[] = [];
    let uploaded = 0;
    for (const accountId of selectedAccounts) {
      const account = managedAccounts.find((a) => a.id === accountId);
      const label = account?.handle ?? "el canal";
      try {
        setUploadProgress(0);
        setUploadStatus(`Subiendo a ${label}…`);
        const token = await getUploadToken(accountId);
        const videoId = await uploadVideo(
          token,
          file,
          {
            title: title.trim(),
            description,
            tags: parsedTags,
            categoryId: profile.category_id,
            language,
            privacy,
            publishAt: scheduledIso,
            localizations,
          },
          setUploadProgress
        );
        if (thumbnailFile && format === "video") {
          setUploadStatus(`Subiendo miniatura a ${label}…`);
          await setThumbnail(token, videoId, thumbnailFile).catch((e: Error) => warnings.push(`Miniatura: ${e.message}`));
        }
        if (subtitleFile) {
          setUploadStatus(`Subiendo subtítulos a ${label}…`);
          await uploadCaptions(token, videoId, subtitleFile, language).catch((e: Error) => warnings.push(`Subtítulos: ${e.message}`));
        }
        addPost({
          platform,
          accountId,
          format,
          title: title.trim(),
          description,
          tags: parsedTags,
          status: scheduledIso ? "programado" : "publicado",
          scheduledAt: scheduledIso,
          externalId: videoId,
          url: `https://youtu.be/${videoId}`,
        });
        uploaded++;
      } catch (err) {
        toast({ title: `No se pudo subir a ${label}`, description: err instanceof Error ? err.message : undefined, variant: "destructive" });
      }
    }
    if (uploaded > 0) {
      toast({
        title: scheduledIso ? "Video programado en YouTube" : "Video subido a YouTube",
        description: warnings.length
          ? warnings.join(" · ")
          : "YouTube lo está procesando; aparecerá en Contenido del canal en unos minutos.",
      });
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !action) return;
    setSubmitting(true);
    try {
      if (isYouTubeUpload && mode !== "borrador") {
        await publishYouTube();
        return;
      }

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

      // Instagram/TikTok y los Shorts automáticos siguen pasando por n8n
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
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  if (!action) return null;

  const shortWarning =
    isYouTubeUpload && format === "short" && videoInfo && (videoInfo.width >= videoInfo.height || videoInfo.duration > 180)
      ? "Para que YouTube lo trate como Short, el video debe ser vertical y durar 3 minutos o menos."
      : null;
  const transcribeCost = videoInfo ? Math.max(0.01, (videoInfo.duration / 60) * TRANSCRIBE_USD_PER_MIN) : null;
  const localeNames = (ai?.localizations ?? []).map((l) => LANGUAGES[l.lang] ?? l.lang).join(", ");

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
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
              <div className="flex items-center justify-between gap-2">
                <Label>Publicar en</Label>
                {isYouTubeUpload && primaryAccount?.remote && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setProfileAccount(primaryAccount)}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Perfil del canal
                  </Button>
                )}
              </div>
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
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <FileVideo className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                      {videoInfo && ` · ${Math.floor(videoInfo.duration / 60)}:${String(Math.round(videoInfo.duration % 60)).padStart(2, "0")} · ${videoInfo.width}×${videoInfo.height}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFile(null)} aria-label="Quitar archivo" disabled={submitting}>
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
                    handleFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <UploadCloud className="h-8 w-8 text-primary" />
                  Arrastra tu archivo o haz clic para seleccionarlo
                </button>
              )}
              {isYouTubeUpload && (
                <div className={cn("grid gap-2", format === "video" && "sm:grid-cols-2")}>
                  <SmallFilePicker
                    icon={Captions}
                    label="Subtítulos (.srt o .vtt)"
                    accept=".srt,.vtt"
                    file={subtitleFile}
                    onChange={(f) => {
                      setSubtitleFile(f);
                      setNeedsTranscribe(false);
                    }}
                  />
                  {format === "video" && (
                    <SmallFilePicker icon={ImageIcon} label="Miniatura (JPG o PNG, máx. 2 MB)" accept="image/jpeg,image/png" file={thumbnailFile} onChange={setThumbnailFile} />
                  )}
                </div>
              )}
              {isYouTubeUpload && (
                <p className="text-xs text-muted-foreground">
                  Los subtítulos le dicen a la IA de qué trata el video sin transcribir nada, y se suben a YouTube junto al video.
                </p>
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
                    {shortWarning && <p className="text-xs text-amber-400">{shortWarning}</p>}
                  </div>
                )}

                {/* Metadatos */}
                <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Contenido</p>
                    <div className="flex items-center gap-2">
                      {isYouTubeUpload && (
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="h-9 w-[130px] gap-1 text-xs" aria-label="Idioma del título y la descripción">
                            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LANGUAGES).map(([code, name]) => (
                              <SelectItem key={code} value={code}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => void handleGenerate()} disabled={generating || submitting} className="gap-2">
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
                        {generating && aiStep ? aiStep : "Rellenar con IA"}
                      </Button>
                    </div>
                  </div>

                  {isYouTubeUpload && (
                    <div className="space-y-2">
                      <Label htmlFor="composer-notes" className="text-xs text-muted-foreground">
                        Notas para la IA (opcional): título aprobado, capítulos, fuentes, qué destacar
                      </Label>
                      <Textarea id="composer-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                  )}

                  {needsTranscribe && (
                    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                      <p>
                        Este video no tiene subtítulos. Puedes subir su <strong>.srt</strong> (gratis) o transcribir el audio
                        {transcribeCost !== null && ` (≈ US$${transcribeCost.toFixed(2)})`}.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void handleGenerate(true)}>
                          Transcribir y rellenar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setNeedsTranscribe(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {ai && ai.titles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Opciones de título</Label>
                      <div className="space-y-2">
                        {ai.titles.map((option) => {
                          const active = title === option.text;
                          return (
                            <button
                              key={option.text}
                              type="button"
                              onClick={() => setTitle(option.text)}
                              className={cn(
                                "w-full rounded-xl border p-3 text-left transition-colors",
                                active ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"
                              )}
                            >
                              <span className="mr-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                {ANGLE_LABELS[option.angle] ?? option.angle}
                              </span>
                              <span className="text-sm font-medium">{option.text}</span>
                              {active && option.why && <p className="mt-1.5 text-xs text-muted-foreground">{option.why}</p>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="composer-title">{platform === "youtube" ? "Título" : "Nombre interno"}</Label>
                      {platform === "youtube" && <span className="text-xs text-muted-foreground">{title.length}/100</span>}
                    </div>
                    <Input id="composer-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="composer-desc">{platform === "youtube" ? "Descripción" : "Caption"}</Label>
                    <Textarea id="composer-desc" rows={isYouTubeUpload ? 8 : 4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="composer-tags">{platform === "youtube" ? "Tags" : "Hashtags"} (separados por coma)</Label>
                    <Input id="composer-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ia, automatizacion, ventas" />
                  </div>

                  {ai && (
                    <div className="space-y-3 border-t border-border pt-3">
                      {ai.thumbnail_text.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Texto para la miniatura (clic para copiar)</Label>
                          <div className="flex flex-wrap gap-2">
                            {ai.thumbnail_text.map((text) => (
                              <button
                                key={text}
                                type="button"
                                onClick={() => copy(text)}
                                className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-xs font-bold uppercase text-yellow-300"
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {ai.pinned_comment && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Comentario para fijar (YouTube no deja fijarlo por API)</Label>
                          <div className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
                            <p className="flex-1">{ai.pinned_comment}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(ai.pinned_comment)} aria-label="Copiar comentario">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {ai.localizations.length > 0 && (
                        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium">Traducciones: {localeNames}</p>
                            {ai.localizations.map((l) => (
                              <p key={l.lang} className="truncate text-xs text-muted-foreground">
                                {l.lang.toUpperCase()} · {l.title}
                              </p>
                            ))}
                          </div>
                          <Switch checked={useLocalizations} onCheckedChange={setUseLocalizations} aria-label="Incluir traducciones" />
                        </div>
                      )}
                      {ai.notes_es && <p className="text-xs text-muted-foreground">💡 {ai.notes_es}</p>}
                    </div>
                  )}
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
              {isYouTubeUpload && mode === "ahora" && (
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as Privacy)}>
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
              {isYouTubeUpload && mode === "programar" && (
                <p className="text-xs text-muted-foreground">Se sube ahora como privado y YouTube lo publica solo a esa hora.</p>
              )}
            </div>

            {uploadStatus && (
              <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{uploadStatus}</span>
                  <span className="text-muted-foreground">{Math.round(uploadProgress * 100)}%</span>
                </div>
                <Progress value={uploadProgress * 100} />
                <p className="text-xs text-muted-foreground">No cierres esta ventana hasta que termine.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!canSubmit} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isShorts ? "Generar Shorts" : modeLabels[mode].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChannelProfileDialog account={profileAccount} onOpenChange={(next) => !next && setProfileAccount(null)} />
    </>
  );
}
