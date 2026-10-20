import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, Clapperboard, FileVideo, ImageIcon, Languages, Loader2, MessageSquareText, UploadCloud, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TranslateHint } from "@/components/studio/TranslateHint";
import { useToast } from "@/hooks/use-toast";
import { ANGLE_LABELS, LANGUAGES, type ChannelProfile } from "@/lib/studio/ai";
import { withCta, withoutCta, type RelatedVideo } from "@/lib/studio/video-tasks";
import { draftComment, fillDraftWithAi, inspectVideo, NeedsTranscription, type DraftFormat, type YouTubeDraft } from "@/lib/studio/youtube-draft";
import { formatDuration } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

/** Whisper cobra ~US$0,006 por minuto */
const TRANSCRIBE_USD_PER_MIN = 0.006;

const FORMAT_OPTIONS: { id: DraftFormat; label: string }[] = [
  { id: "video", label: "Video" },
  { id: "short", label: "Short" },
];

export function SmallFilePicker({
  icon: Icon,
  label,
  accept,
  file,
  onChange,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {file ? (
        <>
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(null)} disabled={disabled} aria-label={`Quitar ${label}`}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={disabled}
          className="flex-1 text-left text-muted-foreground hover:text-foreground"
        >
          {label}
        </button>
      )}
    </div>
  );
}

/** Vista previa chica de la miniatura vertical de un Short */
function VerticalThumbPreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Miniatura del Short" className="aspect-[9/16] w-24 rounded-lg border border-border object-cover" />
  );
}

interface YouTubeDraftEditorProps {
  draft: YouTubeDraft;
  onChange: (patch: Partial<YouTubeDraft>) => void;
  profile: ChannelProfile;
  channelName?: string;
  disabled?: boolean;
  /** Avisa al contenedor mientras la IA trabaja (para no cerrar ni publicar a medias) */
  onBusyChange?: (busy: boolean) => void;
  /** Videos largos del canal para elegir el "Video relacionado" de un Short */
  longVideos?: RelatedVideo[];
}

/** Archivo, subtítulos, miniatura y metadatos de un video de YouTube, con "Rellenar con IA" */
export function YouTubeDraftEditor({ draft, onChange, profile, channelName, disabled, onBusyChange, longVideos }: YouTubeDraftEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [aiStep, setAiStep] = useState<string | null>(null);
  const [needsTranscribe, setNeedsTranscribe] = useState(false);

  const locked = disabled || generating;
  const { ai, language, video } = draft;

  const handleFile = async (file: File | null) => {
    setNeedsTranscribe(false);
    onChange({ file, video: null });
    if (!file || !file.type.startsWith("video/")) return;
    onChange({ file, ...(await inspectVideo(file)) });
  };

  const handleGenerate = async (allowTranscribe = false) => {
    setNeedsTranscribe(false);
    setGenerating(true);
    onBusyChange?.(true);
    try {
      onChange(await fillDraftWithAi(draft, { profile, channelName, allowTranscribe, onStep: setAiStep }));
      toast({ title: "Listo: revisa las opciones de título" });
    } catch (err) {
      if (err instanceof NeedsTranscription) setNeedsTranscribe(true);
      else toast({ title: "No se pudo generar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setGenerating(false);
      setAiStep(null);
      onBusyChange?.(false);
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  };

  // El llamado "🎬 La historia completa en el video vinculado" va en la descripción y el comentario
  const setRelated = (id: string) => {
    const related = longVideos?.find((v) => v.id === id) ?? null;
    const comment = draftComment(draft);
    onChange({
      relatedVideo: related,
      description: related ? withCta(draft.description, language) : withoutCta(draft.description),
      pinnedComment: related ? withCta(comment, language) : withoutCta(comment),
    });
  };
  const relatedOptions = [
    ...(draft.relatedVideo && !longVideos?.some((v) => v.id === draft.relatedVideo?.id) ? [draft.relatedVideo] : []),
    ...(longVideos ?? []),
  ];

  const shortWarning =
    draft.format === "short" && video && (video.width >= video.height || video.duration > 180)
      ? "Para que YouTube lo trate como Short, el video debe ser vertical y durar 3 minutos o menos."
      : null;
  const transcribeCost = video ? Math.max(0.01, (video.duration / 60) * TRANSCRIBE_USD_PER_MIN) : null;
  // Si el texto no se editó, el ícono muestra la versión en español que la IA ya preparó para YouTube
  const spanish = ai?.localizations.find((l) => l.lang === "es");
  const spanishTitle = ai?.titles.find((t) => t.text === draft.title.trim())?.localized_titles?.find((x) => x.lang === "es")?.title;
  const spanishDescription = spanish && draft.description.trim() === ai?.description.trim() ? spanish.description : undefined;
  const localeNames = (ai?.localizations ?? []).map((l) => LANGUAGES[l.lang] ?? l.lang).join(", ");

  return (
    <div className="space-y-6">
      {/* Archivos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Archivo</Label>
          <div className="flex rounded-lg bg-secondary/60 p-0.5">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={locked}
                onClick={() => onChange({ format: f.id })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  draft.format === f.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {draft.file ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <FileVideo className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{draft.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(draft.file.size / (1024 * 1024)).toFixed(1)} MB
                {video && ` · ${formatDuration(Math.round(video.duration))} · ${video.width}×${video.height}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void handleFile(null)} aria-label="Quitar archivo" disabled={locked}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            disabled={locked}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <UploadCloud className="h-8 w-8 text-primary" />
            Arrastra tu video o haz clic para seleccionarlo
          </button>
        )}
        {shortWarning && <p className="text-xs text-amber-400">{shortWarning}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <SmallFilePicker
            icon={Captions}
            label="Subtítulos (.srt o .vtt)"
            accept=".srt,.vtt"
            file={draft.subtitleFile}
            disabled={locked}
            onChange={(f) => {
              onChange({ subtitleFile: f });
              setNeedsTranscribe(false);
            }}
          />
          <SmallFilePicker
            icon={ImageIcon}
            label={draft.format === "short" ? "Miniatura (JPG vertical 1080×1920, máx. 2 MB)" : "Miniatura (JPG o PNG, máx. 2 MB)"}
            accept="image/jpeg,image/png"
            file={draft.thumbnailFile}
            disabled={locked}
            onChange={(f) => onChange({ thumbnailFile: f })}
          />
        </div>
        {draft.format === "short" && draft.thumbnailFile && <VerticalThumbPreview file={draft.thumbnailFile} />}
        <p className="text-xs text-muted-foreground">
          Los subtítulos le dicen a la IA de qué trata el video sin transcribir nada, y se suben a YouTube junto al video.
        </p>
      </div>

      {/* Metadatos */}
      <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Contenido</p>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(v) => onChange({ language: v })} disabled={locked}>
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
            <Button size="sm" variant="secondary" onClick={() => void handleGenerate()} disabled={locked} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
              {generating && aiStep ? aiStep : "Rellenar con IA"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${draft.id}`} className="text-xs text-muted-foreground">
            Notas para la IA (opcional): título aprobado, capítulos, fuentes, qué destacar
          </Label>
          <Textarea id={`notes-${draft.id}`} rows={2} value={draft.notes} disabled={locked} onChange={(e) => onChange({ notes: e.target.value })} />
        </div>

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
                const active = draft.title === option.text;
                return (
                  <div key={option.text} className="flex items-start gap-1">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onChange({ title: option.text })}
                      className={cn(
                        "min-w-0 flex-1 rounded-xl border p-3 text-left transition-colors",
                        active ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="mr-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {ANGLE_LABELS[option.angle] ?? option.angle}
                      </span>
                      <span className="text-sm font-medium">{option.text}</span>
                      {active && option.why && <p className="mt-1.5 text-xs text-muted-foreground">{option.why}</p>}
                    </button>
                    <TranslateHint
                      text={option.text}
                      language={language}
                      known={option.localized_titles?.find((x) => x.lang === "es")?.title}
                      className="mt-3"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`title-${draft.id}`}>Título</Label>
            <div className="flex items-center gap-1">
              <TranslateHint text={draft.title} language={language} known={spanishTitle} />
              <span className="text-xs text-muted-foreground">{draft.title.length}/100</span>
            </div>
          </div>
          <Input id={`title-${draft.id}`} value={draft.title} disabled={locked} onChange={(e) => onChange({ title: e.target.value })} maxLength={100} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`desc-${draft.id}`}>Descripción</Label>
            <TranslateHint text={draft.description} language={language} known={spanishDescription} />
          </div>
          <Textarea
            id={`desc-${draft.id}`}
            rows={8}
            value={draft.description}
            disabled={locked}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={5000}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`tags-${draft.id}`}>Tags (separados por coma)</Label>
            <TranslateHint text={draft.tags} language={language} />
          </div>
          <Input id={`tags-${draft.id}`} value={draft.tags} disabled={locked} onChange={(e) => onChange({ tags: e.target.value })} />
        </div>

        {draft.format === "short" && longVideos && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clapperboard className="h-3.5 w-3.5 text-primary" />
              Video largo relacionado
            </Label>
            <Select value={draft.relatedVideo?.id ?? "none"} onValueChange={(v) => setRelated(v)} disabled={locked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                {relatedOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="line-clamp-1">{v.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {draft.relatedVideo
                ? "Se agregó el llamado al video completo en la descripción y el comentario. El botón al video lo pone YouTube en su lugar de siempre: al programar te dejamos el link directo a YouTube Studio para elegirlo (10 segundos)."
                : "El botón que lleva del Short al video largo. YouTube no deja ponerlo por API: al programar te dejamos el link directo para elegirlo."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`comment-${draft.id}`} className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              Comentario para fijar
            </Label>
            <TranslateHint text={draftComment(draft)} language={language} />
          </div>
          <Textarea
            id={`comment-${draft.id}`}
            rows={2}
            value={draftComment(draft)}
            disabled={locked}
            placeholder="Una pregunta que invite a comentar (opcional)"
            onChange={(e) => onChange({ pinnedComment: e.target.value })}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            Se publica solo en el video. Si YouTube no lo acepta mientras está privado, se publica a la hora de salida y te
            llega el aviso a Telegram para fijarlo.
          </p>
        </div>

        {ai && (
          <div className="space-y-3 border-t border-border pt-3">
            {ai.thumbnail_text.length > 0 && draft.format === "video" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Texto para la miniatura (clic para copiar)</Label>
                <div className="flex flex-wrap items-center gap-2">
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
                  <TranslateHint text={ai.thumbnail_text.join("\n")} language={language} />
                </div>
              </div>
            )}
            {ai.localizations.length > 0 && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">Traducciones: {localeNames}</p>
                  {ai.localizations.map((l) => {
                    const localTitle = ai.titles
                      .find((t) => t.text === draft.title.trim())
                      ?.localized_titles?.find((x) => x.lang === l.lang)?.title;
                    return (
                      <div key={l.lang} className="flex items-center gap-1">
                        <p className="truncate text-xs text-muted-foreground">
                          {l.lang.toUpperCase()} · {localTitle ?? "Título editado: se traduce al publicar"}
                        </p>
                        {localTitle && <TranslateHint text={`${localTitle}\n\n${l.description}`} language={l.lang} className="h-5 w-5" />}
                      </div>
                    );
                  })}
                </div>
                <Switch
                  checked={draft.useLocalizations}
                  onCheckedChange={(v) => onChange({ useLocalizations: v })}
                  disabled={locked}
                  aria-label="Incluir traducciones"
                />
              </div>
            )}
            {ai.notes_es && <p className="text-xs text-muted-foreground">💡 {ai.notes_es}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
