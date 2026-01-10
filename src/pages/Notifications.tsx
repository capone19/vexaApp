import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Bell,
  CalendarCheck,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  XCircle,
  Info,
  Settings,
  Trash2,
  Check,
  Filter,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type NotificationType = 'appointment' | 'message' | 'alert' | 'system' | 'success';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    clientName?: string;
    service?: string;
    time?: string;
  };
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'appointment',
    title: 'Nueva cita agendada',
    description: 'María González agendó Corte de cabello para hoy a las 15:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    read: false,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'María González',
      service: 'Corte de cabello',
      time: '15:00',
    },
  },
  {
    id: 'notif-002',
    type: 'message',
    title: 'Nuevo mensaje de Carlos Mendoza',
    description: '"Hola, quería consultar si tienen disponibilidad para mañana..."',
    timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12 min ago
    read: false,
    actionUrl: '/chats',
    metadata: {
      clientName: 'Carlos Mendoza',
    },
  },
  {
    id: 'notif-003',
    type: 'appointment',
    title: 'Recordatorio: Cita en 1 hora',
    description: 'Ana Rodríguez tiene cita de Manicure + Pedicure a las 16:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    read: false,
    metadata: {
      clientName: 'Ana Rodríguez',
      service: 'Manicure + Pedicure',
      time: '16:00',
    },
  },
  {
    id: 'notif-004',
    type: 'alert',
    title: 'Cita cancelada',
    description: 'Pedro Silva canceló su cita de Tratamiento capilar programada para mañana',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
    read: true,
    metadata: {
      clientName: 'Pedro Silva',
      service: 'Tratamiento capilar',
    },
  },
  {
    id: 'notif-005',
    type: 'success',
    title: 'Cita confirmada',
    description: 'Valentina Torres confirmó su asistencia para Tinte completo',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    read: true,
    metadata: {
      clientName: 'Valentina Torres',
      service: 'Tinte completo',
    },
  },
  {
    id: 'notif-006',
    type: 'message',
    title: '3 mensajes sin responder',
    description: 'Tienes conversaciones pendientes que requieren atención',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
    read: true,
    actionUrl: '/chats',
  },
  {
    id: 'notif-007',
    type: 'appointment',
    title: 'Reagendamiento solicitado',
    description: 'Camila Reyes solicita reagendar su cita de Alisado permanente',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    read: true,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'Camila Reyes',
      service: 'Alisado permanente',
    },
  },
  {
    id: 'notif-008',
    type: 'system',
    title: 'Actualización del sistema',
    description: 'Se han aplicado mejoras de rendimiento a tu cuenta',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    read: true,
  },
  {
    id: 'notif-009',
    type: 'success',
    title: 'Meta alcanzada',
    description: '¡Felicidades! Has completado 50 citas este mes',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
  },
  {
    id: 'notif-010',
    type: 'appointment',
    title: 'Nueva cita agendada',
    description: 'Diego Fuentes agendó Corte + Barba para el viernes a las 11:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    read: true,
    actionUrl: '/calendario',
    metadata: {
      clientName: 'Diego Fuentes',
      service: 'Corte + Barba',
      time: '11:00',
    },
  },
  {
    id: 'notif-011',
    type: 'alert',
    title: 'Cliente no se presentó',
    description: 'Roberto Muñoz no asistió a su cita programada',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    metadata: {
      clientName: 'Roberto Muñoz',
    },
  },
  {
    id: 'notif-012',
    type: 'system',
    title: 'Factura disponible',
    description: 'Tu factura del mes de diciembre está lista para descargar',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    read: true,
    actionUrl: '/facturacion',
  },
];

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
      return 'text-info bg-info/10';
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

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notificaciones"
          subtitle="Mantente al día con tus citas y mensajes"
          actions={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                  <Check className="h-4 w-4" />
                  Marcar todo como leído
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearAll} className="gap-2 text-muted-foreground">
                <Trash2 className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Sin leer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CalendarCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {notifications.filter(n => n.type === 'appointment').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Citas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <MessageSquare className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {notifications.filter(n => n.type === 'message').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Mensajes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Todas las notificaciones
              </CardTitle>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
                <TabsList className="bg-secondary">
                  <TabsTrigger value="all" className="text-xs">
                    Todas
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Sin leer {unreadCount > 0 && `(${unreadCount})`}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
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

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 p-4 hover:bg-secondary/50 transition-colors cursor-pointer",
                          !notification.read && "bg-primary/5"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn(
                                "text-sm",
                                !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
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
                            {notification.metadata?.clientName && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {notification.metadata.clientName}
                              </span>
                            )}
                            {notification.actionUrl && (
                              <Badge variant="outline" className="text-xs">
                                Ver detalles
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
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
    </MainLayout>
  );
}

