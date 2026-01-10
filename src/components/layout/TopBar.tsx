import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Bell, 
  ChevronDown, 
  LogOut, 
  Settings,
  CalendarCheck,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { logout, getCurrentUser } from "@/lib/auth";
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
  "/chats": "Chats",
  "/calendario": "Calendario",
  "/resultados": "Resultados",
  "/resultados/metricas": "Métricas",
  "/resultados/ventas": "Ventas",
  "/facturacion": "Facturación",
  "/reportes": "Reportes",
  "/marketing": "Marketing",
  "/marketing/plantillas": "Plantillas",
  "/marketing/performance": "Performance",
  "/notificaciones": "Notificaciones",
  "/soporte": "Soporte",
  "/configuracion": "Configuración",
};

// Tipos de notificación
type NotificationType = 'appointment' | 'message' | 'alert' | 'system' | 'success';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  metadata?: {
    clientName?: string;
  };
}

// Mock de las últimas notificaciones (sin mensajes de chat)
const initialNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'appointment',
    title: 'Nueva cita agendada',
    description: 'María González agendó Corte de cabello para hoy a las 15:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
    metadata: { clientName: 'María González' },
  },
  {
    id: 'notif-002',
    type: 'appointment',
    title: 'Recordatorio: Cita en 1 hora',
    description: 'Ana Rodríguez tiene cita de Manicure + Pedicure a las 16:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    metadata: { clientName: 'Ana Rodríguez' },
  },
  {
    id: 'notif-003',
    type: 'alert',
    title: 'Cita cancelada',
    description: 'Pedro Silva canceló su cita de Tratamiento capilar programada para mañana',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    read: false,
    metadata: { clientName: 'Pedro Silva' },
  },
  {
    id: 'notif-004',
    type: 'success',
    title: 'Cita confirmada',
    description: 'Valentina Torres confirmó su asistencia para Tinte completo',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: false,
    metadata: { clientName: 'Valentina Torres' },
  },
  {
    id: 'notif-005',
    type: 'system',
    title: 'Actualización del sistema',
    description: 'Se han aplicado mejoras de rendimiento a tu cuenta',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    read: false,
  },
];

// Función para obtener IDs de notificaciones leídas desde localStorage
const getReadNotificationIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Función para guardar IDs de notificaciones leídas en localStorage
const saveReadNotificationIds = (ids: Set<string>) => {
  localStorage.setItem('readNotifications', JSON.stringify([...ids]));
};

// Aplicar estado de lectura desde localStorage
const getNotificationsWithReadState = (): Notification[] => {
  const readIds = getReadNotificationIds();
  return initialNotifications.map(n => ({
    ...n,
    read: readIds.has(n.id)
  }));
};

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return CalendarCheck;
    case 'message':
      return MessageSquare;
    case 'alert':
      return AlertTriangle;
    case 'success':
      return CheckCircle;
    case 'system':
      return Info;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return 'text-primary bg-primary/10';
    case 'message':
      return 'text-sky-500 bg-sky-500/10';
    case 'alert':
      return 'text-amber-500 bg-amber-500/10';
    case 'success':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'system':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

// Mapa de redirección por tipo de notificación
const notificationRoutes: Record<NotificationType, string> = {
  appointment: '/calendario',
  alert: '/calendario',
  success: '/calendario',
  message: '/chats',
  system: '/configuracion',
};

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>(getNotificationsWithReadState);
  const [isOpen, setIsOpen] = useState(false);
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
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Obtener usuario autenticado
  const authUser = getCurrentUser();
  
  // Usar el nombre del perfil guardado, usuario autenticado, o el mock por defecto
  const displayName = userProfile?.companyName || authUser?.companyName || mockUser.name;
  const displayLogo = userProfile?.logo || null;
  const displayRole = authUser?.role || mockUser.role;
  
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    const readIds = getReadNotificationIds();
    readIds.add(id);
    saveReadNotificationIds(readIds);
  };

  const getRouteForNotification = (notification: Notification): string => {
    const title = notification.title.toLowerCase();
    
    if (title.includes('factura')) {
      return '/facturacion';
    }
    
    return notificationRoutes[notification.type] || '/';
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    const route = getRouteForNotification(notification);
    navigate(route);
  };

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

      {/* Right side - notifications + user */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative text-muted-foreground hover:text-foreground hover:bg-secondary",
                "h-9 w-9 md:h-10 md:w-10"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            sideOffset={8}
            className={cn(
              "p-0 bg-white/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200",
              // Mobile: full width with margins
              "w-[calc(100vw-2rem)] max-w-[400px] md:w-96"
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary transition-colors cursor-pointer border-b border-border/30 last:border-b-0",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", colorClass)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-tight",
                          !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {notification.metadata?.clientName || notification.description}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border/50 bg-secondary/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notificaciones");
                }}
              >
                Ver todas las notificaciones
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
                onClick={() => {
                  logout();
                  navigate('/auth');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile: Simple avatar indicator */}
        {isMobile && (
          <Avatar className="h-8 w-8 border border-border">
            {displayLogo && <AvatarImage src={displayLogo} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
