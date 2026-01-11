import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Lock,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { mockUser } from "@/lib/mock/data";
import { isPremiumPlan, onPlanChange } from "@/lib/plan";

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

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Función para obtener el perfil del usuario desde localStorage
const getUserProfile = () => {
  try {
    const stored = localStorage.getItem('company_profile');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading profile:', e);
  }
  return null;
};

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const userProfile = getUserProfile();
  const { user: authUser } = useAuth();
  const [hasPremium, setHasPremium] = useState(isPremiumPlan());

  // Listen for plan changes
  useEffect(() => {
    const unsubscribe = onPlanChange(() => {
      setHasPremium(isPremiumPlan());
    });
    return unsubscribe;
  }, []);

  const displayName = userProfile?.companyName || authUser?.name || mockUser.name;
  const displayLogo = userProfile?.logo || null;
  const displayRole = authUser?.role || mockUser.role;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-3">
            <Logo variant="full" color="dark" className="h-6" />
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {/* User Profile */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                {displayLogo && <AvatarImage src={displayLogo} alt={displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="p-3">
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <div key={item.title}>
                  {item.children ? (
                    <div className="space-y-1">
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground"
                      )}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.isUpgrade && !hasPremium && <Lock className="h-4 w-4 text-warning" />}
                      </div>
                      <div className="ml-8 space-y-1">
                        {item.children.map((child) => (
                          <button
                            key={child.href}
                            onClick={() => handleNavigation(child.href)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                              location.pathname === child.href
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground active:bg-secondary"
                            )}
                          >
                            <ChevronRight className="h-3 w-3" />
                            {child.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground active:bg-secondary"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.isUpgrade && !hasPremium && <Lock className="h-4 w-4 text-warning" />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-border" />

            {/* Bottom Navigation */}
            <div className="space-y-1">
              {bottomNavItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-left",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground active:bg-secondary"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </nav>
        </ScrollArea>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
