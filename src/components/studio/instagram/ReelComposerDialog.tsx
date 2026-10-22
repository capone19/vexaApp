import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  FileVideo,
  FolderOpen,
  ImageUp,
  Loader2,
  Rocket,
  Save,
  Scissors,
  Trash2,
  TriangleAlert,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CaptionField, HashtagInput, ReelStatusChip, useScheduleNotice, whenLabel } from "@/components/studio/instagram/ReelParts";
import { toLocalInput } from "@/components/studio/YouTubeUploadDialog";
import { useToast } from "@/hooks/use-toast";
import {
  composeCaption,
  COVER_RETRY_NOTE,
  createPublication,
  deletePublication,
  generateCaptions,
  hasVideo,
  isEditable,
  loadFactoryShorts,
  MAX_CAPTION,
  MAX_COLLABORATORS,
  MISSING_VIDEO_MESSAGE,
  nextFreeReelSlot,
  normalizeCollaborators,
  normalizeHashtags,
  pickCaptionProfile,
  publishNow,
  PUBLISHING_MESSAGE,
  REEL_MIN_LEAD_MS,
  removeReelCover,
  RETRY_HELP,
  schedulePublication,
  splitCaption,
  unlockShortsFolder,
  unschedule,
  updatePublication,
  uploadReelCover,
  uploadReelVideo,
  validateReelCover,
  validateReelFile,
  youtubeWatchUrl,
  type FactoryShort,
  type InstagramPublication,
  type PublicationPatch,
} from "@/lib/studio/instagram";
import type { Occupant, PublishPlan } from "@/lib/studio/publish-plan";
import type { SocialAccount } from "@/lib/studio/types";
import type { RelatedVideo } from "@/lib/studio/video-tasks";
import { fetchYouTubeVideos } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

type Source = { kind: "factory"; short: FactoryShort } | { kind: "file"; file: File };
/** Valor del Select para "Sin video de origen" (Radix no acepta "") */
const NO_SOURCE = "none";
type SubmitKind = "draft" | "schedule" | "now";

interface ReelComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SocialAccount;
  /** Canal de YouTube gestionado: de sus proyectos salen los Shorts de la Fábrica */
  youtubeChannel: SocialAccount | null;
  tenantId: string | null;
  /** Reel a editar; null = nuevo */
  publication: InstagramPublication | null;
  /** Nuevo Reel: hora sugerida (p. ej. un espacio libre del calendario) */
  initialAt?: Date | null;
  /** Nuevo Reel: Short de la Fábrica ya elegido */
  initialShort?: FactoryShort | null;
  plan: PublishPlan | null;
  occupants: Occupant[];
  onUploading?: (publicationId: string, fraction: number | null) => void;
  onSaved: (publication: InstagramPublication | null) => void;
}

/** Nuevo Reel / Editar Reel: video, portada, texto con IA y guardar, programar o publicar ahora */
export function ReelComposerDialog({
  open,
  onOpenChange,
  account,
  youtubeChannel,
  tenantId,
  publication,
  initialAt,
  initialShort,
  plan,
  occupants,
  onUploading,
  onSaved,
}: ReelComposerDialogProps) {
  const { toast } = useToast();
  const announce = useScheduleNotice();
  const readOnly = publication ? !isEditable(publication) : false;

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [firstComment, setFirstComment] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [thumbMs, setThumbMs] = useState<number | null>(null);
  const [whenLocal, setWhenLocal] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [tab, setTab] = useState<"factory" | "file">("factory");
  const [factory, setFactory] = useState<FactoryShort[] | null>(null);
  const [folderLocked, setFolderLocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [fraction, setFraction] = useState<number | null>(null);
  const [confirmNow, setConfirmNow] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Portada propia: la miniatura del Short de la Fábrica, un JPG elegido a mano o quitar la guardada
  const [useThumbCover, setUseThumbCover] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  // Video largo del que salió el Reel (lo usa el bot de Instagram para mandar a la gente al video correcto)
  const [sourceVideo, setSourceVideo] = useState<RelatedVideo | null>(null);
  const [longVideos, setLongVideos] = useState<{ channelId: string; videos: RelatedVideo[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const busy = step !== null || aiBusy;
  const ytId = youtubeChannel?.id;

  const suggestedAt = () =>
    nextFreeReelSlot(plan, occupants, new Date(Date.now() + REEL_MIN_LEAD_MS)) ?? new Date(Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000);

  // Cargar el Reel (o dejarlo en blanco) cada vez que se abre
  useEffect(() => {
    if (!open) return;
    const split = splitCaption(publication?.caption ?? "");
    setTitle(publication?.title ?? initialShort?.title ?? "");
    setText(publication ? split.text : initialShort ? splitCaption(initialShort.description).text : "");
    setHashtags(publication ? split.hashtags : normalizeHashtags(initialShort?.hashtags ?? []));
    setFirstComment(publication?.settings.firstComment ?? "");
    setCollaborators((publication?.settings.collaborators ?? []).map((c) => `@${c}`).join(" "));
    setShareToFeed(publication?.settings.shareToFeed ?? true);
    setThumbMs(publication?.settings.thumbOffsetMs ?? null);
    const at = publication?.scheduledAt ? new Date(publication.scheduledAt) : (initialAt ?? suggestedAt());
    setWhenLocal(toLocalInput(at));
    setSource(initialShort ? { kind: "factory", short: initialShort } : null);
    setTab("factory");
    setAiNote("");
    setStep(null);
    setFraction(null);
    setConfirmDelete(false);
    setDuration(0);
    setUseThumbCover(true);
    setCoverFile(null);
    setRemoveCover(false);
    setSourceVideo(publication?.sourceVideo ?? initialShort?.relatedVideo ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, publication?.id]);

  // Videos largos del canal de YouTube vinculado (solo con el diálogo abierto y una vez por canal)
  useEffect(() => {
    if (!open || !ytId || longVideos?.channelId === ytId) return;
    let cancelled = false;
    void fetchYouTubeVideos(ytId).then((result) => {
      if (cancelled || "code" in result) return;
      const videos = result.videos
        .filter((v) => !v.isShort && (v.privacy === "public" || (v.privacy === "private" && v.publishAt)))
        .map((v) => ({ id: v.id, title: v.title }));
      setLongVideos({ channelId: ytId, videos });
    });
    return () => {
      cancelled = true;
    };
  }, [open, ytId, longVideos?.channelId]);
  const sourceOptions = useMemo(() => {
    const list = longVideos?.channelId === ytId ? longVideos.videos : [];
    return [...(sourceVideo && !list.some((v) => v.id === sourceVideo.id) ? [sourceVideo] : []), ...list];
  }, [longVideos, ytId, sourceVideo]);
  const loadingVideos = Boolean(ytId) && longVideos?.channelId !== ytId;

  // Shorts de la Fábrica (solo si hace falta elegir video)
  const loadFactory = async () => {
    if (!ytId) {
      setFactory([]);
      return;
    }
    const result = await loadFactoryShorts(ytId).catch(() => ({ shorts: [] as FactoryShort[], folderLocked: false }));
    setFactory(result.shorts);
    setFolderLocked(result.folderLocked);
  };
  useEffect(() => {
    if (open && !readOnly && factory === null) void loadFactory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readOnly]);

  const newFile = source ? (source.kind === "factory" ? source.short.file : source.file) : null;
  const fileProblem = newFile ? validateReelFile(newFile) : null;
  const previewUrl = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);
  const videoSrc = previewUrl ?? publication?.mediaUrl ?? null;
  const videoReady = Boolean(newFile && !fileProblem) || (publication ? hasVideo(publication) : false);

  const thumbCover = source?.kind === "factory" ? (source.short.thumbnail ?? null) : null;
  const pendingCover = coverFile ?? (thumbCover && useThumbCover ? thumbCover : null);
  const pendingCoverUrl = useMemo(() => (pendingCover ? URL.createObjectURL(pendingCover) : null), [pendingCover]);
  useEffect(() => () => void (pendingCoverUrl && URL.revokeObjectURL(pendingCoverUrl)), [pendingCoverUrl]);
  const shownCover = pendingCoverUrl ?? (removeCover ? null : (publication?.coverUrl ?? null));

  const dropCover = () => {
    if (coverFile) setCoverFile(null);
    else if (thumbCover && useThumbCover) setUseThumbCover(false);
    else setRemoveCover(true);
  };

  const caption = composeCaption(text, hashtags);
  const tagsLength = hashtags.length ? hashtags.join(" ").length + 2 : 0;
  const when = whenLocal ? new Date(whenLocal) : null;
  const whenInPast = !when || when.getTime() < Date.now() + 60_000;
  const collabList = normalizeCollaborators(collaborators.split(/[\s,]+/));

  const chooseShort = (short: FactoryShort) => {
    setSource({ kind: "factory", short });
    setUseThumbCover(true);
    setSourceVideo(short.relatedVideo);
    if (!title.trim()) setTitle(short.title);
    if (!text.trim() && short.description) setText(splitCaption(short.description).text);
    if (!hashtags.length) setHashtags(normalizeHashtags(short.hashtags));
  };

  // ---------- IA ----------
  const writeWithAi = async () => {
    const picked = pickCaptionProfile(account.aiProfile, youtubeChannel?.aiProfile);
    const short = source?.kind === "factory" ? source.short : null;
    setAiBusy(true);
    try {
      const [r] = await generateCaptions(
        [
          {
            ref: publication?.id ?? "nuevo",
            title: title || short?.title || "",
            description: text,
            transcript: short?.srt ?? "",
            durationSeconds: short?.durationSeconds ?? (duration ? Math.round(duration) : undefined),
          },
        ],
        picked.profile,
        short?.language ?? picked.language
      );
      if (!r?.ok) throw new Error(r?.error ?? "La IA no pudo escribir el texto.");
      const split = splitCaption(r.caption);
      setText(split.text || [r.hook, r.body, r.cta].filter(Boolean).join("\n\n"));
      setHashtags(r.hashtags.length ? r.hashtags : split.hashtags);
      if (r.firstComment) setFirstComment(r.firstComment);
      if (r.thumbOffsetMs !== undefined) seekThumb(r.thumbOffsetMs);
      setAiNote([picked.fromYouTube ? "Usando el perfil de tu canal de YouTube." : "", r.notesEs].filter(Boolean).join(" "));
    } catch (err) {
      toast({ title: "La IA no respondió", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const seekThumb = (ms: number) => {
    setThumbMs(ms);
    if (videoRef.current) videoRef.current.currentTime = ms / 1000;
  };

  // ---------- Guardar ----------
  // Orden fijo: 1) texto, 2) video y portada, 3) hora. Así el aviso a n8n sale cuando el Reel ya está completo.
  const submit = async (kind: SubmitKind) => {
    if (kind === "schedule" && (!when || whenInPast)) {
      toast({ title: "Elige una fecha futura", variant: "destructive" });
      return;
    }
    if (!publication && !tenantId) {
      toast({ title: "Tu sesión expiró. Vuelve a iniciar sesión.", variant: "destructive" });
      return;
    }
    const fallbackTitle = source?.kind === "factory" ? source.short.title : source?.kind === "file" ? source.file.name.replace(/\.[^.]+$/, "") : "";
    const fields: PublicationPatch = {
      title: title.trim() || fallbackTitle,
      caption,
      settings: {
        shareToFeed,
        collaborators: collabList,
        firstComment,
        thumbOffsetMs: thumbMs ?? undefined,
        locationId: publication?.settings.locationId,
        audioName: publication?.settings.audioName,
      },
      ...(source ? { sourceRef: source.kind === "factory" ? source.short.sourceRef : "upload" } : {}),
      // Sin canal vinculado no se muestra el campo: se respeta lo que ya tenía guardado
      ...(ytId ? { sourceVideo } : {}),
    };
    let saved: InstagramPublication;
    try {
      setStep("Guardando…");
      if (!publication) {
        saved = await createPublication({ tenantId: tenantId as string, accountId: account.id, status: "borrador", scheduledAt: null, ...fields });
      } else if (kind === "draft") {
        saved = (await updatePublication(publication.id, { ...fields, status: "borrador", scheduledAt: null })).publication;
      } else {
        saved = (await updatePublication(publication.id, fields)).publication;
      }
    } catch (err) {
      setStep(null);
      toast({ title: "No se pudo guardar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
      return;
    }

    let uploadError: string | null = null;
    const withVideo = Boolean(newFile && !fileProblem);
    if (newFile && withVideo) {
      setStep(pendingCover ? "Subiendo el video y la portada…" : "Subiendo el video…");
      setFraction(0);
      onUploading?.(saved.id, 0);
      try {
        const media = await uploadReelVideo(
          saved.id,
          newFile,
          (f) => {
            setFraction(f);
            onUploading?.(saved.id, f);
          },
          pendingCover
        );
        saved = { ...saved, mediaUrl: media.mediaUrl, mediaSize: media.mediaSize, coverUrl: media.coverUrl };
      } catch (err) {
        uploadError = err instanceof Error ? err.message : "No se pudo subir el video.";
      } finally {
        onUploading?.(saved.id, null);
        setFraction(null);
      }
    }

    // Cambios solo de portada: no tocan el video ni la hora
    let coverError: string | null = null;
    try {
      if (pendingCover && !withVideo) {
        setStep("Subiendo la portada…");
        saved = { ...saved, coverUrl: (await uploadReelCover(saved.id, pendingCover)).coverUrl };
      } else if (!pendingCover && removeCover && saved.coverUrl) {
        setStep("Quitando la portada…");
        saved = { ...saved, coverUrl: (await removeReelCover(saved.id)).coverUrl };
      }
    } catch (err) {
      coverError = err instanceof Error ? err.message : "No se pudo cambiar la portada.";
    }

    try {
      if (kind === "draft") {
        toast(
          uploadError
            ? { title: "Borrador guardado, pero el video no se subió", description: uploadError, variant: "destructive" }
            : { title: "Borrador guardado" }
        );
      } else if (kind === "now" && uploadError) {
        toast({ title: "No se publicó: el video no se subió", description: `${uploadError} Quedó guardado como borrador.`, variant: "destructive" });
      } else {
        setStep(kind === "now" ? "Publicando…" : "Programando…");
        const result = kind === "now" ? await publishNow(saved.id) : await schedulePublication(saved.id, when as Date);
        saved = result.publication;
        if (uploadError) {
          toast({ title: "Programado, pero falta el video", description: `${uploadError} ${MISSING_VIDEO_MESSAGE}`, variant: "destructive" });
        } else {
          announce(
            saved.id,
            result.notice,
            kind === "now" ? "Publicando en Instagram" : "Reel programado",
            kind === "now" ? "Sale en 1 a 3 minutos." : `Sale solo el ${whenLabel(when as Date)}, aunque este PC esté apagado.`
          );
        }
      }
    } catch (err) {
      toast({ title: "No se pudo programar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setStep(null);
    }
    if (coverError && !uploadError) {
      toast({ title: "Guardado, pero la portada no cambió", description: `${coverError} Vuelve a intentarlo desde esta ficha.`, variant: "destructive" });
    }
    onSaved(saved);
    if (!uploadError && !coverError) onOpenChange(false);
  };

  const runAction = async (action: () => Promise<unknown>, done: string) => {
    setStep("Guardando…");
    try {
      await action();
      toast({ title: done });
      onSaved(null);
      onOpenChange(false);
    } catch (err) {
      toast({ title: "No se pudo completar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setStep(null);
    }
  };

  const nowBlocked = !videoReady;
  const tooLong = caption.length > MAX_CAPTION;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const problem = validateReelFile(file);
            if (problem) {
              toast({ title: "Ese archivo no sirve para Instagram", description: problem, variant: "destructive" });
              return;
            }
            setSource({ kind: "file", file });
            if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
          }}
        />
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const problem = validateReelCover(file);
            if (problem) {
              toast({ title: "Esa imagen no sirve de portada", description: problem, variant: "destructive" });
              return;
            }
            setCoverFile(file);
            setRemoveCover(false);
          }}
        />
        <DialogHeader>
          <DialogTitle>{publication ? (readOnly ? publication.title || "Reel" : "Editar Reel") : "Nuevo Reel"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? publication?.status === "publicando"
                ? PUBLISHING_MESSAGE
                : "Este Reel ya salió en Instagram."
              : "Elige el video, escribe el texto y guárdalo, prográmalo o publícalo ahora."}
          </DialogDescription>
        </DialogHeader>

        {publication && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/40 p-3 text-sm">
            <ReelStatusChip publication={publication} />
            {publication.scheduledAt && <span className="text-muted-foreground">{whenLabel(publication.scheduledAt)}</span>}
            {readOnly && publication.sourceVideo && (
              <a
                href={youtubeWatchUrl(publication.sourceVideo.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 max-w-full truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                De: {publication.sourceVideo.title || "video de YouTube"}
              </a>
            )}
            {publication.permalink && (
              <a href={publication.permalink} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                Ver en Instagram
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
        {publication?.status === "error" && (
          <p className="flex items-start gap-2 rounded-xl bg-error-soft p-3 text-sm text-error-soft-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {publication.lastError || "Instagram no aceptó el Reel."} {RETRY_HELP}
              {!hasVideo(publication) && " El video ya no está guardado: elígelo de nuevo."}
            </span>
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Video y portada */}
          <div className="space-y-3">
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-black/60">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration || 0);
                    if (thumbMs !== null) e.currentTarget.currentTime = thumbMs / 1000;
                  }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                  <FileVideo className="h-8 w-8" />
                  {publication && !hasVideo(publication) ? MISSING_VIDEO_MESSAGE : "Elige un video vertical"}
                </div>
              )}
            </div>
            {!readOnly && thumbCover && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={useThumbCover} disabled={busy} onCheckedChange={(v) => setUseThumbCover(v === true)} />
                Usar la miniatura como portada
              </label>
            )}
            {!readOnly && shownCover && (
              <div className="space-y-2 rounded-xl border border-border p-2">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shownCover} alt="Portada del Reel" className="aspect-[9/16] w-16 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium">Portada</p>
                    <Button variant="secondary" size="sm" className="h-7 w-full gap-1.5 text-xs" disabled={busy} onClick={() => coverRef.current?.click()}>
                      <ImageUp className="h-3.5 w-3.5" />
                      Cambiar portada (JPG)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-full gap-1.5 text-xs text-muted-foreground" disabled={busy} onClick={dropCover}>
                      <X className="h-3.5 w-3.5" />
                      Quitar portada
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{COVER_RETRY_NOTE}</p>
              </div>
            )}
            {videoSrc && duration > 0 && !readOnly && !shownCover && (
              <div className="space-y-1.5">
                <Label className="text-xs">Portada · segundo {((thumbMs ?? 0) / 1000).toFixed(1)}</Label>
                <Slider
                  min={0}
                  max={Math.floor(duration * 1000)}
                  step={100}
                  value={[thumbMs ?? 0]}
                  onValueChange={([v]) => seekThumb(v)}
                  disabled={busy}
                />
              </div>
            )}
            {!readOnly && !shownCover && (
              <Button variant="ghost" size="sm" className="h-7 w-full gap-1.5 text-xs" disabled={busy} onClick={() => coverRef.current?.click()}>
                <ImageUp className="h-3.5 w-3.5" />
                Subir portada (JPG)
              </Button>
            )}
            {fileProblem && (
              <p className="flex items-start gap-1.5 text-xs text-red-400">
                <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                {fileProblem}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {/* Origen del video */}
            {!readOnly && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{publication ? "Reemplazar video (opcional)" : "Video"}</Label>
                  <div className="flex rounded-lg bg-secondary/60 p-0.5">
                    {(["factory", "file"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          tab === t ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t === "factory" ? "De la Fábrica" : "Del PC"}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === "factory" ? (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
                    {folderLocked && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-amber-400 hover:bg-secondary"
                        onClick={async () => {
                          if (await unlockShortsFolder()) void loadFactory();
                        }}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Dar acceso a tu carpeta de Shorts para ver todos
                      </button>
                    )}
                    {factory === null ? (
                      <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Buscando Shorts…
                      </p>
                    ) : factory.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">
                        {ytId ? "No hay Shorts listos en la Fábrica de este navegador." : "Conecta tu canal de YouTube para usar la Fábrica de Shorts."}
                      </p>
                    ) : (
                      factory.map((s) => (
                        <button
                          key={s.sourceRef}
                          type="button"
                          disabled={busy}
                          onClick={() => chooseShort(s)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary",
                            source?.kind === "factory" && source.short.sourceRef === s.sourceRef && "bg-primary/15"
                          )}
                        >
                          <Scissors className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate">{s.title || s.file.name}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{s.durationSeconds}s</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <Button variant="secondary" className="w-full gap-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                    <FileVideo className="h-4 w-4" />
                    {source?.kind === "file" ? source.file.name : "Elegir MP4 o MOV (hasta 300 MB)"}
                  </Button>
                )}
              </div>
            )}

            {/* Video de origen: el bot de Instagram manda ahí a quien comenta o escribe */}
            {ytId && !readOnly && (
              <div className="space-y-1.5">
                <Label>Video de origen</Label>
                <Select
                  value={sourceVideo?.id ?? NO_SOURCE}
                  onValueChange={(id) => setSourceVideo(id === NO_SOURCE ? null : (sourceOptions.find((v) => v.id === id) ?? null))}
                  disabled={busy}
                >
                  <SelectTrigger aria-label="Video de origen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SOURCE}>Sin video de origen</SelectItem>
                    {sourceOptions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.title || v.id}
                      </SelectItem>
                    ))}
                    {loadingVideos && (
                      <SelectItem value="__cargando" disabled>
                        Cargando videos…
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!sourceVideo && (
                  <p className="text-[11px] text-muted-foreground">Elige de qué video largo salió, así el bot de Instagram manda a la gente al video correcto.</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reel-title">Nombre interno</Label>
              <Input id="reel-title" value={title} disabled={readOnly || busy} placeholder="Solo para tu calendario" onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reel-caption">Texto</Label>
                {!readOnly && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" disabled={busy} onClick={() => void writeWithAi()}>
                    {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5 text-primary" />}
                    {aiBusy ? "Escribiendo… (10 a 40 s)" : "Escribir con IA"}
                  </Button>
                )}
              </div>
              <CaptionField id="reel-caption" value={text} onChange={setText} extraLength={tagsLength} disabled={readOnly || busy} />
              {aiNote && <p className="rounded-lg bg-primary/5 p-2 text-[11px] text-muted-foreground">{aiNote}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Hashtags</Label>
              <HashtagInput value={hashtags} onChange={setHashtags} disabled={readOnly || busy} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reel-comment">Primer comentario</Label>
                <Input id="reel-comment" value={firstComment} disabled={readOnly || busy} placeholder="Opcional" onChange={(e) => setFirstComment(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reel-collabs">Colaboradores (hasta {MAX_COLLABORATORS})</Label>
                <Input id="reel-collabs" value={collaborators} disabled={readOnly || busy} placeholder="@usuario @otra" onChange={(e) => setCollaborators(e.target.value)} />
                {collaborators.split(/[\s,]+/).filter(Boolean).length > MAX_COLLABORATORS && (
                  <p className="text-[11px] text-amber-400">Solo se usarán los primeros {MAX_COLLABORATORS}.</p>
                )}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <span>
                Mostrar también en el feed
                <span className="block text-xs text-muted-foreground">Si lo apagas, el Reel solo aparece en la pestaña Reels.</span>
              </span>
              <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} disabled={readOnly || busy} />
            </label>

            {!readOnly && (
              <div className="space-y-1.5">
                <Label htmlFor="reel-when">Fecha y hora</Label>
                <div className="flex flex-wrap gap-2">
                  <Input id="reel-when" type="datetime-local" value={whenLocal} disabled={busy} onChange={(e) => setWhenLocal(e.target.value)} className="w-auto" />
                  <Button variant="secondary" size="sm" className="h-10 gap-1.5" disabled={busy} onClick={() => setWhenLocal(toLocalInput(suggestedAt()))}>
                    <CalendarPlus className="h-4 w-4" />
                    Próximo hueco
                  </Button>
                </div>
                {whenInPast && <p className="text-[11px] text-amber-400">Esa hora ya pasó: elige una futura o usa "Publicar ahora".</p>}
                {!videoReady && <p className="text-[11px] text-amber-400">{MISSING_VIDEO_MESSAGE}</p>}
              </div>
            )}
          </div>
        </div>

        {step && (
          <div className="space-y-1.5 rounded-xl border border-primary/40 p-3 text-sm">
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {step}
              {fraction !== null && <span className="ml-auto tabular-nums text-muted-foreground">{Math.round(fraction * 100)}%</span>}
            </p>
            {fraction !== null && <Progress value={fraction * 100} />}
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          {publication && publication.status !== "publicando" ? (
            <Button
              variant="ghost"
              className={cn("gap-1.5", confirmDelete ? "text-destructive" : "text-muted-foreground")}
              disabled={busy}
              onClick={() =>
                confirmDelete ? void runAction(() => deletePublication(publication.id), "Reel eliminado") : setConfirmDelete(true)
              }
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? "¿Seguro? Clic para eliminar" : "Eliminar"}
            </Button>
          ) : (
            <span />
          )}
          {readOnly ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {publication?.status === "programado" && (
                <Button variant="ghost" className="gap-1.5" disabled={busy} onClick={() => void runAction(() => unschedule(publication.id), "Volvió a borrador")}>
                  <Undo2 className="h-4 w-4" />
                  Pasar a borrador
                </Button>
              )}
              <Button variant="secondary" className="gap-1.5" disabled={busy || tooLong} onClick={() => void submit("draft")}>
                <Save className="h-4 w-4" />
                Guardar borrador
              </Button>
              <Button variant="secondary" className="gap-1.5" disabled={busy || tooLong || whenInPast} onClick={() => void submit("schedule")}>
                <CalendarClock className="h-4 w-4" />
                Programar
              </Button>
              <Button className="gap-1.5" disabled={busy || tooLong || nowBlocked} title={nowBlocked ? MISSING_VIDEO_MESSAGE : undefined} onClick={() => setConfirmNow(true)}>
                <Rocket className="h-4 w-4" />
                Publicar ahora
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmNow} onOpenChange={setConfirmNow}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Publicar este Reel ahora?</AlertDialogTitle>
            <AlertDialogDescription>
              Sale en Instagram en 1 a 3 minutos{newFile ? ", apenas termine de subir el video" : ""}. Después ya no se puede editar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmNow(false);
                void submit("now");
              }}
            >
              Publicar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
