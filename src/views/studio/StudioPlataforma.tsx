import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowRight, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelVideos } from "@/components/studio/ChannelVideos";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { PostComposerDialog } from "@/components/studio/PostComposerDialog";
import { PostList } from "@/components/studio/PostList";
import { AiBadge, EmptyState, SoonBadge, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { formatFollowers, isPlatformId, PLATFORMS } from "@/lib/studio/platforms";
import type { PlatformAction } from "@/lib/studio/types";
import type { YouTubeChannelStats } from "@/lib/studio/youtube";
import { cn } from "@/lib/utils";

const ALL = "todas";

export default function StudioPlataforma() {
  const params = useParams<{ plataforma: string }>();
  const platform = params?.plataforma;
  if (!isPlatformId(platform)) notFound();

  const meta = PLATFORMS[platform];
  const { accountsFor, posts, refreshAccounts } = useStudio();
  const managedAccounts = accountsFor(platform).filter((a) => a.managed);

  const [accountFilter, setAccountFilter] = useState<string>(ALL);
  const [activeAction, setActiveAction] = useState<PlatformAction | null>(null);

  const visibleAccountIds = accountFilter === ALL ? managedAccounts.map((a) => a.id) : [accountFilter];
  const platformPosts = useMemo(
    () => posts.filter((p) => p.platform === platform && (accountFilter === ALL || p.accountId === accountFilter)),
    [posts, platform, accountFilter]
  );

  const followers = managedAccounts
    .filter((a) => visibleAccountIds.includes(a.id))
    .reduce((sum, a) => sum + a.followers, 0);
  // Canales conectados por OAuth: de ellos se lee el contenido publicado
  const channelAccounts = useMemo(
    () => managedAccounts.filter((a) => a.remote && visibleAccountIds.includes(a.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [managedAccounts.map((a) => a.id).join(), visibleAccountIds.join()]
  );
  const accountFollowers = useMemo(
    () => Object.fromEntries(managedAccounts.map((a) => [a.id, a.followers])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [managedAccounts.map((a) => `${a.id}:${a.followers}`).join()]
  );
  const handleChannelStats = useCallback(
    (accountId: string, stats: YouTubeChannelStats) => {
      if (accountFollowers[accountId] !== stats.subscribers) void refreshAccounts();
    },
    [accountFollowers, refreshAccounts]
  );

  const scheduled = platformPosts.filter((p) => p.status === "programado").length;
  const drafts = platformPosts.filter((p) => p.status === "borrador").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <StudioPageHeader
        eyebrow="Plataforma"
        title={meta.name}
        subtitle={meta.tagline}
        icon={
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", meta.chipClassName)}>
            <PlatformIcon platform={platform} className="h-7 w-7" />
          </span>
        }
        actions={
          managedAccounts.length > 0 && (
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las cuentas ({managedAccounts.length})</SelectItem>
                {managedAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {managedAccounts.length === 0 ? (
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title={`Conecta tu primera cuenta de ${meta.name}`}
          description="Cuando tengas una cuenta gestionada podrás subir, generar con IA y programar desde aquí."
          action={
            <Button asChild>
              <Link href="/studio/cuentas">Ir a cuentas conectadas</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Seguidores", value: formatFollowers(followers) },
              { label: "Programadas", value: String(scheduled) },
              { label: "Borradores", value: String(drafts) },
            ].map((s) => (
              <StudioCard key={s.label} className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</p>
              </StudioCard>
            ))}
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Acciones</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {meta.actions.map((action) => {
                const available = action.availability === "disponible";
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setActiveAction(action)}
                    className={cn(
                      "studio-glass group flex flex-col rounded-2xl p-5 text-left",
                      available ? "studio-glow-hover" : "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <action.icon className="h-5 w-5" />
                      </span>
                      <div className="flex gap-1.5">
                        {action.ai && <AiBadge />}
                        {!available && <SoonBadge />}
                      </div>
                    </div>
                    <p className="mt-4 font-semibold">{action.title}</p>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{action.description}</p>
                    {available && (
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Abrir
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {platform === "youtube" && channelAccounts.length > 0 && (
            <ChannelVideos accounts={channelAccounts} onChannelStats={handleChannelStats} />
          )}

          <StudioCard>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Publicaciones</h2>
              <span className="text-xs text-muted-foreground">{platformPosts.length} en total</span>
            </div>
            <PostList posts={platformPosts} emptyText={`Usa una acción para crear tu primera publicación en ${meta.name}.`} />
          </StudioCard>
        </>
      )}

      <PostComposerDialog
        open={activeAction !== null}
        onOpenChange={(open) => !open && setActiveAction(null)}
        platform={platform}
        action={activeAction}
        accountIds={visibleAccountIds}
      />
    </div>
  );
}
