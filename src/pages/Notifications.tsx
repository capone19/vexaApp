import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useNotifications, type AppNotification } from '@/hooks/use-notifications';
import {
  Bell,
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Info,
  Trash2,
  Check,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type DbNotificationType = AppNotification['type'];

const getNotificationIcon = (type: DbNotificationType) => {
  switch (type) {
    case 'booking':
      return CalendarCheck;
    case 'handoff':
      return MessageSquare;
    case 'alert':
      return AlertTriangle;
    case 'campaign':
      return CheckCircle;
    case 'system':
      return Info;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: DbNotificationType) => {
  switch (type) {
    case 'booking':
      return 'text-primary bg-primary/10';
    case 'handoff':
      return 'text-sky-500 bg-sky-500/10';
    case 'alert':
      return 'text-amber-500 bg-amber-500/10';
    case 'campaign':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'system':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

function NotificationDetailContent({ notification }: { notification: AppNotification }) {
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{notification.title}</h4>
          {notification.created_at && (
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-foreground">{notification.message || notification.title}</p>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isMobile = useIsMobile();

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const openDetail = (notification: AppNotification) => {
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
                    {notifications.filter(n => n.type === 'booking').length}
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

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 md:gap-4 p-3 md:p-4 hover:bg-secondary/50 active:bg-secondary transition-colors",
                          !notification.is_read && "bg-primary/5"
                        )}
                        onClick={() => isMobile && openDetail(notification)}
                      >
                        <div className={cn("p-1.5 md:p-2 rounded-lg shrink-0", colorClass)}>
                          <Icon className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={cn(
                                "text-sm",
                                !notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground"
                              )}>
                                {notification.title}
                              </p>
                              <p className={cn(
                                "text-muted-foreground mt-0.5",
                                isMobile ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                              )}>
                                {notification.message || ''}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {notification.created_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!isMobile && (
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
