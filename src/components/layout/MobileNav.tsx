import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Bot,
  Menu,
} from "lucide-react";

interface MobileNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Chats", href: "/chats", icon: MessageSquare },
  { title: "Calendario", href: "/calendario", icon: Calendar },
  { title: "Agente", href: "/ajustes-agente", icon: Bot },
];

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-2 left-2 right-2 z-50 bg-background/70 backdrop-blur-lg border border-border/50 rounded-3xl safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-lg transition-all active:scale-95",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 transition-transform",
              isActive(item.href) && "scale-110"
            )} />
            <span className={cn(
              "text-[10px] font-medium truncate max-w-full",
              isActive(item.href) && "font-semibold"
            )}>
              {item.title}
            </span>
          </NavLink>
        ))}
        
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-lg text-muted-foreground transition-all active:scale-95 active:text-primary"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menú</span>
        </button>
      </div>
    </nav>
  );
}
