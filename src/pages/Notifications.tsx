import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  XCircle,
  Info,
  Trash2,
  Check,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  Scissors,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type NotificationType = 'appointment' | 'message' | 'alert' | 'system' | 'success';

type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'no-show' | 'completed' | 'pending-reschedule';

interface NotificationMetadata {
  clientName?: string;
  clientPhone?: string;
  service?: string;
  date?: Date;
  time?: string;
  location?: string;
  ticketValue?: number;
  appointmentStatus?: AppointmentStatus;
  notes?: string;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: NotificationMetadata;
}

// Mock notifications data con información expandida
const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'appointment',
    title: 'Nueva cita agendada',
    description: 'María González agendó Corte de cabello para hoy a las 15:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'María González',
      clientPhone: '+591 7 1234567',
      service: 'Corte de cabello',
      date: new Date(),
      time: '15:00',
      location: 'Sede Principal - Santiago Centro',
      ticketValue: 25000,
      appointmentStatus: 'scheduled',
    },
  },
  {
    id: 'notif-002',
    type: 'appointment',
    title: 'Recordatorio: Cita en 1 hora',
    description: 'Ana Rodríguez tiene cita de Manicure + Pedicure a las 16:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    metadata: {
      clientName: 'Ana Rodríguez',
      clientPhone: '+591 7 2345678',
      service: 'Manicure + Pedicure',
      date: new Date(),
      time: '16:00',
      location: 'Sede Principal - Santiago Centro',
      ticketValue: 35000,
      appointmentStatus: 'confirmed',
    },
  },
  {
    id: 'notif-003',
    type: 'alert',
    title: 'Cita cancelada',
    description: 'Pedro Silva canceló su cita de Tratamiento capilar programada para mañana',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    read: true,
    metadata: {
      clientName: 'Pedro Silva',
      clientPhone: '+591 7 3456789',
      service: 'Tratamiento capilar',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24),
      time: '10:00',
      location: 'Sede Providencia',
      ticketValue: 45000,
      appointmentStatus: 'cancelled',
      notes: 'Cliente indicó motivos personales',
    },
  },
  {
    id: 'notif-004',
    type: 'success',
    title: 'Cita confirmada',
    description: 'Valentina Torres confirmó su asistencia para Tinte completo',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
    metadata: {
      clientName: 'Valentina Torres',
      clientPhone: '+591 7 4567890',
      service: 'Tinte completo',
      date: new Date(Date.now() + 1000 * 60 * 60 * 48),
      time: '11:30',
      location: 'Sede Principal - Santiago Centro',
      ticketValue: 65000,
      appointmentStatus: 'confirmed',
    },
  },
  {
    id: 'notif-005',
    type: 'appointment',
    title: 'Reagendamiento solicitado',
    description: 'Camila Reyes solicita reagendar su cita de Alisado permanente',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    read: true,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'Camila Reyes',
      clientPhone: '+591 7 5678901',
      service: 'Alisado permanente',
      date: new Date(Date.now() + 1000 * 60 * 60 * 72),
      time: '14:00',
      location: 'Sede Las Condes',
      ticketValue: 120000,
      appointmentStatus: 'pending-reschedule',
      notes: 'Solicita cambiar a la próxima semana',
    },
  },
  {
    id: 'notif-006',
    type: 'system',
    title: 'Actualización del sistema',
    description: 'Se han aplicado mejoras de rendimiento a tu cuenta',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
  },
  {
    id: 'notif-007',
    type: 'success',
    title: 'Meta alcanzada',
    description: '¡Felicidades! Has completado 50 citas este mes',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: 'notif-008',
    type: 'appointment',
    title: 'Nueva cita agendada',
    description: 'Diego Fuentes agendó Corte + Barba para el viernes a las 11:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    read: true,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'Diego Fuentes',
      clientPhone: '+591 7 6789012',
      service: 'Corte + Barba',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      time: '11:00',
      location: 'Sede Principal - Santiago Centro',
      ticketValue: 28000,
      appointmentStatus: 'scheduled',
    },
  },
  {
    id: 'notif-009',
    type: 'alert',
    title: 'Cliente no se presentó',
    description: 'Roberto Muñoz no asistió a su cita programada',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    metadata: {
      clientName: 'Roberto Muñoz',
      clientPhone: '+591 7 7890123',
      service: 'Corte de cabello',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      time: '09:30',
      location: 'Sede Providencia',
      ticketValue: 25000,
      appointmentStatus: 'no-show',
      notes: 'No respondió llamadas de confirmación',
    },
  },
  {
    id: 'notif-010',
    type: 'system',
    title: 'Factura disponible',
    description: 'Tu factura del mes de diciembre está lista para descargar',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    actionUrl: '/facturacion',
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return CalendarCheck;
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
    case 'alert':
      return 'text-warning bg-warning/10';
    case 'success':
      return 'text-success bg-success/10';
    case 'system':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

const getStatusBadge = (status?: AppointmentStatus) => {
  switch (status) {
    case 'scheduled':
      return { label: 'Agendada', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'confirmed':
      return { label: 'Confirmada', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'cancelled':
      return { label: 'Cancelada', className: 'bg-red-100 text-red-700 border-red-200' };
    case 'no-show':
      return { label: 'No asistió', className: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'completed':
      return { label: 'Completada', className: 'bg-green-100 text-green-700 border-green-200' };
    case 'pending-reschedule':
      return { label: 'Reagendamiento pendiente', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    default:
      return null;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

// Componente para el detalle de la notificación según su tipo
function NotificationDetailContent({ notification }: { notification: Notification }) {
  const { type, metadata } = notification;
  const Icon = getNotificationIcon(type);
  const colorClass = getNotificationColor(type);
  const statusBadge = getStatusBadge(metadata?.appointmentStatus);

  // Para notificaciones de tipo cita (appointment, alert relacionado con citas, success de confirmación)
  if (metadata?.clientName && (type === 'appointment' || type === 'alert' || type === 'success')) {
    return (
      <div className="space-y-6">
        {/* Header con estado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{notification.title}</h4>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
          {statusBadge && (
            <Badge variant="outline" className={cn("text-xs font-medium", statusBadge.className)}>
              {statusBadge.label}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Información del cliente */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium text-foreground">{metadata.clientName}</p>
              {metadata.clientPhone && (
                <p className="text-sm text-muted-foreground">{metadata.clientPhone}</p>
              )}
            </div>
          </div>

          {/* Servicio */}
          {metadata.service && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Servicio</p>
                <p className="font-medium text-foreground">{metadata.service}</p>
              </div>
            </div>
          )}

          {/* Fecha y hora */}
          {metadata.date && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fecha y hora</p>
                <p className="font-medium text-foreground">
                  {format(metadata.date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
                {metadata.time && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {metadata.time} hrs
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sede */}
          {metadata.location && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sede</p>
                <p className="font-medium text-foreground">{metadata.location}</p>
              </div>
            </div>
          )}

          {/* Valor del ticket */}
          {metadata.ticketValue && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Valor del servicio</p>
                <p className="font-semibold text-foreground text-lg">{formatCurrency(metadata.ticketValue)}</p>
              </div>
            </div>
          )}

          {/* Notas adicionales */}
          {metadata.notes && (
            <>
              <Separator />
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-foreground">{metadata.notes}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Para notificaciones de sistema u otras
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{notification.title}</h4>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      <Separator />

      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-foreground">{notification.description}</p>
      </div>

      {notification.actionUrl && (
        <p className="text-sm text-muted-foreground">
          Esta notificación está relacionada con la sección de{' '}
          <span className="font-medium text-primary">
            {notification.actionUrl === '/facturacion' ? 'Facturación' : 'Configuración'}
          </span>
        </p>
      )}
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isMobile = useIsMobile();

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const openDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
    markAsRead(notification.id);
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Notificaciones"
          subtitle={isMobile ? undefined : "Mantente al día con tus citas y mensajes"}
          actions={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead} className={cn("gap-2", isMobile && "h-9")}>
                  <Check className="h-4 w-4" />
                  {!isMobile && "Marcar todo como leído"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearAll} className={cn("gap-2 text-muted-foreground", isMobile && "h-9")}>
                <Trash2 className="h-4 w-4" />
                {!isMobile && "Limpiar"}
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-4")}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn("rounded-lg bg-primary/10", isMobile ? "p-1.5" : "p-2")}>
                  <Bell className={cn("text-primary", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                <div>
                  <p className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>{notifications.length}</p>
                  <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-4")}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn("rounded-lg bg-info/10", isMobile ? "p-1.5" : "p-2")}>
                  <Clock className={cn("text-info", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                <div>
                  <p className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>{unreadCount}</p>
                  <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Sin leer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-4")}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn("rounded-lg bg-success/10", isMobile ? "p-1.5" : "p-2")}>
                  <CalendarCheck className={cn("text-success", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                <div>
                  <p className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>
                    {notifications.filter(n => n.type === 'appointment').length}
                  </p>
                  <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Citas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-4")}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={cn("rounded-lg bg-warning/10", isMobile ? "p-1.5" : "p-2")}>
                  <AlertTriangle className={cn("text-warning", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                <div>
                  <p className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>
                    {notifications.filter(n => n.type === 'alert').length}
                  </p>
                  <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Alertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="border-border">
          <CardHeader className={cn("pb-3", isMobile && "px-3")}>
            <div className={cn("flex items-center justify-between", isMobile && "flex-col gap-3 items-start")}>
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {isMobile ? "Notificaciones" : "Todas las notificaciones"}
              </CardTitle>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
                <TabsList className={cn("bg-secondary", isMobile && "h-9")}>
                  <TabsTrigger value="all" className={cn("text-xs", isMobile && "px-3")}>
                    Todas
                  </TabsTrigger>
                  <TabsTrigger value="unread" className={cn("text-xs", isMobile && "px-3")}>
                    Sin leer {unreadCount > 0 && `(${unreadCount})`}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={cn(isMobile ? "h-[calc(100vh-420px)] min-h-[300px]" : "h-[500px]")}>
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const colorClass = getNotificationColor(notification.type);
                    const hasDetail = notification.metadata?.clientName || notification.type === 'system';

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 md:gap-4 p-3 md:p-4 hover:bg-secondary/50 active:bg-secondary transition-colors",
                          !notification.read && "bg-primary/5"
                        )}
                        onClick={() => isMobile && hasDetail && openDetail(notification)}
                      >
                        <div className={cn("p-1.5 md:p-2 rounded-lg shrink-0", colorClass)}>
                          <Icon className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={cn(
                                "text-sm",
                                !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground"
                              )}>
                                {notification.title}
                              </p>
                              <p className={cn(
                                "text-muted-foreground mt-0.5",
                                isMobile ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                              )}>
                                {notification.description}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: es })}
                            </span>
                            {notification.metadata?.clientName && !isMobile && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {notification.metadata.clientName}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Botón Ver detalles - Solo en desktop */}
                        {hasDetail && !isMobile && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5 text-xs h-8 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(notification);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver detalles
                          </Button>
                        )}
                        
                        {/* Botón eliminar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("shrink-0 text-muted-foreground hover:text-destructive", isMobile ? "h-9 w-9" : "h-8 w-8")}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalle - Sheet en móvil, Dialog en desktop */}
      {isMobile ? (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="text-lg font-semibold">Detalle de notificación</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="pb-6">
                {selectedNotification && (
                  <NotificationDetailContent notification={selectedNotification} />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-border/50 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Detalle de notificación</DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              {selectedNotification && (
                <NotificationDetailContent notification={selectedNotification} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
