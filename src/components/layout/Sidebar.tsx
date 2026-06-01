import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  TrendingUp,
  Bot,
  Megaphone,
  Bell,
  HelpCircle,
  Cog,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

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
  { title: "Entregas", href: "/entregas", icon: Package },
  {
    title: "Resultados",
    href: "/resultados",
    icon: TrendingUp,
    children: [
      { title: "Métricas", href: "/resultados/metricas" },
      { title: "Ventas", href: "/resultados/ventas" },
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
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Publicidad */}
      <div className="px-3 pb-2">
        <NavLink
          to="/publicidad"
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isExpanded ? "gap-3" : "justify-center",
              isActive
                ? "bg-violet-500/20 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)] border border-violet-500/30"
                : "text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20"
            )
          }
          title={!isExpanded ? "Publicidad" : undefined}
        >
          <Megaphone className="h-5 w-5 shrink-0" />
          <span className={cn(
            "whitespace-nowrap font-semibold transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}>
            Publicidad
          </span>
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
