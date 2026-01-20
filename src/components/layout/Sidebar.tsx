import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  TrendingUp,
  FileText,
  Megaphone,
  CreditCard,
  Bot,
  Bell,
  HelpCircle,
  Cog,
  ChevronDown,
  ChevronRight,
  Lock,
  Zap,
  Sparkles,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import type { PlanId } from "@/lib/plan";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isUpgrade?: boolean;
  children?: { title: string; href: string }[];
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Ajustes del Agente", href: "/ajustes-agente", icon: Bot },
  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Calendario", href: "/calendario", icon: Calendar },
  {
    title: "Resultados",
    href: "/resultados",
    icon: TrendingUp,
    children: [
      { title: "Métricas", href: "/resultados/metricas" },
      { title: "Ventas", href: "/resultados/ventas" },
    ],
  },
  { title: "Facturación", href: "/facturacion", icon: CreditCard },
  { title: "Reportes", href: "/reportes", icon: FileText, isUpgrade: true },
  {
    title: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    isUpgrade: true,
    children: [
      { title: "Plantillas", href: "/marketing/plantillas" },
      { title: "Performance", href: "/marketing/performance" },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { title: "Notificaciones", href: "/notificaciones", icon: Bell },
  { title: "Soporte", href: "/soporte", icon: HelpCircle },
  { title: "Configuración", href: "/configuracion", icon: Cog },
];

interface SidebarProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function Sidebar({ isExpanded, onExpandedChange }: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  // Obtener plan real de la suscripción
  const { subscription } = useSubscription();
  const currentPlan: PlanId = (subscription?.plan as PlanId) || 'basic';
  const hasPremium = currentPlan === 'pro' || currentPlan === 'enterprise';

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar flex-col transition-all duration-300 ease-in-out",
        // Hide on mobile/tablet, show on desktop
        "hidden lg:flex",
        isExpanded ? "w-64" : "w-[72px]"
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Logo VEXA */}
      <div className={cn(
        "flex h-16 items-center border-b border-border transition-all duration-300",
        isExpanded ? "px-6 gap-3" : "px-4 justify-center"
      )}>
        {isExpanded ? (
          <Logo variant="full" color="dark" className="h-7" />
        ) : (
          <Logo variant="icon" color="dark" className="h-9 w-9" />
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.title}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => isExpanded && toggleExpanded(item.title)}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isExpanded ? "justify-between" : "justify-center",
                      isActive(item.href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    title={!isExpanded ? item.title : undefined}
                  >
                    <div className={cn(
                      "flex items-center",
                      isExpanded ? "gap-3" : "gap-0"
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className={cn(
                        "whitespace-nowrap transition-all duration-300",
                        isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                      )}>
                        {item.title}
                      </span>
                      {item.isUpgrade && isExpanded && !hasPremium && (
                        <Lock className="h-3.5 w-3.5 text-warning" />
                      )}
                    </div>
                    {isExpanded && (
                      expandedItems.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )
                    )}
                  </button>
                  {isExpanded && expandedItems.includes(item.title) && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavLink
                            to={child.href}
                            className={({ isActive }) =>
                              cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              )
                            }
                          >
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isExpanded ? "gap-3" : "justify-center",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                  title={!isExpanded ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>
                    {item.title}
                  </span>
                  {item.isUpgrade && isExpanded && !hasPremium && (
                    <Lock className="h-3.5 w-3.5 text-warning" />
                  )}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* VEXA Ads - Premium Module */}
      <div className="px-3 py-3 border-t border-border">
        <NavLink
          to="/vexa-ads"
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all",
              isExpanded ? "gap-3" : "justify-center",
              isActive
                ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30"
                : "bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-400 hover:from-violet-500/20 hover:to-purple-500/20 border border-violet-500/20"
            )
          }
          title={!isExpanded ? "VEXA Ads" : undefined}
        >
          <div className="relative">
            <Zap className="h-5 w-5 shrink-0" />
            <Sparkles className="h-2.5 w-2.5 absolute -top-1 -right-1 text-violet-300" />
          </div>
          {isExpanded && (
            <>
              <span className="whitespace-nowrap font-semibold">VEXA Ads</span>
              <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded bg-violet-500/30 text-violet-200">
                Premium
              </span>
            </>
          )}
        </NavLink>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-border px-3 py-4">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    isExpanded ? "gap-3" : "justify-center",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
                title={!isExpanded ? item.title : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}>
                  {item.title}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
