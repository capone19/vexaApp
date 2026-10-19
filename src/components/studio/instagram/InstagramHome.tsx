import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, ExternalLink, Plus, Repeat2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReelComposerDialog } from "@/components/studio/instagram/ReelComposerDialog";
import { ReelStatusChip, whenLabel } from "@/components/studio/instagram/ReelParts";
import { AccountStatusBadge, StudioCard } from "@/components/studio/StudioUI";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useYouTubeChannel } from "@/hooks/use-youtube-channel";
import {
  reelOccupants,
  RETRY_HELP,
  subscribePublications,
  type InstagramPublication,
  type PublicationSubscription,
} from "@/lib/studio/instagram";
import { formatFollowers } from "@/lib/studio/platforms";
import { hasPublishPlan, normalizePlan } from "@/lib/studio/publish-plan";
import type { SocialAccount } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

const LIST_SIZE = 5;

const PERMISSION_TEXT: Record<SocialAccount["status"], string> = {
  conectada: "Permiso para publicar activo",
  pendiente: "Falta terminar de autorizar la cuenta",
  error: "El permiso venció: vuelve a conectar la cuenta",
};

export interface InstagramHomeHandle {
  /** Abre el compositor con un Reel en blanco */
  newReel: () => void;
}

interface ComposerState {
  publication: InstagramPublication | null;
}

/** Inicio de Instagram: cuenta, próximos Reels, últimos publicados y errores pendientes */
export const InstagramHome = forwardRef<InstagramHomeHandle, { account: SocialAccount }>(function InstagramHome({ account }, ref) {
  const { channel: ytChannel } = useYouTubeChannel();
  const { tenantId } = useEffectiveTenant();
  const plan = useMemo(() => (hasPublishPlan(account.publishPlan) ? normalizePlan(account.publishPlan) : null), [account]);

  const [publications, setPublications] = useState<InstagramPublication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const subRef = useRef<PublicationSubscription | null>(null);
  const accountId = account.id;

  useImperativeHandle(ref, () => ({ newReel: () => setComposer({ publication: null }) }), []);

  useEffect(() => {
    setLoaded(false);
    setPublications([]);
    const sub = subscribePublications(
      accountId,
      (list) => {
        setPublications(list);
        setLoaded(true);
        setLoadError(false);
      },
      undefined,
      () => {
        setLoaded(true);
        setLoadError(true);
      }
    );
    subRef.current = sub;
    return () => {
      sub.stop();
      subRef.current = null;
    };
  }, [accountId]);

  const refresh = useCallback(() => void subRef.current?.refresh(), []);

  const upcoming = useMemo(
    () =>
      publications
        .filter((p) => (p.status === "programado" || p.status === "publicando") && p.scheduledAt)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, LIST_SIZE),
    [publications]
  );
  const published = useMemo(
    () =>
      publications
        .filter((p) => p.status === "publicado")
        .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())
        .slice(0, LIST_SIZE),
    [publications]
  );
  const errors = useMemo(() => publications.filter((p) => p.status === "error"), [publications]);
  const counts = useMemo(
    () => ({
      scheduled: publications.filter((p) => p.status === "programado").length,
      drafts: publications.filter((p) => p.status === "borrador").length,
    }),
    [publications]
  );

  const open = (publication: InstagramPublication) => setComposer({ publication });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <StudioCard className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-pink-500/40">
              {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt={account.displayName} />}
              <AvatarFallback className="bg-pink-500/15 text-lg font-semibold text-pink-300">
                {(account.displayName || account.handle).replace(/^@/, "").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{account.displayName || account.handle}</p>
              <p className="truncate text-sm text-muted-foreground">{account.handle.startsWith("@") ? account.handle : `@${account.handle}`}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusBadge status={account.status} />
            <span className={cn("text-xs", account.status === "conectada" ? "text-muted-foreground" : "text-amber-300")}>
              {PERMISSION_TEXT[account.status]}
            </span>
          </div>
          {account.status !== "conectada" && (
            <Button asChild size="sm" variant="secondary" className="self-start">
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Seguidores", value: formatFollowers(account.followers) },
              { label: "Programados", value: loaded ? String(counts.scheduled) : "…" },
              { label: "Borradores", value: loaded ? String(counts.drafts) : "…" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-secondary/40 p-3">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" className="flex-1 gap-1.5">
              <Link href="/studio/instagram/programar?replicar=1">
                <Repeat2 className="h-4 w-4" />
                Replicar semana desde YouTube
              </Link>
            </Button>
            <Button className="flex-1 gap-1.5" onClick={() => setComposer({ publication: null })}>
              <Plus className="h-4 w-4" />
              Nuevo Reel
            </Button>
          </div>
        </StudioCard>

        <div className="grid gap-4 md:grid-cols-2">
          <ReelList
            title="Próximos Reels"
            icon={<CalendarClock className="h-4 w-4 text-primary" />}
            empty={loaded ? "No hay Reels programados." : "Cargando…"}
            items={upcoming}
            when={(p) => p.scheduledAt}
            onOpen={open}
          />
          <ReelList
            title="Últimos publicados"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            empty={loaded ? "Todavía no se publica ningún Reel desde el Studio." : "Cargando…"}
            items={published}
            when={(p) => p.publishedAt ?? p.updatedAt}
            onOpen={open}
            showLink
          />
        </div>
      </div>

      {loadError && (
        <p className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          No se pudieron leer los Reels. Se reintentará solo en unos segundos.
        </p>
      )}

      {errors.length > 0 && (
        <StudioCard className="space-y-3 border border-red-500/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-red-400" />
              {errors.length === 1 ? "1 Reel no se pudo publicar" : `${errors.length} Reels no se pudieron publicar`}
            </h2>
            <Button asChild size="sm" variant="ghost" className="gap-1">
              <Link href="/studio/instagram/programar">
                Ir a Programación
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{RETRY_HELP}</p>
          <ul className="divide-y divide-border">
            {errors.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title || "Reel sin nombre"}</p>
                  <p className="line-clamp-2 text-xs text-red-300">{p.lastError || "No se pudo publicar"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => open(p)}>
                  Revisar
                </Button>
              </li>
            ))}
          </ul>
        </StudioCard>
      )}

      <ReelComposerDialog
        open={composer !== null}
        onOpenChange={(value) => !value && setComposer(null)}
        account={account}
        youtubeChannel={ytChannel}
        tenantId={tenantId}
        publication={composer?.publication ?? null}
        plan={plan}
        occupants={reelOccupants(publications, composer?.publication?.id)}
        onSaved={refresh}
      />
    </div>
  );
});

function ReelList({
  title,
  icon,
  empty,
  items,
  when,
  onOpen,
  showLink,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: InstagramPublication[];
  when: (p: InstagramPublication) => string | null;
  onOpen: (p: InstagramPublication) => void;
  showLink?: boolean;
}) {
  return (
    <StudioCard className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((p) => {
            const at = when(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary/50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{p.title || "Reel sin nombre"}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">{at ? whenLabel(at) : "Sin fecha"}</p>
                  </div>
                  {showLink && p.permalink ? (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Ver
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="shrink-0">
                      <ReelStatusChip publication={p} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </StudioCard>
  );
}
