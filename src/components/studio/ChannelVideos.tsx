import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, ExternalLink, Eye, Loader2, MessageCircle, RefreshCw, ThumbsUp, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StudioCard } from "@/components/studio/StudioUI";
import { formatFollowers } from "@/lib/studio/platforms";
import {
  fetchYouTubeVideos,
  formatDuration,
  YOUTUBE_ERROR_MESSAGES,
  type YouTubeChannelStats,
  type YouTubeVideo,
} from "@/lib/studio/youtube";
import type { SocialAccount } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

type Filter = "todos" | "videos" | "shorts";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
];

const PRIVACY_LABELS: Record<string, string> = {
  private: "Privado",
  unlisted: "No listado",
};

interface ChannelVideosProps {
  /** Canales de YouTube conectados por OAuth que se están mostrando */
  accounts: SocialAccount[];
  /** Se llama cuando la API devuelve estadísticas frescas del canal */
  onChannelStats?: (accountId: string, stats: YouTubeChannelStats) => void;
  /** Videos de la primera página (para contar los programados) */
  onVideos?: (accountId: string, videos: YouTubeVideo[]) => void;
}

export function ChannelVideos({ accounts, onChannelStats, onVideos }: ChannelVideosProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channel, setChannel] = useState<YouTubeChannelStats | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");

  // Si cambia el filtro de cuentas de la página, seguir mostrando una que exista
  useEffect(() => {
    if (!accounts.some((a) => a.id === accountId)) setAccountId(accounts[0]?.id ?? "");
  }, [accounts, accountId]);

  const load = useCallback(
    async (pageToken?: string) => {
      if (!accountId) return;
      if (pageToken) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchYouTubeVideos(accountId, pageToken);
      if ("code" in result) {
        setError(YOUTUBE_ERROR_MESSAGES[result.code] ?? result.code);
        if (!pageToken) setVideos([]);
      } else {
        setVideos((prev) => (pageToken ? [...prev, ...result.videos] : result.videos));
        setNextPage(result.nextPageToken);
        setChannel(result.channel);
        if (!pageToken) {
          onChannelStats?.(accountId, result.channel);
          onVideos?.(accountId, result.videos);
        }
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [accountId, onChannelStats, onVideos]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      videos.filter((v) => (filter === "todos" ? true : filter === "shorts" ? v.isShort : !v.isShort)),
    [videos, filter]
  );

  return (
    <StudioCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Contenido del canal</h2>
          <p className="text-xs text-muted-foreground">
            {channel
              ? `${formatFollowers(channel.videos)} videos · ${formatFollowers(channel.views)} vistas totales`
              : "Videos publicados en YouTube"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {accounts.length > 1 && (
            <div className="flex rounded-lg bg-secondary/60 p-0.5">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    accountId === acc.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {acc.handle}
                </button>
              ))}
            </div>
          )}
          <div className="flex rounded-lg bg-secondary/60 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => load()}
            disabled={loading}
            aria-label="Actualizar"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-soft p-3 text-sm text-error-soft-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Video className="h-6 w-6" />}
          title={videos.length === 0 ? "Este canal aún no tiene videos" : `Sin ${filter} en lo cargado`}
          description={
            videos.length === 0
              ? "Cuando subas tu primer video aparecerá aquí con sus estadísticas."
              : nextPage
                ? "Carga más videos para buscar en el resto del canal."
                : "Prueba con otro filtro."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}

      {!error && !loading && nextPage && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={() => load(nextPage)} disabled={loadingMore} className="gap-2">
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Cargar más
          </Button>
        </div>
      )}
    </StudioCard>
  );
}

function VideoCard({ video }: { video: YouTubeVideo }) {
  const url = video.isShort ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`;
  const privacy =
    video.privacy === "private" && video.publishAt
      ? `Programado · ${format(new Date(video.publishAt), "d MMM HH:mm", { locale: es })}`
      : PRIVACY_LABELS[video.privacy];
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-xl p-1 transition-colors hover:bg-primary/5"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary ring-1 ring-border/60">
        {video.thumbnail ? (
          // Miniaturas de i.ytimg.com: sin next/image para no configurar dominios remotos
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Video className="h-6 w-6" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {video.isShort && (
            <span className="rounded-md bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Short</span>
          )}
          {video.live !== "none" && (
            <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
              {video.live === "live" ? "En vivo" : "Próximo"}
            </span>
          )}
          {privacy && (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{privacy}</span>
          )}
        </div>
        {video.durationSeconds > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-md bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{video.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatFollowers(video.views)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {formatFollowers(video.likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatFollowers(video.comments)}
          </span>
          {video.publishedAt && (
            <span>{formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true, locale: es })}</span>
          )}
        </div>
      </div>
    </a>
  );
}
