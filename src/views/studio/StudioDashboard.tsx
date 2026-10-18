import Link from "next/link";
import { ArrowUpRight, CalendarClock, PlugZap, Sparkles, Users, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { PostList } from "@/components/studio/PostList";
import { StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { formatFollowers, PLATFORM_IDS, PLATFORMS } from "@/lib/studio/platforms";
import { cn } from "@/lib/utils";

export default function StudioDashboard() {
  const { accounts, posts, automations, hasDemoData, clearDemoData } = useStudio();

  const managed = accounts.filter((a) => a.managed);
  const totalFollowers = managed.reduce((sum, a) => sum + a.followers, 0);
  const queue = posts
    .filter((p) => p.status === "programado" || p.status === "procesando")
    .sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt));
  const activeAutomations = automations.filter((a) => a.enabled).length;

  const stats = [
    { label: "Cuentas gestionadas", value: String(managed.length), icon: Users },
    { label: "Alcance total", value: formatFollowers(totalFollowers), icon: Sparkles },
    { label: "En cola", value: String(queue.length), icon: CalendarClock },
    { label: "Automatizaciones activas", value: String(activeAutomations), icon: Zap },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {hasDemoData && (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Estás viendo <span className="font-medium text-foreground">datos de ejemplo</span>. Se reemplazan al conectar tus cuentas reales.
          </p>
          <Button size="sm" variant="ghost" onClick={clearDemoData}>
            Quitar ejemplos
          </Button>
        </div>
      )}

      <StudioPageHeader
        eyebrow="Panel central"
        title="Todo tu contenido, en un solo lugar"
        subtitle="Conecta tus canales, crea con IA y deja tus publicaciones en piloto automático."
        actions={
          <Button asChild className="gap-2">
            <Link href="/studio/cuentas">
              <PlugZap className="h-4 w-4" />
              Conectar cuenta
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StudioCard key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</p>
          </StudioCard>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORM_IDS.map((id) => {
          const meta = PLATFORMS[id];
          const platformAccounts = accounts.filter((a) => a.platform === id);
          const managedCount = platformAccounts.filter((a) => a.managed).length;
          return (
            <Link key={id} href={`/studio/${id}`} className="group">
              <StudioCard className={cn("studio-glow-hover relative h-full overflow-hidden bg-gradient-to-br", meta.gradientClassName)}>
                <div className="flex items-start justify-between">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", meta.chipClassName)}>
                    <PlatformIcon platform={id} className="h-6 w-6" />
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <p className="mt-4 text-lg font-semibold">{meta.name}</p>
                <p className="text-sm text-muted-foreground">{meta.tagline}</p>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-background/60 px-2.5 py-1 font-medium">
                    {platformAccounts.length} {platformAccounts.length === 1 ? "cuenta" : "cuentas"}
                  </span>
                  <span className="rounded-full bg-background/60 px-2.5 py-1 text-muted-foreground">{managedCount} gestionadas</span>
                </div>
              </StudioCard>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StudioCard className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Próximas publicaciones</h2>
            <span className="text-xs text-muted-foreground">{queue.length} en cola</span>
          </div>
          <PostList posts={queue.slice(0, 6)} showPlatform />
        </StudioCard>

        <StudioCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Automatizaciones</h2>
            <Workflow className="h-4 w-4 text-primary" />
          </div>
          <ul className="space-y-3">
            {automations.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    a.enabled ? "bg-success shadow-[0_0_10px_hsl(var(--success))]" : "bg-muted-foreground/40"
                  )}
                />
                <span className={cn("flex-1 truncate", !a.enabled && "text-muted-foreground")}>{a.title}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="mt-5 w-full">
            <Link href="/studio/automatizaciones">Ver todas</Link>
          </Button>
        </StudioCard>
      </div>
    </div>
  );
}
