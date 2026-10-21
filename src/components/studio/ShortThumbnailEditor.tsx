import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ExternalLink, FolderOpen, ImagePlus, Images, Loader2, PenLine, RefreshCw, Save, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { studioToastAction, THUMBNAIL_STUDIO_STEPS } from "@/components/studio/VideoTasks";
import { useToast } from "@/hooks/use-toast";
import type { ChannelProfile } from "@/lib/studio/ai";
import { shortsSourceRef, type ShortPlan, type ShortsProject, type StoredRender } from "@/lib/studio/shorts";
import {
  captureFrames,
  composeThumbnail,
  downloadFile,
  FOLDER_HINT,
  generateThumbnail,
  saveThumbnail,
  THUMBNAIL_COST_NOTE,
  thumbnailBaseName,
  thumbnailTranscript,
  type PhraseText,
  type StoredThumbnail,
  type ThumbnailPhrase,
} from "@/lib/studio/thumbnails";
import { findVideoIdBySourceRef, markThumbnailPending, studioEditUrl } from "@/lib/studio/video-tasks";
import { deleteShortThumbnail } from "@/lib/studio/youtube-draft";
import { cn } from "@/lib/utils";

const LOADING = "Pensando la frase y dibujando… (30-90 s)";

interface Session {
  phrases: ThumbnailPhrase[];
  recommended: number;
  scene: string;
  conceptEs: string;
}

interface ShortThumbnailEditorProps {
  project: ShortsProject;
  plan: ShortPlan;
  /** Video original del proyecto (para los fotogramas); null si no está en este PC */
  video: File | null;
  render: StoredRender | null;
  profile: ChannelProfile;
  thumbnail: StoredThumbnail | null;
  /** Frases de las otras miniaturas del proyecto (para no repetirlas) */
  otherPhrases: string[];
  /** Hay otra tarea corriendo en la Fábrica */
  locked: boolean;
  /** Hay carpeta del PC con permiso (si no, se pide dentro del clic) */
  hasFolder: boolean;
  onActive: (active: boolean) => void;
  /** Se llama dentro del clic: pide la carpeta o su permiso. null si no se dio */
  onBeforeThumbnail: () => Promise<FileSystemDirectoryHandle | null>;
  /** Devuelve una nota extra para el aviso (por ejemplo, si también se actualizó el borrador) */
  onSaved: (thumbnail: StoredThumbnail) => Promise<string | void>;
}

/** Miniatura con IA del Short: frases para elegir, texto editable y fondo dibujado con los personajes del episodio */
export function ShortThumbnailEditor({
  project,
  plan,
  video,
  render,
  profile,
  thumbnail,
  otherPhrases,
  locked,
  hasFolder,
  onActive,
  onBeforeThumbnail,
  onSaved,
}: ShortThumbnailEditorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [background, setBackground] = useState<Blob | null>(null);
  const [phrase, setPhrase] = useState<PhraseText>({ top: "", highlight: "" });
  const [preview, setPreview] = useState<File | null>(null);
  const [composing, setComposing] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [sceneDraft, setSceneDraft] = useState("");
  const [sceneOpen, setSceneOpen] = useState(false);
  const [crop, setCrop] = useState(false);
  const [noFrames, setNoFrames] = useState(false);
  const [imageError, setImageError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  const [videoId, setVideoId] = useState<string | null | undefined>(undefined);
  const folderRef = useRef<FileSystemDirectoryHandle | null>(null);
  const framesRef = useRef<string[] | null>(null);

  const baseName = thumbnailBaseName(plan, render);
  const working = Boolean(busy);
  const disabled = locked || working;

  // Recompone al instante (con un respiro al escribir), sin llamar a la IA
  useEffect(() => {
    if (!background || !open) return;
    let cancelled = false;
    setComposing(true);
    const timer = setTimeout(() => {
      composeThumbnail(background, phrase, baseName)
        .then((file) => !cancelled && setPreview(file))
        .catch(() => undefined)
        .finally(() => !cancelled && setComposing(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [background, phrase, baseName, open]);

  const previewUrl = useMemo(() => (preview ? URL.createObjectURL(preview) : null), [preview]);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);
  const savedUrl = useMemo(() => (thumbnail?.file ? URL.createObjectURL(thumbnail.file) : null), [thumbnail?.file]);
  useEffect(() => () => void (savedUrl && URL.revokeObjectURL(savedUrl)), [savedUrl]);

  /** Video de YouTube del Short (si ya se subió): una consulta chica, una sola vez */
  const lookupVideoId = async (): Promise<string | null> => {
    if (videoId !== undefined) return videoId;
    const id = await findVideoIdBySourceRef(project.accountId, shortsSourceRef(project.id, plan.id)).catch(() => null);
    setVideoId(id);
    return id;
  };

  const run = async (stage: "propose" | "image", scene = session?.scene ?? "") => {
    onActive(true);
    setBusy(LOADING);
    setImageError("");
    try {
      if (framesRef.current === null) framesRef.current = await captureFrames(video, plan);
      const frames = framesRef.current;
      const id = await lookupVideoId();
      const frameUrls = !frames.length && id ? [`https://i.ytimg.com/vi/${id}/oar2.jpg`] : [];
      setNoFrames(!frames.length && !frameUrls.length);
      const result = await generateThumbnail({
        stage,
        language: project.language,
        profile,
        episodeTitle: project.name,
        short: { title: plan.title, hookLine: plan.hookLine, description: plan.description, transcript: thumbnailTranscript(plan, project.cues) },
        frames,
        frameUrls,
        guidance: guidance.trim(),
        avoid: otherPhrases,
        scene: stage === "image" ? scene : undefined,
      });
      if (stage === "propose") {
        const pick = result.phrases[result.recommended] ?? result.phrases[0];
        setSession({ phrases: result.phrases, recommended: result.recommended, scene: result.scene, conceptEs: result.conceptEs });
        if (pick) setPhrase({ top: pick.top.toUpperCase(), highlight: pick.highlight.toUpperCase() });
        setSceneDraft(result.scene);
      } else {
        const next = result.scene || scene;
        setSession((s) => (s ? { ...s, scene: next } : { phrases: [], recommended: 0, scene: next, conceptEs: "" }));
        setSceneDraft(next);
      }
      if (result.image) setBackground(await (await fetch(result.image)).blob());
      if (result.error) setImageError(result.error);
      setOpen(true);
      setDirty(true);
      setNotSaved(false);
    } catch (e) {
      toast({ title: "No se pudo generar la miniatura", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
      onActive(false);
    }
  };

  // Primera vez: pedir la carpeta dentro del clic, antes de esperar a la IA
  const generate = async () => {
    if (!hasFolder && !folderRef.current) {
      toast({ title: "Elige tu carpeta de Shorts", description: FOLDER_HINT });
    }
    folderRef.current = folderRef.current ?? (await onBeforeThumbnail());
    if (!folderRef.current) setNotSaved(true);
    await run("propose");
  };

  const edit = () => {
    if (!thumbnail) return;
    setSession({ phrases: thumbnail.phrases, recommended: thumbnail.recommended, scene: thumbnail.scene, conceptEs: thumbnail.conceptEs });
    setPhrase(thumbnail.phrase);
    setSceneDraft(thumbnail.scene);
    setBackground(thumbnail.background);
    setImageError("");
    setPreview(thumbnail.file);
    setDirty(false);
    setOpen(true);
    void lookupVideoId();
  };

  const save = async () => {
    if (!preview || !background || !session) return;
    let folder = folderRef.current;
    if (!folder) {
      folder = await onBeforeThumbnail();
      folderRef.current = folder;
    }
    if (!folder) {
      setNotSaved(true);
      return;
    }
    setBusy("Guardando…");
    try {
      const stored = await saveThumbnail(
        project,
        plan.id,
        { phrases: session.phrases, recommended: session.recommended, phrase, scene: session.scene, conceptEs: session.conceptEs },
        { final: preview, background },
        folder
      );
      const note = await onSaved(stored);
      // Short ya en YouTube: la miniatura nueva queda pendiente para subirla en Studio
      const id = await lookupVideoId();
      const pending = id ? await markPending(id) : false;
      setDirty(false);
      setNotSaved(false);
      toast({
        title: "Miniatura guardada",
        description: [
          `Miniatura guardada en tu carpeta: ${stored.path?.join("/") ?? preview.name}`,
          note,
          pending ? "Queda pendiente en Programación para subirla en YouTube Studio." : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
    } catch (e) {
      toast({ title: "No se pudo guardar la miniatura", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  /** Deja la tarea pendiente en Programación. La copia vieja del JPG en este PC se borra: manda la de la carpeta */
  const markPending = async (id: string) => {
    await deleteShortThumbnail(id).catch(() => undefined);
    return markThumbnailPending(project.accountId, id, true)
      .then(() => true)
      .catch(() => false);
  };

  // YouTube no aplica por API la miniatura de los Shorts: se baja y se sube a mano en Studio
  const uploadInStudio = async (file: File) => {
    const id = await lookupVideoId();
    if (!id) return;
    downloadFile(file, file.name);
    window.open(studioEditUrl(id), "_blank", "noopener");
    const pending = await markPending(id);
    toast({
      title: "Miniatura descargada",
      description: `${THUMBNAIL_STUDIO_STEPS}${pending ? " Luego toca «Ya la subí» en Programación → Pendientes en YouTube." : ""}`,
      duration: 30_000,
      action: studioToastAction(id),
    });
  };

  const current = preview ?? thumbnail?.file ?? null;
  // Sin fondo no se puede cambiar la frase: la ficha quedó, pero el archivo no está en la carpeta (o falta el permiso)
  const missingBackground = !background && !working && !imageError && Boolean(session?.scene);
  const pickPhrase = (p: ThumbnailPhrase) => setPhrase({ top: p.top.toUpperCase(), highlight: p.highlight.toUpperCase() });

  // ---------- Cerrado: botón o la miniatura guardada ----------
  if (!open) {
    return (
      <div className="space-y-2 rounded-xl bg-secondary/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ImagePlus className="h-3.5 w-3.5 text-primary" />
          Miniatura
        </p>
        {thumbnail ? (
          <div className="flex items-center gap-3">
            {savedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={savedUrl} alt="Miniatura del Short" className="aspect-[9/16] w-16 rounded-md object-cover ring-1 ring-border" />
            ) : (
              <p className="text-xs text-muted-foreground">No encuentro el archivo en la carpeta (o falta el permiso). Puedes generar otra.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={edit} disabled={disabled}>
                <PenLine className="h-4 w-4" />
                Editar
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void generate()} disabled={disabled}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generar otra
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void generate()} disabled={disabled}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Generar miniatura
          </Button>
        )}
        {busy && <p className="text-xs text-primary">{busy}</p>}
        {!hasFolder && !thumbnail && !busy && <p className="text-[11px] text-muted-foreground">{FOLDER_HINT}</p>}
        <p className="text-[11px] text-muted-foreground/80">{THUMBNAIL_COST_NOTE}</p>
      </div>
    );
  }

  // ---------- Editor ----------
  return (
    <div className="space-y-3 rounded-xl bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ImagePlus className="h-3.5 w-3.5 text-primary" />
          Miniatura
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)} disabled={working}>
          Cerrar
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Vista previa 9:16 */}
        <div className="w-full shrink-0 space-y-2 sm:w-44">
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black/60 ring-1 ring-border">
            {previewUrl || (current && savedUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl ?? savedUrl ?? undefined} alt="Vista previa de la miniatura" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-[11px] text-muted-foreground">
                {working ? LOADING : "Sin imagen: usa \"Otra imagen\"."}
              </div>
            )}
            {crop && (
              <>
                <div className="absolute inset-x-0 top-0 h-[12.5%] bg-black/70" />
                <div className="absolute inset-x-0 bottom-0 h-[12.5%] bg-black/70" />
              </>
            )}
            {(working || composing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            Ver recorte de Instagram
            <Switch checked={crop} onCheckedChange={setCrop} />
          </label>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {busy && <p className="text-xs text-primary">{busy}</p>}
          {imageError && (
            <p className="flex items-start gap-1.5 text-xs text-amber-300">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              {imageError} Usa &quot;Otra imagen&quot;.
            </p>
          )}
          {missingBackground && (
            <p className="flex items-start gap-1.5 text-xs text-amber-300">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              No encuentro el fondo en tu carpeta: usa &quot;Otra imagen&quot; para volver a dibujarlo (o devuélvelo a la carpeta).
            </p>
          )}
          {noFrames && <p className="text-xs text-amber-300">Sin fotogramas del episodio los personajes pueden salir distintos.</p>}

          {session && session.phrases.length > 0 && (
            <div className="space-y-1.5">
              {session.phrases.map((p, i) => {
                const selected = p.top.toUpperCase() === phrase.top && p.highlight.toUpperCase() === phrase.highlight;
                return (
                  <button
                    key={`${p.top}-${p.highlight}-${i}`}
                    type="button"
                    onClick={() => pickPhrase(p)}
                    disabled={working || missingBackground}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left ring-1 transition-colors",
                      selected ? "bg-primary/10 ring-primary/50" : "bg-background/40 ring-border hover:ring-primary/40"
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                      {p.top && <span>{p.top.toUpperCase()}</span>}
                      <span className="rounded bg-[#FFE14D] px-1.5 text-black">{p.highlight.toUpperCase()}</span>
                      {i === session.recommended && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Recomendada</span>
                      )}
                    </span>
                    {p.why_es && <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.why_es}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Arriba (blanco)</Label>
              <Input
                value={phrase.top}
                onChange={(e) => {
                  setPhrase((p) => ({ ...p, top: e.target.value.toUpperCase() }));
                  setDirty(true);
                }}
                placeholder="Opcional"
                disabled={working || missingBackground}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remate (amarillo)</Label>
              <Input
                value={phrase.highlight}
                onChange={(e) => {
                  setPhrase((p) => ({ ...p, highlight: e.target.value.toUpperCase() }));
                  setDirty(true);
                }}
                disabled={working || missingBackground}
                className="h-8 text-sm"
              />
            </div>
          </div>
          {session?.conceptEs && <p className="text-[11px] text-muted-foreground">{session.conceptEs}</p>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void run("image")} disabled={disabled || !session?.scene}>
              <Images className="h-4 w-4" />
              Otra imagen
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSceneOpen((v) => !v)} disabled={disabled}>
              <PenLine className="h-4 w-4" />
              Cambiar escena
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void run("propose")} disabled={disabled}>
              <Sparkles className="h-4 w-4" />
              Nuevas frases
            </Button>
          </div>

          {sceneOpen && (
            <div className="space-y-1.5">
              <Label className="text-xs">Escena (en inglés, como la entiende la IA de imágenes)</Label>
              <Textarea value={sceneDraft} onChange={(e) => setSceneDraft(e.target.value)} rows={3} disabled={working} />
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setSceneOpen(false);
                  void run("image", sceneDraft.trim());
                }}
                disabled={disabled || !sceneDraft.trim()}
              >
                <Images className="h-4 w-4" />
                Dibujar
              </Button>
            </div>
          )}

          <Collapsible>
            <CollapsibleTrigger asChild>
              <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                Indicaciones para la IA{guidance.trim() ? " (con indicaciones)" : ""}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1.5">
              <Textarea
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                rows={2}
                placeholder='Ej: "que salga el león más grande", "más oscuro"'
                disabled={working}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => void save()} disabled={disabled || composing || !preview || !background || !dirty}>
              <Save className="h-4 w-4" />
              Guardar miniatura
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => current && downloadFile(current, current.name)} disabled={!current || working}>
              <Download className="h-4 w-4" />
              Bajar
            </Button>
            {videoId && current && (
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void uploadInStudio(current)} disabled={disabled || composing}>
                <ExternalLink className="h-4 w-4" />
                Subir en YouTube Studio
              </Button>
            )}
          </div>
          {notSaved && (
            <p className="flex items-center gap-1.5 text-xs text-amber-300">
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              No quedó guardada: elige la carpeta para guardarla.
            </p>
          )}
          {!dirty && thumbnail?.path && (
            <p className="flex items-center gap-1.5 truncate text-[11px] text-emerald-300/90" title={thumbnail.path.join("/")}>
              <FolderOpen className="h-3 w-3 shrink-0" />
              {thumbnail.path.join("/")}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80">{THUMBNAIL_COST_NOTE}</p>
        </div>
      </div>
    </div>
  );
}
