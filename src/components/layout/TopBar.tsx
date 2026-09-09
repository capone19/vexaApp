import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronDown, 
  LogOut, 
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Page titles for mobile header
const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/ajustes-agente": "Agente",
  "/ajustes-agente/analisis": "Análisis",
  "/chats": "Chats",
  "/calendario": "Calendario",
  "/facturacion": "Facturación",
  "/reportes": "Reportes",
  "/marketing": "Marketing",
  "/marketing/plantillas": "Plantillas",
  "/marketing/performance": "Performance",
  "/configuracion": "Configuración",
};

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState(getUserProfile());
  
  // Get current page title
  const currentPageTitle = pageTitles[location.pathname] || "VEXA";
  
  // Check if we can go back
  const canGoBack = location.pathname !== "/" && window.history.length > 1;

  // Escuchar cambios en el perfil (evento personalizado y storage)
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserProfile(getUserProfile());
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);
  
  // Obtener usuario autenticado
  const { user: authUser } = useAuth();
  
  // Usar el nombre del perfil guardado, usuario autenticado, o el mock por defecto
  const displayName = userProfile?.companyName || authUser?.name || mockUser.name || '';
  const displayLogo = userProfile?.logo || null;
  const displayRole = authUser?.role || mockUser.role || 'Admin';
  
  const initials = displayName
    ? displayName
        .split(" ")
        .filter((n: string) => n.length > 0)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className={cn(
      "sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm",
      // Desktop
      "md:h-16 md:px-6",
      // Mobile: compact header
      "h-14 px-4"
    )}>
      {/* Left side - Mobile: Back button + Title, Desktop: empty */}
      <div className="flex items-center gap-3">
        {isMobile && canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {isMobile && (
          <h1 className="font-semibold text-foreground">{currentPageTitle}</h1>
        )}
      </div>

      {/* Right side - user menu */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* User Dropdown - Desktop only, on mobile it's in the drawer */}
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 hover:bg-secondary"
              >
                <Avatar className="h-8 w-8 border border-border">
                  {displayLogo && <AvatarImage src={displayLogo} alt={displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/configuracion')}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout();
                  navigate('/auth');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile: Avatar with dropdown for logout */}
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                <Avatar className="h-8 w-8 border border-border">
                  {displayLogo && <AvatarImage src={displayLogo} alt={displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">{displayName}</div>
              <div className="px-2 pb-1.5 text-xs text-muted-foreground capitalize">{displayRole}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/configuracion')}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout();
                  navigate('/auth');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
