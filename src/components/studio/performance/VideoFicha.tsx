import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Captions, ExternalLink, Loader2, Radio, RefreshCw, Rocket, Sparkles, Stethoscope, Trash2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/studio/StudioUI";
import { useToast } from "@/hooks/use-toast";
import type { ChannelProfile } from "@/lib/studio/ai";
import {
  ageLabel,
  hookSecond,
  LEVEL_LABELS,
  liveStatus,
  ratioLabel,
  retentionAt,
  retentionMoments,
  TZ_CL,
  TZ_US,
  type Snapshot,
  type VideoFormat,
} from "@/lib/studio/performance";
import {
  deleteInsight,
  diagnoseVideo,
  linkReplicaResult,
  replicaBrief,
  replicateVideo,
  setShortsWave,
  type Diagnosis,
  type Insight,
  type Replica,
} from "@/lib/studio/performance-ai";
import { fetchTranscript, loadDeepDetail, type DeepDetail, type PerfVideo } from "@/lib/studio/performance-data";
import { parseSubtitles, type Cue } from "@/lib/studio/subtitles";
import { formatDuration } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";
import { DiagnosisView, ReplicaView } from "./InsightViews";
import { LevelBadge } from "./LevelBadge";

const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const NO_RESULT = "__ninguno__";

function zonedLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Busy = null | { kind: "diagnose" | "replicate"; step: string };

export function VideoFicha({
  open,
  onOpenChange,
  accountId,
  profile,
  video,
  all,
  base,
  snapshots,
  insights,
  schedule,
  autoDiagnose,
  onInsightsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  profile: ChannelProfile;
  video: PerfVideo | null;
  all: PerfVideo[];
  base: Record<VideoFormat, (number | null)[]>;
  snapshots: Snapshot[];
  insights: Insight[];
  schedule: string;
  /** Abierto desde el aviso de Telegram: si no tiene diagnóstico, se analiza solo */
  autoDiagnose?: boolean;
  onInsightsChange: (next: Insight[]) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<DeepDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cues, setCues] = useState<Cue[] | null | undefined>(undefined);
  const [busy, setBusy] = useState<Busy>(null);
  const [guidance, setGuidance] = useState("");
  const srtRef = useRef<HTMLInputElement>(null);
  const autoRan = useRef<string | null>(null);

  const videoId = video?.id;
  useEffect(() => {
    if (!open || !videoId || !video) return;
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    setCues(undefined);
    setGuidance("");
    void loadDeepDetail(accountId, video)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setDetailError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId, accountId]);

  const mine = useMemo(() => insights.filter((i) => i.videoId === videoId), [insights, videoId]);
  const diagnosis = mine.find((i) => i.kind === "diagnostico") ?? null;
  const replica = mine.find((i) => i.kind === "replica") ?? null;

  const live = useMemo(() => {
    if (!video) return null;
    const own = snapshots.filter((s) => s.videoId === video.id);
    return liveStatus(own, video.publishedAt, base[video.format]);
  }, [video, snapshots, base]);

  const curveData = useMemo(() => {
    if (!video) return [];
    const median = base[video.format];
    const days = Math.max(video.cum.length, Math.min(28, median.filter((m) => m !== null).length));
    return Array.from({ length: days }, (_, d) => ({ day: d + 1, video: video.cum[d] ?? null, normal: median[d] ?? null }));
  }, [video, base]);

  const retention = useMemo(() => detail?.retention ?? [], [detail]);
  const moments = useMemo(() => (video ? retentionMoments(retention, video.durationSeconds) : []), [retention, video]);
  const retentionData = useMemo(
    () => (video ? retention.map((p) => ({ s: Math.round(p.ratio * video.durationSeconds), percent: p.percent })) : []),
    [retention, video]
  );

  // Autoanálisis cuando se abre desde el aviso "despegando"
  useEffect(() => {
    if (!open || !autoDiagnose || !video || diagnosis || busy || !detail || autoRan.current === video.id) return;
    autoRan.current = video.id;
    void runDiagnose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDiagnose, video, diagnosis, detail]);

  if (!video) return null;
  const hookS = hookSecond(video.format);
  const hookRetention = retentionAt(retention, hookS, video.durationSeconds);
  const quoteAt = (s: number) => {
    if (!cues?.length) return "";
    const c = cues.find((x) => x.end >= s);
    return c?.text ?? "";
  };

  const ensureCues = async (): Promise<Cue[] | null> => {
    if (cues !== undefined) return cues;
    const found = await fetchTranscript(accountId, video.id, profile.language || "en").catch(() => null);
    setCues(found);
    return found;
  };

  const context = (c: Cue[] | null) => ({ accountId, profile, video, detail, cues: c, all, insights, schedule });

  async function runDiagnose() {
    if (!video) return;
    try {
      setBusy({ kind: "diagnose", step: "Bajando los subtítulos del video…" });
      const c = await ensureCues();
      setBusy({ kind: "diagnose", step: "Analizando gancho, empaque, tema y retención (1-3 min)…" });
      const insight = await diagnoseVideo(context(c));
      onInsightsChange([insight, ...insights]);
    } catch (e) {
      toast({ title: "No se pudo analizar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function runReplicate() {
    if (!video) return;
    try {
      setBusy({ kind: "replicate", step: "Bajando los subtítulos del video…" });
      const c = await ensureCues();
      setBusy({ kind: "replicate", step: "Extrayendo el ADN y buscando ángulos más profundos (1-3 min)…" });
      const insight = await replicateVideo(context(c), (diagnosis?.data as Diagnosis | undefined) ?? null, guidance);
      onInsightsChange([insight, ...insights]);
    } catch (e) {
      toast({ title: "No se pudo replicar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const removeInsight = async (insight: Insight) => {
    try {
      await deleteInsight(insight.id);
      onInsightsChange(insights.filter((i) => i.id !== insight.id));
    } catch (e) {
      toast({ title: "No se pudo borrar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const onSrt = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseSubtitles(await file.text());
    if (!parsed.length) return toast({ title: "El archivo no tiene subtítulos válidos (.srt o .vtt)", variant: "destructive" });
    setCues(parsed);
    toast({ title: "Subtítulos cargados", description: `${parsed.length} líneas. La IA las usará en el próximo análisis.` });
  };

  const openFactory = () => {
    const r = replica?.data as Replica | undefined;
    const sourceLong = video.format === "video";
    setShortsWave({
      name: `Ola · ${video.title}`.slice(0, 80),
      notes: [
        `MODO OLA: "${video.title}" está rindiendo ${ratioLabel(video.ratio)} sobre lo normal. Prioriza los momentos de ese mismo tema.`,
        r?.shorts_plan.factory_notes ?? "",
        r?.shorts_plan.moments_es.length ? `Momentos a buscar: ${r.shorts_plan.moments_es.join(" · ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      relatedVideoId: sourceLong ? video.id : null,
    });
    router.push("/studio/youtube/shorts");
  };

  const download = (angle: number) => {
    if (!replica) return;
    const blob = new Blob([replicaBrief(replica, video, angle)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brief-${(replica.data as Replica).angles[angle]?.name_es ?? "video"}`.replace(/[^\w\-áéíóúñ ]+/gi, "").slice(0, 60) + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const later = replica ? all.filter((v) => v.id !== video.id && v.publishedAt > replica.createdAt) : [];
  const resultVideo = replica?.resultVideoId ? all.find((v) => v.id === replica.resultVideoId) : null;
  const linkResult = async (id: string) => {
    if (!replica) return;
    const target = id === NO_RESULT ? null : all.find((v) => v.id === id) ?? null;
    try {
      await linkReplicaResult(replica.id, target ? { id: target.id, title: target.title } : null);
      onInsightsChange(insights.map((i) => (i.id === replica.id ? { ...i, resultVideoId: target?.id ?? null, resultVideoTitle: target?.title ?? null } : i)));
    } catch (e) {
      toast({ title: "No se pudo guardar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-3xl">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex gap-3">
            {video.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnail} alt="" className={cn("shrink-0 rounded-lg object-cover", video.format === "short" ? "h-24 w-14" : "h-20 w-36")} />
            )}
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base leading-snug">{video.title}</SheetTitle>
              <SheetDescription className="text-xs">
                {video.format === "short" ? "Short" : "Video"} · {formatDuration(video.durationSeconds)} · {zonedLabel(video.publishedAt, TZ_US)} EE. UU. (ET) ·{" "}
                {zonedLabel(video.publishedAt, TZ_CL)} Chile
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge level={video.level} ratio={video.ratio} />
                <a href={`https://youtu.be/${video.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  YouTube <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`https://studio.youtube.com/video/${video.id}/analytics/tab-overview/period-default`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  YouTube Studio <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5 pb-6">
          {/* Números duros */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Vs. lo normal" value={ratioLabel(video.ratio)} hint={video.ratio !== null ? `a los ${video.ratioDay + 1} días · ${LEVEL_LABELS[video.level]}` : "faltan videos para comparar"} />
            <Stat label="Vistas" value={fmt(video.views)} hint={`día 1: ${video.cum[0] !== undefined ? fmt(video.cum[0]) : "—"} · día 7: ${video.cum[6] !== undefined ? fmt(video.cum[6]) : "—"}`} />
            <Stat label="% visto promedio" value={video.avgViewPercentage !== null ? `${Math.round(video.avgViewPercentage)}%` : "—"} hint={video.avgViewDuration !== null ? `${mmss(video.avgViewDuration)} por vista` : undefined} />
            <Stat
              label={`Retención a los ${hookS} s`}
              value={hookRetention !== null ? `${Math.round(hookRetention)}%` : "—"}
              hint={video.format === "short" ? "los que no deslizan" : "los que pasan el gancho"}
            />
            <Stat label="Suscriptores" value={video.subscribersGained !== null ? `+${fmt(video.subscribersGained)}` : "—"} hint={video.views && video.subscribersGained !== null ? `${((video.subscribersGained / video.views) * 1000).toFixed(1)} por 1.000 vistas` : undefined} />
            <Stat label="Me gusta · comentarios" value={`${fmt(video.likes)} · ${fmt(video.comments)}`} hint={video.shares !== null ? `${fmt(video.shares)} compartidos` : undefined} />
            <Stat label="CTR miniatura" value={detail?.ctr !== null && detail?.ctr !== undefined ? `${detail.ctr.toFixed(1)}%` : "—"} hint={detail?.impressions ? `${fmt(detail.impressions)} impresiones` : "YouTube no lo entrega por API"} />
            <Stat
              label="En vivo (n8n)"
              value={live?.last24h !== null && live?.last24h !== undefined ? `+${fmt(live.last24h)}` : "—"}
              hint={live ? `últimas 24 h · ${live.perHour !== null ? `${fmt(live.perHour)}/h` : "—"} · ${ageLabel(live.ageHours)}` : "solo videos de hasta 14 días"}
            />
          </div>

          {/* Curva vs lo normal */}
          {curveData.length > 1 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Vistas acumuladas vs. lo normal del canal</h3>
              <p className="mb-2 text-xs text-muted-foreground">La línea punteada es la mediana de tus otros {video.format === "short" ? "Shorts" : "videos"} a la misma edad.</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ left: -12, right: 8, top: 4 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(d) => `d${d}`} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}K` : String(v))} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, name: string) => [fmt(v), name === "video" ? "Este video" : "Lo normal"]}
                      labelFormatter={(d) => `Día ${d}`}
                    />
                    <Line type="monotone" dataKey="normal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 4" dot={false} connectNulls />
                    <Line type="monotone" dataKey="video" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Retención */}
          <div>
            <h3 className="mb-1 text-sm font-semibold">Retención</h3>
            {detailError ? (
              <p className="text-xs text-rose-400">{detailError}</p>
            ) : !detail ? (
              <Skeleton className="h-44 rounded-xl" />
            ) : retentionData.length < 5 ? (
              <p className="text-xs text-muted-foreground">YouTube todavía no tiene la curva de este video (necesita más vistas o ~2 días).</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  Rojo: donde se va la gente. Verde: donde vuelven a ver (material para Shorts).
                  {cues ? " Pasa el mouse para ver la frase de ese momento." : ""}
                </p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={retentionData} margin={{ left: -12, right: 8, top: 4 }}>
                      <defs>
                        <linearGradient id="ret" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="s" type="number" domain={[0, video.durationSeconds]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={mmss} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, maxWidth: 280, whiteSpace: "normal" }}
                        formatter={(v: number) => [`${v}%`, "Siguen viendo"]}
                        labelFormatter={(s: number) => `${mmss(s)}${quoteAt(s) ? ` · “${quoteAt(s)}”` : ""}`}
                      />
                      <ReferenceLine x={hookS} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="percent" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ret)" />
                      {moments.map((m) => (
                        <ReferenceDot key={m.at} x={m.at} y={m.percent} r={5} fill={m.type === "caida" ? "#fb7185" : "#34d399"} stroke="none" />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {detail && (detail.traffic.length > 0 || detail.countries.length > 0) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">De dónde llegan</p>
                  {detail.traffic.slice(0, 5).map((t) => (
                    <div key={t.label} className="text-xs">
                      <div className="flex justify-between">
                        <span className="truncate">{t.label}</span>
                        <span className="tabular-nums text-muted-foreground">{Math.round(t.share * 100)}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, t.share * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Países</p>
                  {detail.countries.slice(0, 5).map((c) => (
                    <div key={c.country} className="text-xs">
                      <div className="flex justify-between">
                        <span>{c.country}</span>
                        <span className="tabular-nums text-muted-foreground">{Math.round(c.share * 100)}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, c.share * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transcripción */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
            <Captions className="h-4 w-4 text-primary" />
            {cues === undefined
              ? "La IA lee los subtítulos del video desde YouTube al analizar."
              : cues === null
                ? "Este video no tiene subtítulos en YouTube: sube el .srt para que la IA lea el guion."
                : `Guion cargado (${cues.length} líneas).`}
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => srtRef.current?.click()}>
              Usar mi .srt
            </Button>
            <input ref={srtRef} type="file" accept=".srt,.vtt" className="hidden" onChange={(e) => void onSrt(e.target.files?.[0])} />
          </div>

          {/* Diagnóstico */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Stethoscope className="h-4 w-4 text-primary" />
                Diagnóstico
                <AiBadge />
              </h3>
              <div className="flex items-center gap-1">
                {diagnosis && (
                  <>
                    <span className="text-[11px] text-muted-foreground">{format(new Date(diagnosis.createdAt), "d MMM HH:mm", { locale: es })}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeInsight(diagnosis)} aria-label="Borrar diagnóstico">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant={diagnosis ? "ghost" : "default"} className="h-8 gap-1.5 text-xs" disabled={Boolean(busy) || !detail} onClick={() => void runDiagnose()}>
                  {diagnosis ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {diagnosis ? "Volver a analizar" : "Analizar por qué rindió así"}
                </Button>
              </div>
            </div>
            {busy?.kind === "diagnose" && (
              <p className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {busy.step}
              </p>
            )}
            {diagnosis ? (
              <DiagnosisView d={diagnosis.data as Diagnosis} />
            ) : (
              !busy && (
                <p className="text-xs text-muted-foreground">
                  Un estratega de YouTube revisa el gancho, el empaque, el tema, la estructura y la curva de retención, y te dice por qué rindió así con hipótesis respaldadas por tus números.
                </p>
              )
            )}
          </section>

          {/* Replicar */}
          <section className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Rocket className="h-4 w-4 text-primary" />
                Replicar profundizando
                <AiBadge />
              </h3>
              {replica && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">{format(new Date(replica.createdAt), "d MMM HH:mm", { locale: es })}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeInsight(replica)} aria-label="Borrar réplica">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Mantiene el ADN (tipo de curiosidad, promesa, esqueleto y emoción) y propone 3 ángulos que van más hondo en lo que tu audiencia demostró querer, con datos nuevos para no caer en contenido repetido.
              El resultado es un brief para producirlo conmigo con tu proceso de libros y fuentes.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Opcional: hacia dónde quieres llevarlo. Ej: quiero enfocarlo en los esclavos de las minas, no en los gladiadores"
              />
              <Button className="h-auto gap-1.5 sm:w-48" disabled={Boolean(busy)} onClick={() => void runReplicate()}>
                <Rocket className="h-4 w-4" />
                {replica ? "Proponer otros ángulos" : "Replicar este video"}
              </Button>
            </div>
            {!diagnosis && !replica && <p className="text-[11px] text-muted-foreground">Tip: si primero lo diagnosticas, la réplica parte de ese análisis.</p>}
            {busy?.kind === "replicate" && (
              <p className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {busy.step}
              </p>
            )}
            {replica && (
              <>
                <ReplicaView r={replica.data as Replica} brief={(angle) => replicaBrief(replica, video, angle)} onOpenFactory={openFactory} onDownload={download} />
                <div className="rounded-xl border border-dashed border-border p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                    <Radio className="h-3.5 w-3.5 text-primary" />
                    Bitácora: ¿qué video salió de esta idea?
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={replica.resultVideoId ?? NO_RESULT} onValueChange={(v) => void linkResult(v)}>
                      <SelectTrigger className="h-8 w-full text-xs sm:w-80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_RESULT}>Todavía no lo publico</SelectItem>
                        {later.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {resultVideo && (
                      <span className="text-xs text-muted-foreground">
                        Resultado: <span className="font-semibold text-foreground">{resultVideo.ratio !== null ? ratioLabel(resultVideo.ratio) : "esperando datos de YouTube (~2 días)"}</span> (previsto ×
                        {(replica.data as Replica).angles[(replica.data as Replica).recommended_angle]?.prediction.ratio_min}–
                        {(replica.data as Replica).angles[(replica.data as Replica).recommended_angle]?.prediction.ratio_max}). La IA usa esto para afinar sus próximas
                        recomendaciones.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
