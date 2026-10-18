import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { ModeSwitchButton } from "@/components/shared/ModeSwitchButton";
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
  MessageSquare,
  Bot,
  Brain,
  Lock,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { mockUser } from "@/lib/mock/data";
import { useSubscription } from "@/hooks/use-subscription";
import type { PlanId } from "@/lib/plan";

interface NavChild {
  title: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isUpgrade?: boolean;
  /** Si true, el padre solo se marca activo en coincidencia exacta */
  exactActive?: boolean;
  children?: NavChild[];
}

const mainNavItems: NavItem[] = [
  {
    title: "Ajustes del Agente",
    href: "/ajustes-agente",
    icon: Bot,
    exactActive: true,
    children: [
      {
        title: "Análisis del agente",
        href: "/ajustes-agente/analisis",
        icon: Brain,
      },
    ],
  },
  { title: "Chats", href: "/chats", icon: MessageSquare },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const pathname = usePathname();
  const router = useRouter();
  const userProfile = getUserProfile();
  const { user: authUser } = useAuth();
  
  const { subscription } = useSubscription();
  const currentPlan: PlanId = (subscription?.plan as PlanId) || 'basic';
  const hasPremium = currentPlan === 'pro' || currentPlan === 'enterprise';

  const displayName = userProfile?.companyName || authUser?.name || mockUser.name;
  const displayLogo = userProfile?.logo || null;
  const displayRole = authUser?.role || mockUser.role;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string, exact = false) => {
    if (href === "/" || exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
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

          <nav className="p-3">
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <div key={item.title}>
                  <button
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                      isActive(item.href, item.exactActive)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground active:bg-secondary"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.title}</span>
                    {item.isUpgrade && !hasPremium && <Lock className="h-4 w-4 text-warning" />}
                  </button>

                  {item.children && item.children.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.href}
                            onClick={() => handleNavigation(child.href)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-colors text-left",
                              pathname === child.href
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground active:bg-secondary"
                            )}
                          >
                            {ChildIcon ? (
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            )}
                            {child.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-border space-y-2">
          <ModeSwitchButton to="studio" onNavigate={() => onOpenChange(false)} />
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
