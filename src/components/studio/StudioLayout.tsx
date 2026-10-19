import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChartLine, ChevronDown, Clapperboard, Home, LayoutDashboard, LogOut, Menu, PlugZap, Rocket, Scissors, Workflow } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ModeSwitchButton } from "@/components/shared/ModeSwitchButton";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StudioProvider, useStudio } from "@/contexts/StudioContext";
import { useAuth } from "@/hooks/use-auth";
import { logout } from "@/lib/auth";
import { PLATFORM_IDS, PLATFORMS } from "@/lib/studio/platforms";
import { cn } from "@/lib/utils";

const generalNav = [
  { title: "Panel central", href: "/studio", icon: LayoutDashboard, end: true },
  { title: "Cuentas conectadas", href: "/studio/cuentas", icon: PlugZap },
  { title: "Automatizaciones", href: "/studio/automatizaciones", icon: Workflow },
];

const pageTitles: Record<string, string> = {
  "/studio": "Panel central",
  "/studio/cuentas": "Cuentas conectadas",
  "/studio/automatizaciones": "Automatizaciones",
  "/studio/youtube": "YouTube",
  "/studio/youtube/analisis": "YouTube · Análisis",
  "/studio/youtube/programar": "YouTube · Programación",
  "/studio/youtube/shorts": "YouTube · Shorts",
  "/studio/youtube/rendimiento": "YouTube · Rendimiento",
  "/studio/instagram": "Instagram",
  "/studio/instagram/programar": "Instagram · Programación",
  "/studio/instagram/analisis": "Instagram · Análisis",
  "/studio/instagram/rendimiento": "Instagram · Rendimiento",
  "/studio/tiktok": "TikTok",
};

// Submódulos que se despliegan bajo la plataforma cuando está abierta
const platformSubNav: Partial<Record<string, { title: string; href: string; icon: React.ElementType; end?: boolean }[]>> = {
  youtube: [
    { title: "Contenido", href: "/studio/youtube", icon: Clapperboard, end: true },
    { title: "Análisis", href: "/studio/youtube/analisis", icon: ChartLine },
    { title: "Rendimiento", href: "/studio/youtube/rendimiento", icon: Rocket },
    { title: "Programación", href: "/studio/youtube/programar", icon: CalendarDays },
    { title: "Shorts", href: "/studio/youtube/shorts", icon: Scissors },
  ],
  instagram: [
    { title: "Inicio", href: "/studio/instagram", icon: Home, end: true },
    { title: "Programación", href: "/studio/instagram/programar", icon: CalendarDays },
    { title: "Análisis", href: "/studio/instagram/analisis", icon: ChartLine },
    { title: "Rendimiento", href: "/studio/instagram/rendimiento", icon: Rocket },
  ],
};

function StudioBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="studio-gradient-bg flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white shadow-[0_0_24px_-4px_rgba(192,132,252,0.8)]">
        V
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-wide text-foreground">VEXA</p>
        <p className="studio-gradient-text text-[11px] font-semibold uppercase tracking-[0.2em]">Content Studio</p>
      </div>
    </div>
  );
}

function StudioNav({ onNavigate }: { onNavigate?: () => void }) {
  const { accounts } = useStudio();
  const pathname = usePathname() ?? "";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-3 py-5">
      <ul className="space-y-1">
        {generalNav.map((item) => (
          <li key={item.href}>
            <NavLink to={item.href} end={item.end} className={linkClass} onClick={onNavigate}>
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Plataformas
        </p>
        <ul className="space-y-1">
          {PLATFORM_IDS.map((id) => {
            const count = accounts.filter((a) => a.platform === id && a.managed).length;
            const subNav = platformSubNav[id];
            const expanded = Boolean(subNav) && (pathname === `/studio/${id}` || pathname.startsWith(`/studio/${id}/`));
            return (
              <li key={id}>
                <NavLink to={`/studio/${id}`} end={Boolean(subNav)} className={() => linkClass({ isActive: expanded || pathname === `/studio/${id}` })} onClick={onNavigate}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", PLATFORMS[id].chipClassName)}>
                    <PlatformIcon platform={id} className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{PLATFORMS[id].name}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{count}</span>
                  )}
                  {subNav && (
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
                  )}
                </NavLink>
                {subNav && expanded && (
                  <ul className="mt-1 ml-[22px] space-y-0.5 border-l border-sidebar-border pl-3 animate-fade-in">
                    {subNav.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          end={item.end}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                              isActive ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.name || "Mi cuenta";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
  };

  return (
    <div className="studio-bg min-h-screen text-foreground animate-fade-in">
      {/* Sidebar desktop */}
      <aside className="studio-glass fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-y-0 border-l-0 lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <StudioBrand />
        </div>
        <StudioNav />
        <div className="border-t border-sidebar-border p-3">
          <ModeSwitchButton to="chat" />
        </div>
      </aside>

      {/* Menú móvil / tablet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[290px] flex-col border-sidebar-border bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border p-4 text-left">
            <SheetTitle>
              <StudioBrand />
            </SheetTitle>
          </SheetHeader>
          <StudioNav onNavigate={() => setMenuOpen(false)} />
          <div className="space-y-2 border-t border-sidebar-border p-3">
            <ModeSwitchButton to="chat" onNavigate={() => setMenuOpen(false)} />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl md:h-16 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="lg:hidden">
              <StudioBrand />
            </div>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Content Studio <span className="mx-1.5 text-border">/</span>
              <span className="font-medium text-foreground">{pageTitles[pathname] ?? "Studio"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ModeSwitchButton to="chat" variant="icon" />
            <Avatar className="hidden h-8 w-8 border border-primary/40 sm:flex">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials || "?"}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" className="hidden h-9 w-9 text-muted-foreground lg:inline-flex" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Layout del Content Studio. Activa el tema lila (.studio-theme) en <html>
 * mientras está montado, para que también lo tomen los portales de shadcn.
 */
export function StudioLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("studio-theme");
    return () => root.classList.remove("studio-theme");
  }, []);

  return (
    <StudioProvider>
      <div className="studio-theme">
        <StudioShell>{children}</StudioShell>
      </div>
    </StudioProvider>
  );
}
