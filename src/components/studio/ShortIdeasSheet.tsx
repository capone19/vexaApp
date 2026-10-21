import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, Instagram, Lightbulb, Loader2, Youtube } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SimilarityBadge } from "@/components/studio/ShortPlanCard";
import {
  FORMAT_LABELS,
  similarityLevel,
  sourceSummary,
  STAGE_LABELS,
  type IdeaStage,
  type ShortIdea,
  type SourceLevel,
  type SourceStatus,
} from "@/lib/studio/short-ideas";
import { cn } from "@/lib/utils";

const ALL = "todos";

export const STAGE_TONES: Record<IdeaStage, { chip: string; bar: string }> = {
  propuesta: { chip: "bg-secondary text-muted-foreground", bar: "bg-muted-foreground/40" },
  usada: { chip: "bg-sky-500/15 text-sky-300", bar: "bg-sky-400" },
  programada: { chip: "bg-amber-500/15 text-amber-300", bar: "bg-amber-400" },
  publicada: { chip: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-400" },
  descartada: { chip: "bg-secondary/60 text-muted-foreground/70 line-through", bar: "" },
};

export const SOURCE_LEVEL_TONES: Record<SourceLevel, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  casi: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  agotado: "bg-red-500/15 text-red-300 ring-red-400/30",
};

const SOURCE_LEVEL_LABELS: Record<SourceLevel, string> = { ok: "Con espacio", casi: "Casi agotado", agotado: "Agotado" };

/** Lo más arriba en la barra: lo que ya salió tapa a lo propuesto */
const BAR_ORDER: IdeaStage[] = ["propuesta", "usada", "programada", "publicada"];

interface Episode {
  key: string;
  title: string;
  duration: number;
  ideas: ShortIdea[];
  status: SourceStatus;
  lastActivity: string;
}

/** Barra del episodio: el ancho es todo el video y cada idea pinta sus tramos según en qué quedó */
export function CoverageBar({ ideas, duration, className }: { ideas: ShortIdea[]; duration: number; className?: string }) {
  const visible = ideas.filter((i) => i.stage !== "descartada").sort((a, b) => BAR_ORDER.indexOf(a.stage) - BAR_ORDER.indexOf(b.stage));
  return (
    <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      {duration > 0 &&
        visible.flatMap((idea) =>
          idea.segments.map((s, i) => (
            <span
              key={`${idea.id}-${i}`}
              title={`${idea.title || "Short"} · ${STAGE_LABELS[idea.stage]}`}
              className={cn("absolute inset-y-0", STAGE_TONES[idea.stage].bar)}
              style={{ left: `${(s.start / duration) * 100}%`, width: `${Math.max(0.6, ((s.end - s.start) / duration) * 100)}%` }}
            />
          ))
        )}
    </div>
  );
}

export function SourceLevelChip({ status, className }: { status: Pick<SourceStatus, "used" | "budget" | "coveragePct" | "level">; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1", SOURCE_LEVEL_TONES[status.level], className)}>
      {status.used}/{status.budget} · {status.coveragePct} %
    </span>
  );
}

interface ShortIdeasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideas: ShortIdea[];
  loading: boolean;
}

/** Registro de ideas del canal: sirve para decidir de qué episodio sale el próximo Short */
export function ShortIdeasSheet({ open, onOpenChange, ideas, loading }: ShortIdeasSheetProps) {
  const [episode, setEpisode] = useState(ALL);
  const [stage, setStage] = useState<IdeaStage | typeof ALL>(ALL);

  const episodes = useMemo<Episode[]>(() => {
    const groups = new Map<string, ShortIdea[]>();
    for (const idea of ideas) groups.set(idea.sourceKey, [...(groups.get(idea.sourceKey) ?? []), idea]);
    return [...groups.entries()]
      .map(([key, list]) => {
        const duration = list.find((i) => i.sourceDuration)?.sourceDuration ?? Math.max(0, ...list.flatMap((i) => i.segments.map((s) => s.end)));
        const lastActivity = list.reduce((max, i) => [i.updatedAt, i.plannedAt ?? ""].reduce((m, d) => (d > m ? d : m), max), "");
        return {
          key,
          title: list.find((i) => i.sourceTitle)?.sourceTitle || "Episodio sin nombre",
          duration,
          ideas: [...list].sort((a, b) => (b.plannedAt ?? b.createdAt).localeCompare(a.plannedAt ?? a.createdAt)),
          status: sourceSummary(ideas, key, duration),
          lastActivity,
        };
      })
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [ideas]);

  const shown = episodes
    .filter((e) => episode === ALL || e.key === episode)
    .map((e) => ({ ...e, list: e.ideas.filter((i) => stage === ALL || i.stage === stage) }))
    .filter((e) => e.list.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Registro de ideas
          </SheetTitle>
          <SheetDescription>
            Cada Short que propuso la IA, de qué episodio salió y en qué quedó. Úsalo para decidir de qué episodio sacas el próximo.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Select value={episode} onValueChange={setEpisode}>
            <SelectTrigger className="h-9 w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los episodios</SelectItem>
              {episodes.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={(v) => setStage(v as IdeaStage | typeof ALL)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {(Object.keys(STAGE_LABELS) as IdeaStage[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {BAR_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-3 rounded-sm", STAGE_TONES[s].bar)} />
              {STAGE_LABELS[s]}
            </span>
          ))}
        </div>

        {loading && !ideas.length ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {ideas.length ? "Nada con esos filtros." : "Todavía no hay ideas registradas. Aparecen al analizar un video en la Fábrica."}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {shown.map((e) => (
              <section key={e.key} className="space-y-2 rounded-2xl border border-border/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold text-foreground" title={e.title}>
                    {e.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", SOURCE_LEVEL_TONES[e.status.level])}>
                      {SOURCE_LEVEL_LABELS[e.status.level]}
                    </span>
                    <SourceLevelChip status={e.status} />
                  </div>
                </div>
                <CoverageBar ideas={e.ideas} duration={e.duration} />
                {e.status.level !== "ok" && <p className="text-[11px] text-muted-foreground">{e.status.message}</p>}
                <ul className="divide-y divide-border/50">
                  {e.list.map((idea) => (
                    <li key={idea.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm", idea.stage === "descartada" ? "text-muted-foreground" : "text-foreground")}>
                          {idea.title || idea.hookLine || "Short sin título"}
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className={cn("rounded-full px-1.5 py-px font-medium", STAGE_TONES[idea.stage].chip)}>{STAGE_LABELS[idea.stage]}</span>
                          {idea.format && <span>{FORMAT_LABELS[idea.format] ?? idea.format}</span>}
                          {idea.plannedAt && <span>· {format(new Date(idea.plannedAt), "EEE d MMM HH:mm", { locale: es })}</span>}
                        </p>
                      </div>
                      <SimilarityBadge
                        idea={{ similarity: idea.similarity, level: similarityLevel(idea.similarity), reason: idea.similarityReason ?? "" }}
                        className="text-[11px]"
                      />
                      {idea.youtubeVideoId && (
                        <a
                          href={`https://www.youtube.com/shorts/${idea.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-300 hover:text-red-200"
                          title="Ver en YouTube"
                        >
                          <Youtube className="h-4 w-4" />
                        </a>
                      )}
                      {idea.igPermalink && (
                        <a href={idea.igPermalink} target="_blank" rel="noopener noreferrer" className="text-pink-300 hover:text-pink-200" title="Ver en Instagram">
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                      {!idea.youtubeVideoId && !idea.igPermalink && idea.sourceVideoId && (
                        <a
                          href={`https://www.youtube.com/watch?v=${idea.sourceVideoId}&t=${Math.floor(idea.segments[0]?.start ?? 0)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Ver el momento en el episodio"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
