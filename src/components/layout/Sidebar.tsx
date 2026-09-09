import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Bot,
  Brain,
  Cog,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isUpgrade?: boolean;
  children?: NavItem[];
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    title: "Ajustes del Agente",
    href: "/ajustes-agente",
    icon: Bot,
    children: [
      {
        title: "Análisis del agente",
        href: "/ajustes-agente/analisis",
        icon: Brain,
      },
    ],
  },
  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Entregas", href: "/entregas", icon: Package },
];

const bottomNavItems: NavItem[] = [
  { title: "Configuración", href: "/configuracion", icon: Cog },
];

interface SidebarProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function Sidebar({ isExpanded, onExpandedChange }: SidebarProps) {
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
              <NavLink
                to={item.href}
                end={item.href === "/" || item.href === "/ajustes-agente"}
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

              {item.children && item.children.length > 0 && (
                <ul
                  className={cn(
                    "mt-1 space-y-0.5",
                    isExpanded
                      ? "ml-4 border-l border-border pl-3"
                      : "flex flex-col items-center"
                  )}
                >
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <NavLink
                        to={child.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                            isExpanded ? "gap-2" : "justify-center",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )
                        }
                        title={!isExpanded ? child.title : undefined}
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        <span className={cn(
                          "whitespace-nowrap transition-all duration-300",
                          isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                        )}>
                          {child.title}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

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
