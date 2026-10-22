import { useCallback, useEffect, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Check, Clapperboard, Download, ExternalLink, Loader2, MessageSquareText, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { StudioCard } from "@/components/studio/StudioUI";
import { useToast } from "@/hooks/use-toast";
import { findShortThumbnail } from "@/lib/studio/short-thumbnail";
import { downloadFile } from "@/lib/studio/thumbnails";
import {
  addCtaToUploadedVideo,
  ctaLine,
  needsAction,
  pinUrl,
  postCommentsNow,
  saveVideoTask,
  studioEditUrl,
  updateVideoTask,
  withCta,
  withoutCta,
  type RelatedVideo,
  type VideoTask,
} from "@/lib/studio/video-tasks";
import type { YouTubeVideo } from "@/lib/studio/youtube";
import { deleteShortThumbnail } from "@/lib/studio/youtube-draft";

/** Pasos en YouTube Studio después de bajar la miniatura del Short */
export const THUMBNAIL_STUDIO_STEPS = "En Studio: Miniatura → Subir archivo y elige el JPG que se acaba de bajar.";

/** Botón del aviso para abrir Studio (por si el navegador bloqueó la pestaña nueva) */
export function studioToastAction(videoId: string) {
  return (
    <ToastAction altText="Abrir YouTube Studio" onClick={() => window.open(studioEditUrl(videoId), "_blank", "noopener,noreferrer")}>
      Abrir YouTube Studio
    </ToastAction>
  );
}

/** "Subir miniatura": baja el JPG del Short y abre su página en YouTube Studio, en el mismo clic */
export function useThumbnailUpload(accountId: string) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const upload = useCallback(
    async (videoId: string) => {
      setLoadingId(videoId);
      try {
        const file = await findShortThumbnail(accountId, videoId);
        if (file) downloadFile(file, file.name);
        window.open(studioEditUrl(videoId), "_blank", "noopener");
        toast({
          title: file ? "Miniatura descargada" : "No encontré la miniatura en este PC",
          description: file
            ? `${THUMBNAIL_STUDIO_STEPS} Luego toca «Ya la subí».`
            : "Bájala desde la Fábrica de Shorts (Miniatura → Bajar).",
          duration: 30_000,
          action: studioToastAction(videoId),
        });
      } finally {
        setLoadingId(null);
      }
    },
    [accountId, toast]
  );

  return { upload, loadingId };
}

/** "Sale hoy 19:00" mientras el video aún no se publica */
function releaseLabel(postAfter: string): string | null {
  const at = new Date(postAfter);
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return null;
  const hour = format(at, "HH:mm");
  if (isToday(at)) return `Sale hoy ${hour}`;
  if (isTomorrow(at)) return `Sale mañana ${hour}`;
  return `Sale el ${format(at, "EEE d MMM", { locale: es })} ${hour}`;
}

function LinkButton({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon className="h-3.5 w-3.5" />
        {children}
        <ExternalLink className="h-3 w-3 opacity-60" />
      </a>
    </Button>
  );
}

/** Lo que YouTube no deja hacer por API: fijar el comentario, elegir el video relacionado y la miniatura de los Shorts */
export function PendingTasksPanel({ tasks, accountId, onChanged }: { tasks: VideoTask[]; accountId: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [working, setWorking] = useState<string | null>(null);
  const { upload, loadingId } = useThumbnailUpload(accountId);
  const actionable = tasks.filter(needsAction);
  const waiting = tasks.filter((t) => t.commentStatus === "pendiente");
  if (!actionable.length && !waiting.length) return null;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setWorking(id);
    try {
      await fn();
      onChanged();
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  return (
    <StudioCard className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">Pendientes en YouTube</h2>
        <p className="text-xs text-muted-foreground">
          Lo que YouTube no deja hacer por API. Cada link abre el lugar exacto: fijar es ⋮ → Fijar, el video relacionado se elige
          en "Video relacionado" y la miniatura del Short se sube en "Miniatura".
          {waiting.length > 0 &&
            ` ${waiting.length} ${waiting.length === 1 ? "comentario se publica solo" : "comentarios se publican solos"} a la hora de salida y te avisamos por Telegram.`}
        </p>
      </div>
      {actionable.length > 0 && (
        <ul className="divide-y divide-border/60">
          {actionable.map((t) => (
            <li key={t.id} className="space-y-2 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.videoTitle || t.videoId}</span>
                {working === t.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {t.commentStatus === "publicado" && t.commentId && (
                  <>
                    <LinkButton href={pinUrl(t.videoId, t.commentId)} icon={Pin}>
                      Fijar comentario
                    </LinkButton>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1"
                      disabled={working === t.id}
                      onClick={() => void run(t.id, () => updateVideoTask(t.id, { commentStatus: "fijado" }))}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Ya lo fijé
                    </Button>
                  </>
                )}
                {t.commentStatus === "error" && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      El comentario no se pudo publicar{t.lastError ? ` (${t.lastError})` : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      disabled={working === t.id}
                      onClick={() =>
                        void run(t.id, async () => {
                          await updateVideoTask(t.id, { commentStatus: "pendiente" });
                          await postCommentsNow([t.id]);
                        })
                      }
                    >
                      Reintentar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground"
                      disabled={working === t.id}
                      onClick={() => void run(t.id, () => updateVideoTask(t.id, { commentStatus: "sin" }))}
                    >
                      Descartar
                    </Button>
                  </>
                )}
                {t.relatedVideoId && !t.relatedDone && (
                  <>
                    <LinkButton href={studioEditUrl(t.videoId)} icon={Clapperboard}>
                      Elegir video relacionado
                    </LinkButton>
                    <span className="min-w-0 max-w-[16rem] truncate text-xs text-muted-foreground">→ {t.relatedVideoTitle}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1"
                      disabled={working === t.id}
                      onClick={() => void run(t.id, () => updateVideoTask(t.id, { relatedDone: true }))}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Listo
                    </Button>
                  </>
                )}
              </div>
              {t.thumbnailPending && (
                <div className="space-y-2">
                  <p className="flex items-start gap-1 text-xs text-amber-400">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>
                      Falta subir la miniatura en YouTube Studio (YouTube no la acepta por API en los Shorts).
                      {releaseLabel(t.postAfter) ? ` ${releaseLabel(t.postAfter)}.` : ""}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" className="h-8 gap-1.5" disabled={loadingId === t.videoId} onClick={() => void upload(t.videoId)}>
                      {loadingId === t.videoId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Subir miniatura
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1"
                      disabled={working === t.id}
                      onClick={() =>
                        void run(t.id, async () => {
                          await updateVideoTask(t.id, { thumbnailPending: false });
                          await deleteShortThumbnail(t.videoId).catch(() => undefined);
                        })
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      Ya la subí
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </StudioCard>
  );
}

/** Para videos ya subidos (p. ej. Shorts que se programaron antes): video relacionado, llamado y comentario */
export function VideoExtrasDialog({
  video,
  task,
  longVideos,
  accountId,
  language,
  onClose,
  onSaved,
}: {
  video: YouTubeVideo | null;
  task: VideoTask | null;
  longVideos: RelatedVideo[];
  accountId: string;
  language: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [related, setRelated] = useState<RelatedVideo | null>(null);
  const [comment, setComment] = useState("");
  const [addCta, setAddCta] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!video) return;
    setRelated(task?.relatedVideoId ? { id: task.relatedVideoId, title: task.relatedVideoTitle ?? "" } : null);
    setComment(task?.commentText ?? "");
    setAddCta(true);
    // Solo al abrir otro video
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  if (!video) return null;
  const commentLocked = task?.commentStatus === "publicado" || task?.commentStatus === "fijado";
  const descriptionHasCta = video.description.includes(ctaLine(language));
  const scheduled = video.privacy === "private" && video.publishAt && new Date(video.publishAt).getTime() > Date.now();
  const options = [...(related && !longVideos.some((v) => v.id === related.id) ? [related] : []), ...longVideos];

  const changeRelated = (id: string) => {
    const next = options.find((v) => v.id === id) ?? null;
    setRelated(next);
    if (!commentLocked) setComment((c) => (next ? withCta(c, language) : withoutCta(c)));
  };

  const save = async () => {
    setSaving(true);
    const notes: string[] = [];
    try {
      if (video.isShort && related && addCta && !descriptionHasCta) {
        await addCtaToUploadedVideo(accountId, video.id)
          .then(() => notes.push("Llamado agregado a la descripción"))
          .catch((e: Error) => notes.push(`Descripción: ${e.message}`));
      }
      if (commentLocked && task) {
        await updateVideoTask(task.id, { related });
      } else {
        const saved = await saveVideoTask({
          accountId,
          videoId: video.id,
          videoTitle: video.title,
          isShort: video.isShort,
          commentText: comment,
          postAfter: scheduled ? (video.publishAt as string) : new Date().toISOString(),
          related: video.isShort ? related : null,
        });
        if (comment.trim()) {
          const posted = (await postCommentsNow([saved.id])).has(saved.id);
          notes.push(posted ? "Comentario publicado: fíjalo desde Pendientes" : "El comentario se publica solo a la hora de salida");
        }
      }
      toast({ title: "Guardado", description: notes.join(" · ") || undefined });
      onSaved();
      onClose();
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-2">{video.title}</DialogTitle>
          <DialogDescription>
            {scheduled
              ? `Programado para el ${format(new Date(video.publishAt as string), "EEE d MMM HH:mm", { locale: es })}.`
              : "Ya está en YouTube."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {video.isShort && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clapperboard className="h-3.5 w-3.5 text-primary" />
                Video largo relacionado
              </Label>
              <Select value={related?.id ?? "none"} onValueChange={changeRelated} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {options.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="line-clamp-1">{v.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {related && (
                <>
                  {descriptionHasCta ? (
                    <p className="text-xs text-muted-foreground">La descripción ya tiene el llamado al video completo.</p>
                  ) : (
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm">
                      <span>
                        Agregar <span className="font-medium">"{ctaLine(language)}"</span> a la descripción
                      </span>
                      <Switch checked={addCta} onCheckedChange={setAddCta} disabled={saving} />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    El botón al video lo pone YouTube en su lugar de siempre. Se elige en YouTube Studio (se puede aunque siga
                    privado):{" "}
                    <a href={studioEditUrl(video.id)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      abrir YouTube Studio
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="extras-comment" className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              Comentario para fijar
            </Label>
            {commentLocked && task?.commentId ? (
              <div className="space-y-2 rounded-lg border border-border p-2.5 text-sm">
                <p className="whitespace-pre-wrap">{task.commentText}</p>
                <a
                  href={pinUrl(video.id, task.commentId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pin className="h-3 w-3" />
                  Ya está publicado: abrir para fijarlo
                </a>
              </div>
            ) : (
              <>
                <Textarea
                  id="extras-comment"
                  rows={3}
                  value={comment}
                  disabled={saving}
                  maxLength={1000}
                  placeholder="Una pregunta que invite a comentar"
                  onChange={(e) => setComment(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {scheduled
                    ? "Se intenta publicar ahora; si YouTube no lo acepta con el video privado, se publica solo a la hora de salida y te avisamos por Telegram."
                    : "Se publica ahora y queda en Pendientes para fijarlo."}
                </p>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
