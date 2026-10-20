import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, CheckCircle2, FileVideo, FolderOpen, Loader2, PlugZap, Repeat2, Rocket, SlidersHorizontal, TriangleAlert, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CaptionField, HashtagInput } from "@/components/studio/instagram/ReelParts";
import { toLocalInput } from "@/components/studio/YouTubeUploadDialog";
import { useToast } from "@/hooks/use-toast";
import {
  composeCaption,
  COVER_RETRY_NOTE,
  createPublication,
  generateCaptions,
  loadFactoryShorts,
  matchFactoryShort,
  MAX_CAPTION,
  normalizeHashtags,
  pickCaptionProfile,
  reelOccupants,
  REEL_MIN_LEAD_MS,
  replicaTime,
  splitCaption,
  unlockShortsFolder,
  uploadReelVideo,
  validateReelFile,
  type FactoryShort,
  type InstagramPublication,
  type ReplicaMode,
} from "@/lib/studio/instagram";
import { addDays, type PublishPlan } from "@/lib/studio/publish-plan";
import type { SocialAccount } from "@/lib/studio/types";
import { listSourceRefs } from "@/lib/studio/video-tasks";
import type { YouTubeVideo } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

export interface ShortEntry {
  video: YouTubeVideo;
  at: Date;
  scheduled: boolean;
}

interface ItemEdit {
  text: string;
  hashtags: string[];
  firstComment: string;
  /** Segundo de la portada; null = el que elija Instagram */
  thumbSeconds: number | null;
  /** Subir la miniatura del Short (si tiene) como portada del Reel */
  useCover: boolean;
  notesEs: string;
  aiError?: string;
  /** Hora elegida a mano (datetime-local) */
  customAt?: string;
}

interface RunState {
  done: number;
  total: number;
  title: string;
  step: string;
  fraction: number;
}

const MODES: { id: ReplicaMode; label: string }[] = [
  { id: "same", label: "Misma hora que YouTube" },
  { id: "offset", label: "Con desfase" },
  { id: "plan", label: "Huecos de mi plan" },
];

const OFFSETS = Array.from({ length: 48 }, (_, i) => i + 1);
const dayTime = (d: Date) => format(d, "EEE d MMM · HH:mm", { locale: es });

const defaultEdit = (match: FactoryShort | null): ItemEdit => ({
  text: match?.description ? splitCaption(match.description).text : "",
  hashtags: normalizeHashtags(match?.hashtags ?? []),
  firstComment: "",
  thumbSeconds: null,
  useCover: Boolean(match?.thumbnail),
  notesEs: "",
});

interface ReplicateFromYouTubeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SocialAccount;
  youtubeChannel: SocialAccount | null;
  tenantId: string | null;
  weekStart: Date;
  /** Shorts del canal de YouTube ubicados por fecha (programados y publicados) */
  shorts: ShortEntry[];
  /** Shorts que ya tienen Reel gemelo */
  twinIds: Set<string>;
  publications: InstagramPublication[];
  plan: PublishPlan | null;
  /** Si viene, solo esos Shorts parten marcados (botón "Replicar" de un Short) */
  focusIds: string[] | null;
  onOpenPlan: () => void;
  onUploading: (publicationId: string, fraction: number | null) => void;
  onDone: () => void;
}

/** Replicar a Instagram los Shorts de YouTube de la semana: archivo, horario, textos con IA y programación en un clic */
export function ReplicateFromYouTubeSheet({
  open,
  onOpenChange,
  account,
  youtubeChannel,
  tenantId,
  weekStart,
  shorts,
  twinIds,
  publications,
  plan,
  focusIds,
  onOpenPlan,
  onUploading,
  onDone,
}: ReplicateFromYouTubeSheetProps) {
  const { toast } = useToast();
  const [includeNext, setIncludeNext] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});
  const [manual, setManual] = useState<Record<string, File>>({});
  const [factory, setFactory] = useState<FactoryShort[]>([]);
  const [refs, setRefs] = useState<Map<string, string>>(new Map());
  const [folderLocked, setFolderLocked] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mode, setMode] = useState<ReplicaMode>("same");
  const [offsetHours, setOffsetHours] = useState(3);
  const [aiRun, setAiRun] = useState<{ done: number; total: number } | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFor = useRef<string | null>(null);

  const ytId = youtubeChannel?.id;
  const busy = Boolean(run || aiRun);

  // ---------- Archivos de la Fábrica ----------
  const loadFactory = useCallback(async () => {
    if (!ytId) return;
    setResolving(true);
    try {
      const [sourceRefs, local] = await Promise.all([
        listSourceRefs(ytId).catch(() => new Map<string, string>()),
        loadFactoryShorts(ytId).catch(() => ({ shorts: [] as FactoryShort[], folderLocked: false })),
      ]);
      setRefs(sourceRefs);
      setFactory(local.shorts);
      setFolderLocked(local.folderLocked);
    } finally {
      setResolving(false);
    }
  }, [ytId]);

  // Vista previa de las miniaturas de la Fábrica (los JPG viven en la carpeta del PC)
  const coverUrls = useMemo(() => {
    const urls = new Map<string, string>();
    for (const s of factory) if (s.thumbnail) urls.set(s.sourceRef, URL.createObjectURL(s.thumbnail));
    return urls;
  }, [factory]);
  useEffect(() => () => coverUrls.forEach((url) => URL.revokeObjectURL(url)), [coverUrls]);

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setEdits({});
    setManual({});
    setRun(null);
    void loadFactory();
  }, [open, loadFactory]);

  const isSelected = useCallback((id: string) => selected[id] ?? (focusIds ? focusIds.includes(id) : true), [selected, focusIds]);

  const items = useMemo(() => {
    const end = addDays(weekStart, includeNext ? 14 : 7);
    return shorts
      .filter((s) => s.at >= weekStart && s.at < end && !twinIds.has(s.video.id))
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((s) => {
        const match = matchFactoryShort(s.video, refs, factory);
        const file = manual[s.video.id] ?? match?.file ?? null;
        return {
          ...s,
          match,
          file,
          fromFactory: !manual[s.video.id] && Boolean(match),
          problem: file ? validateReelFile(file) : null,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shorts, twinIds, weekStart.getTime(), includeNext, refs, factory, manual]);

  const editFor = useCallback((it: (typeof items)[number]) => edits[it.video.id] ?? defaultEdit(it.match), [edits]);
  const patchEdit = (it: (typeof items)[number], patch: Partial<ItemEdit>) =>
    setEdits((prev) => ({ ...prev, [it.video.id]: { ...(prev[it.video.id] ?? defaultEdit(it.match)), ...patch } }));

  // ---------- Horario ----------
  const times = useMemo(() => {
    const occupants = reelOccupants(publications);
    const out = new Map<string, { at: Date; moved: boolean; custom: boolean }>();
    for (const it of items) {
      if (!isSelected(it.video.id)) continue;
      const custom = edits[it.video.id]?.customAt;
      const result = custom
        ? { at: new Date(custom), moved: false, custom: true }
        : { ...replicaTime({ youtubeAt: it.at, mode, offsetHours, plan, occupants }), custom: false };
      out.set(it.video.id, result);
      occupants.push({ format: "reel", at: result.at });
    }
    return out;
  }, [items, isSelected, edits, mode, offsetHours, plan, publications]);

  const chosen = items.filter((it) => isSelected(it.video.id));
  const ready = chosen.filter((it) => it.file && !it.problem);
  const tooLong = ready.filter((it) => {
    const e = editFor(it);
    return composeCaption(e.text, e.hashtags).length > MAX_CAPTION;
  });
  const pastCustom = ready.filter((it) => {
    const t = times.get(it.video.id);
    return t?.custom && t.at.getTime() < Date.now() + 60_000;
  });
  const movedCount = ready.filter((it) => times.get(it.video.id)?.moved).length;
  const planMissing = mode === "plan" && !plan;
  const canConfirm = !busy && ready.length > 0 && !tooLong.length && !pastCustom.length && !planMissing && Boolean(tenantId);
  const captionSource = pickCaptionProfile(account.aiProfile, youtubeChannel?.aiProfile);

  // ---------- Textos con IA ----------
  const runAi = async () => {
    const targets = chosen;
    if (!targets.length) return;
    // Una llamada por idioma: cada Short se escribe en el idioma en que se grabó
    const groups = new Map<string, typeof targets>();
    for (const it of targets) {
      const lang = it.match?.language ?? captionSource.language;
      groups.set(lang, [...(groups.get(lang) ?? []), it]);
    }
    let done = 0;
    let failed = 0;
    setAiRun({ done: 0, total: targets.length });
    for (const [language, group] of groups) {
      try {
        const results = await generateCaptions(
          group.map((it) => ({
            ref: it.video.id,
            title: it.match?.title || it.video.title,
            description: it.video.description,
            transcript: it.match?.srt ?? "",
            durationSeconds: it.match?.durationSeconds ?? it.video.durationSeconds,
          })),
          captionSource.profile,
          language,
          (d) => setAiRun({ done: done + d, total: targets.length })
        );
        setEdits((prev) => {
          const next = { ...prev };
          for (const r of results) {
            const it = group.find((g) => g.video.id === r.ref);
            if (!it) continue;
            const base = prev[r.ref] ?? defaultEdit(it.match);
            if (!r.ok) {
              failed++;
              next[r.ref] = { ...base, aiError: r.error ?? "La IA no pudo escribir este texto." };
              continue;
            }
            const split = splitCaption(r.caption);
            next[r.ref] = {
              ...base,
              text: split.text || [r.hook, r.body, r.cta].filter(Boolean).join("\n\n"),
              hashtags: r.hashtags.length ? r.hashtags : split.hashtags,
              firstComment: r.firstComment,
              thumbSeconds: r.thumbOffsetMs !== undefined ? Math.round(r.thumbOffsetMs / 100) / 10 : base.thumbSeconds,
              notesEs: r.notesEs,
              aiError: undefined,
            };
          }
          return next;
        });
      } catch (err) {
        failed += group.length;
        toast({ title: "La IA no respondió", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
      }
      done += group.length;
    }
    setAiRun(null);
    toast({
      title: `Textos listos: ${targets.length - failed} de ${targets.length}`,
      description: failed ? "Revisa los que quedaron sin texto y escríbelos a mano." : "Revísalos y ajusta lo que quieras antes de programar.",
    });
  };

  // ---------- Programar todo ----------
  const confirm = async () => {
    if (!tenantId) return;
    const queue = ready;
    const failures: string[] = [];
    let created = 0;
    let uploaded = 0;
    for (const [i, it] of queue.entries()) {
      const slot = times.get(it.video.id);
      if (!slot || !it.file) continue;
      const title = it.video.title;
      // Si la subida anterior tardó y la hora quedó encima, se corre a unos minutos más
      const at = slot.at.getTime() < Date.now() + REEL_MIN_LEAD_MS / 2 ? new Date(Date.now() + REEL_MIN_LEAD_MS) : slot.at;
      const edit = editFor(it);
      setRun({ done: i, total: queue.length, title, step: "Creando el Reel…", fraction: 0 });
      let publication: InstagramPublication;
      try {
        publication = await createPublication({
          tenantId,
          accountId: account.id,
          status: "programado",
          scheduledAt: at.toISOString(),
          title,
          caption: composeCaption(edit.text, edit.hashtags),
          settings: {
            shareToFeed: true,
            collaborators: [],
            firstComment: edit.firstComment,
            thumbOffsetMs: edit.thumbSeconds !== null ? Math.round(edit.thumbSeconds * 1000) : undefined,
          },
          sourceRef: it.fromFactory && it.match ? it.match.sourceRef : `youtube:${it.video.id}`,
          youtubeVideoId: it.video.id,
        });
        created++;
      } catch (err) {
        failures.push(`${title.slice(0, 40)}: ${err instanceof Error ? err.message : "no se pudo crear"}`);
        continue;
      }
      const cover = edit.useCover ? (it.match?.thumbnail ?? null) : null;
      setRun({ done: i, total: queue.length, title, step: cover ? "Subiendo el video y la portada…" : "Subiendo el video…", fraction: 0 });
      onUploading(publication.id, 0);
      try {
        await uploadReelVideo(
          publication.id,
          it.file,
          (fraction) => {
            setRun((r) => (r ? { ...r, fraction } : r));
            onUploading(publication.id, fraction);
          },
          cover
        );
        uploaded++;
      } catch (err) {
        failures.push(`${title.slice(0, 40)}: ${err instanceof Error ? err.message : "no se pudo subir"}. Quedó programado sin video: usa "Subir video" en el calendario.`);
      } finally {
        onUploading(publication.id, null);
      }
    }
    setRun(null);
    onDone();
    const skipped = chosen.length - queue.length;
    toast({
      title: uploaded ? `${uploaded} ${uploaded === 1 ? "Reel programado" : "Reels programados"} en Instagram` : "No se programó ningún Reel",
      description: [
        uploaded ? "Saldrán solos a su hora, aunque este PC esté apagado." : "",
        created > uploaded ? `${created - uploaded} quedaron sin video.` : "",
        skipped ? `${skipped} sin archivo MP4 no se replicaron.` : "",
        ...failures,
      ]
        .filter(Boolean)
        .join(" "),
      variant: uploaded ? undefined : "destructive",
    });
    if (!failures.length) onOpenChange(false);
  };

  const pickFile = (id: string) => {
    pendingFor.current = id;
    fileInputRef.current?.click();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const id = pendingFor.current;
            e.target.value = "";
            pendingFor.current = null;
            if (!file || !id) return;
            const problem = validateReelFile(file);
            if (problem) {
              toast({ title: "Ese archivo no sirve para Instagram", description: problem, variant: "destructive" });
              return;
            }
            setManual((m) => ({ ...m, [id]: file }));
          }}
        />
        <SheetHeader className="border-b border-border/70 p-5 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-primary" />
            Replicar desde YouTube
          </SheetTitle>
          <SheetDescription>Los Shorts de la semana pasan a Reels con su propio texto y horario. Se suben ahora y salen solos.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!youtubeChannel ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <PlugZap className="mb-3 h-6 w-6 text-primary" />
              <p className="font-medium">Conecta tu canal de YouTube</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Para replicar Shorts necesitamos leer tu canal gestionado.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {resolving ? "Buscando los archivos en la Fábrica…" : `${items.length} ${items.length === 1 ? "Short sin replicar" : "Shorts sin replicar"}`}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={includeNext} onCheckedChange={setIncludeNext} disabled={busy} />
                  Incluir la semana siguiente
                </label>
              </div>

              {folderLocked && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                  <span>Algunos Shorts están en tu carpeta del PC y hay que volver a darle permiso al navegador.</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={async () => {
                      if (await unlockShortsFolder()) void loadFactory();
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                    Dar acceso a la carpeta
                  </Button>
                </div>
              )}

              {/* Horario */}
              <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                <Label>Horario</Label>
                <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/60 p-0.5">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        mode === m.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {mode === "offset" && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Cada Reel sale</span>
                    <Select value={String(offsetHours)} onValueChange={(v) => setOffsetHours(Number(v))} disabled={busy}>
                      <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFSETS.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            +{h} h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">después del Short</span>
                  </div>
                )}
                {planMissing && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-3 text-sm">
                    <span>Tu cuenta de Instagram aún no tiene frecuencia de publicación.</span>
                    <Button size="sm" variant="secondary" className="gap-1.5" onClick={onOpenPlan}>
                      <SlidersHorizontal className="h-4 w-4" />
                      Crear plan de Reels
                    </Button>
                  </div>
                )}
                {movedCount > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-400">
                    <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                    {movedCount === 1 ? "1 Reel tenía una hora que ya pasó: lo corrimos" : `${movedCount} Reels tenían una hora que ya pasó: los corrimos`}{" "}
                    {plan ? "al próximo hueco de tu plan." : "a las próximas horas libres."}
                  </p>
                )}
              </div>

              {/* IA */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {captionSource.fromYouTube ? "Usando el perfil de tu canal de YouTube." : "Usando el perfil de tu cuenta de Instagram."}
                </p>
                <Button variant="secondary" size="sm" className="gap-1.5" disabled={busy || chosen.length === 0} onClick={() => void runAi()}>
                  {aiRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
                  {aiRun ? `Escribiendo ${Math.min(aiRun.done + 1, aiRun.total)} de ${aiRun.total}… (10 a 40 s)` : "Escribir textos con IA"}
                </Button>
              </div>

              {/* Shorts */}
              {items.length === 0 && !resolving && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No hay Shorts sin replicar en {includeNext ? "estas dos semanas" : "esta semana"}.
                </p>
              )}
              <ul className="space-y-3">
                {items.map((it) => {
                  const id = it.video.id;
                  const on = isSelected(id);
                  const edit = editFor(it);
                  const slot = times.get(id);
                  const tags = edit.hashtags.join(" ");
                  const coverUrl = it.match ? coverUrls.get(it.match.sourceRef) : undefined;
                  return (
                    <li key={id} className={cn("space-y-3 rounded-2xl border p-3 transition-opacity", on ? "border-border" : "border-border/50 opacity-60")}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={on}
                          disabled={busy}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [id]: v === true }))}
                          className="mt-1"
                          aria-label="Replicar este Short"
                        />
                        {it.video.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.video.thumbnail} alt="" loading="lazy" className="h-14 w-10 shrink-0 rounded-md object-cover" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug">{it.video.title}</p>
                          <p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                            YouTube {dayTime(it.at)}
                            {slot && (
                              <>
                                <ArrowRight className="h-3 w-3" />
                                <span className={cn("font-medium", slot.moved ? "text-amber-400" : "text-foreground")}>Instagram {dayTime(slot.at)}</span>
                              </>
                            )}
                          </p>
                          {it.problem ? (
                            <p className="flex items-start gap-1 text-[11px] text-red-400">
                              <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
                              {it.problem}
                            </p>
                          ) : it.file ? (
                            <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {it.fromFactory ? `Archivo de la Fábrica (${it.match?.projectName || "proyecto"})` : `Archivo elegido: ${it.file.name}`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-400">{resolving ? "Buscando el archivo…" : "No encontramos el archivo en la Fábrica."}</p>
                          )}
                        </div>
                        {(!it.file || it.problem) && (
                          <Button size="sm" variant="secondary" className="h-8 shrink-0 gap-1.5" disabled={busy} onClick={() => pickFile(id)}>
                            <FileVideo className="h-3.5 w-3.5" />
                            Elegir archivo
                          </Button>
                        )}
                      </div>

                      {on && (
                        <div className="space-y-3 border-t border-border/60 pt-3">
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <div className="space-y-1">
                              <Label className="text-xs">Texto del Reel</Label>
                              <CaptionField
                                value={edit.text}
                                rows={4}
                                disabled={busy}
                                extraLength={tags ? tags.length + 2 : 0}
                                onChange={(text) => patchEdit(it, { text })}
                              />
                            </div>
                            <div className="space-y-1 sm:w-[190px]">
                              <Label className="text-xs">Fecha y hora</Label>
                              <Input
                                type="datetime-local"
                                value={slot ? toLocalInput(slot.at) : ""}
                                disabled={busy}
                                onChange={(e) => patchEdit(it, { customAt: e.target.value || undefined })}
                                className="h-8 text-xs"
                              />
                              {slot?.custom && (
                                <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => patchEdit(it, { customAt: undefined })}>
                                  Volver al horario automático
                                </button>
                              )}
                              {slot?.custom && slot.at.getTime() < Date.now() + 60_000 && <p className="text-[11px] text-red-400">Esa hora ya pasó.</p>}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Hashtags</Label>
                            <HashtagInput value={edit.hashtags} disabled={busy} onChange={(hashtags) => patchEdit(it, { hashtags })} />
                          </div>
                          {coverUrl && (
                            <label className="flex items-center gap-3 rounded-xl border border-border/70 p-2 text-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={coverUrl} alt="" className="h-16 w-9 shrink-0 rounded-md object-cover" />
                              <span className="min-w-0 flex-1">
                                Usar la miniatura como portada
                                <span className="block text-[11px] text-muted-foreground">{COVER_RETRY_NOTE}</span>
                              </span>
                              <Checkbox checked={edit.useCover} disabled={busy} onCheckedChange={(v) => patchEdit(it, { useCover: v === true })} />
                            </label>
                          )}
                          <div className={cn("grid gap-3", !(coverUrl && edit.useCover) && "sm:grid-cols-[1fr_140px]")}>
                            <div className="space-y-1">
                              <Label className="text-xs">Primer comentario</Label>
                              <Input
                                value={edit.firstComment}
                                disabled={busy}
                                placeholder="Opcional"
                                onChange={(e) => patchEdit(it, { firstComment: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            {!(coverUrl && edit.useCover) && (
                              <div className="space-y-1">
                                <Label className="text-xs">Portada (segundo)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={edit.thumbSeconds ?? ""}
                                  disabled={busy}
                                  placeholder="Auto"
                                  onChange={(e) => patchEdit(it, { thumbSeconds: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                          {edit.notesEs && <p className="rounded-lg bg-primary/5 p-2 text-[11px] text-muted-foreground">IA: {edit.notesEs}</p>}
                          {edit.aiError && <p className="text-[11px] text-red-400">{edit.aiError}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-2 border-t border-border/70 p-4">
          {run ? (
            <>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">
                    {run.done + 1} de {run.total}
                  </span>{" "}
                  · {run.title} · {run.step}
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(run.fraction * 100)}%</span>
              </div>
              <Progress value={run.fraction * 100} />
              <p className="text-xs text-muted-foreground">No cierres esta pestaña mientras sube.</p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {tooLong.length
                  ? `${tooLong.length} con más de ${MAX_CAPTION.toLocaleString("es-CL")} caracteres`
                  : chosen.length > ready.length
                    ? `${chosen.length - ready.length} sin archivo MP4: no se replicarán`
                    : `${ready.length} listos para programar`}
              </p>
              <Button className="gap-1.5" disabled={!canConfirm} onClick={() => void confirm()}>
                <Rocket className="h-4 w-4" />
                Programar {ready.length} {ready.length === 1 ? "Reel" : "Reels"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
