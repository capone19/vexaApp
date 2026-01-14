import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, Phone, MapPin, Calendar as CalendarIcon, Filter, Plus, X, Lock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import type { Appointment, AppointmentSource, AppointmentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BlockingModeProvider, useBlockingMode } from '@/components/calendar/BlockingModeContext';
import { CalendarDayCell } from '@/components/calendar/CalendarDayCell';
import { BlockingPanel } from '@/components/calendar/BlockingPanel';
import { BlockingModeOverlay } from '@/components/calendar/BlockingModeOverlay';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

type CalendarView = 'month' | 'week' | 'day';

// Map Supabase booking status to our AppointmentStatus
const mapBookingStatus = (status: string | null): AppointmentStatus => {
  switch (status) {
    case 'confirmed': return 'confirmed';
    case 'pending': return 'pending';
    case 'cancelled': return 'canceled';
    case 'completed': return 'confirmed';
    case 'no_show': return 'canceled';
    default: return 'pending';
  }
};

// Map Supabase booking origin to AppointmentSource
const mapBookingSource = (origin: string | null): AppointmentSource => {
  switch (origin) {
    case 'chat': return 'chat';
    case 'campaign': return 'campaign';
    case 'manual': return 'direct';
    case 'web': return 'direct';
    default: return 'direct';
  }
};

const CalendarContent = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [services, setServices] = useState<string[]>([]);
  
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { 
    isBlockingMode, 
    setIsBlockingMode, 
    exitBlockingMode,
    isDateBlocked,
    isDragging,
    endDrag,
  } = useBlockingMode();

  // Global mouseup listener to end drag when releasing mouse anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        endDrag();
      }
    };

    if (isBlockingMode) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isBlockingMode, isDragging, endDrag]);

  useEffect(() => {
    const loadData = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Fetch bookings from Supabase
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('scheduled_at', { ascending: true });

        if (error) {
          console.error('Error fetching bookings:', error);
          setLoading(false);
          return;
        }

        // Transform Supabase data to our Appointment type
        const transformedAppointments: Appointment[] = (bookings || []).map(booking => ({
          id: booking.id,
          datetime: new Date(booking.scheduled_at),
          clientName: booking.contact_name,
          clientPhone: booking.contact_phone,
          service: booking.service_name,
          source: mapBookingSource(booking.origin),
          status: mapBookingStatus(booking.status),
          notes: booking.notes || undefined,
          chatId: booking.session_id || undefined,
          createdAt: new Date(booking.created_at || new Date()),
        }));

        setAppointments(transformedAppointments);
        
        // Extract unique services
        const uniqueServices = [...new Set(transformedAppointments.map(a => a.service))];
        setServices(uniqueServices);
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }

      setLoading(false);
    };

    loadData();
  }, [tenantId]);

  const filteredAppointments = appointments.filter(apt => {
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
    if (filterService !== 'all' && apt.service !== filterService) return false;
    if (filterSource !== 'all' && apt.source !== filterSource) return false;
    return true;
  });

  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(apt => isSameDay(apt.datetime, date));
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);
  const hasActiveFilters = filterStatus !== 'all' || filterService !== 'all' || filterSource !== 'all';

  const navigatePrevious = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getNavigationTitle = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: es });
    if (view === 'week') {
      const start = startOfWeek(currentDate, { locale: es });
      const end = endOfWeek(currentDate, { locale: es });
      return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
    }
    return format(currentDate, "EEEE d 'de' MMMM", { locale: es });
  };

  const getDaysForMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: es });
    const end = endOfWeek(endOfMonth(currentDate), { locale: es });
    return eachDayOfInterval({ start, end });
  };

  const getDaysForWeek = () => {
    const start = startOfWeek(currentDate, { locale: es });
    const end = endOfWeek(currentDate, { locale: es });
    return eachDayOfInterval({ start, end });
  };

  const sourceLabels: Record<AppointmentSource, string> = {
    chat: 'Chat',
    campaign: 'Campaña',
    direct: 'Directo',
    referral: 'Referido',
  };

  const handleBlockButtonClick = () => {
    if (isBlockingMode) {
      exitBlockingMode();
    } else {
      setIsBlockingMode(true);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (isMobile) {
      setShowDayDetail(true);
    }
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterService('all');
    setFilterSource('all');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <PageHeader title="Calendario" subtitle="Gestiona las citas y disponibilidad" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2"><SkeletonCard className="h-[400px] md:h-[600px]" /></div>
            <div className="hidden lg:block"><SkeletonCard className="h-[600px]" /></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Filter Sheet for Mobile
  const FilterSheet = () => (
    <Sheet open={showFilters} onOpenChange={setShowFilters}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Servicio</label>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Origen</label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="campaign">Campaña</SelectItem>
                <SelectItem value="direct">Directo</SelectItem>
                <SelectItem value="referral">Referido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-12" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button className="flex-1 h-12" onClick={() => setShowFilters(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Day Detail Sheet for Mobile
  const DayDetailSheet = () => (
    <Sheet open={showDayDetail} onOpenChange={setShowDayDetail}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100%-60px)]">
          {isDateBlocked(selectedDate) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Día bloqueado</p>
              <p className="text-sm">No hay citas disponibles</p>
            </div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay citas para este día</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {selectedDateAppointments
                .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
                .map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => {
                      setSelectedAppointment(apt);
                      setShowDayDetail(false);
                    }}
                    className="w-full text-left p-4 rounded-xl border border-border bg-background active:bg-secondary transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground">{apt.clientName}</div>
                        <div className="text-sm text-muted-foreground">{apt.service}</div>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(apt.datetime, 'HH:mm')}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {sourceLabels[apt.source]}
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader 
          title="Calendario" 
          subtitle={isMobile ? undefined : "Gestiona las citas y disponibilidad"}
          actions={
            <Button 
              className={cn(
                "gap-2 transition-all duration-200",
                isMobile && "h-9 px-3 text-sm",
                isBlockingMode 
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                  : ""
              )}
              variant={isBlockingMode ? "outline" : "default"}
              onClick={handleBlockButtonClick}
            >
              {isBlockingMode ? (
                <>
                  <X className="h-4 w-4" />
                  {!isMobile && "Cancelar bloqueo"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {!isMobile && "Bloquear horario"}
                </>
              )}
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          {isMobile ? (
            <Button
              variant={hasActiveFilters ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                  {[filterStatus, filterService, filterSource].filter(f => f !== 'all').length}
                </span>
              )}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filtros:</span>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <SelectValue placeholder="Servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="campaign">Campaña</SelectItem>
                  <SelectItem value="direct">Directo</SelectItem>
                  <SelectItem value="referral">Referido</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          {hasActiveFilters && isMobile && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Calendar View */}
          <Card className={cn("border-border", isMobile ? "" : "lg:col-span-2")}>
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <Button variant="ghost" size="icon" onClick={navigatePrevious} className="h-8 w-8 md:h-10 md:w-10">
                    <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <h2 className={cn(
                    "font-semibold capitalize text-center text-foreground",
                    isMobile ? "text-sm min-w-[120px]" : "text-lg min-w-[200px]"
                  )}>
                    {getNavigationTitle()}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8 md:h-10 md:w-10">
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
                  <TabsList className={cn("bg-secondary", isMobile && "h-8")}>
                    <TabsTrigger value="month" className={cn(isMobile && "text-xs px-2 py-1")}>Mes</TabsTrigger>
                    <TabsTrigger value="week" className={cn(isMobile && "text-xs px-2 py-1")}>Semana</TabsTrigger>
                    <TabsTrigger value="day" className={cn(isMobile && "text-xs px-2 py-1")}>Día</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className={cn(isMobile && "px-2")}>
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2">
                    {isMobile ? day.charAt(0) : day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              {view === 'month' && (
                <div className="grid grid-cols-7 gap-1">
                  {getDaysForMonth().map((day) => (
                    <CalendarDayCell
                      key={day.toISOString()}
                      date={day}
                      currentMonth={currentDate}
                      selectedDate={selectedDate}
                      appointments={getAppointmentsForDate(day)}
                      onSelect={handleDateSelect}
                    />
                  ))}
                </div>
              )}

              {view === 'week' && (
                <div className="grid grid-cols-7 gap-1">
                  {getDaysForWeek().map((day) => (
                    <CalendarDayCell
                      key={day.toISOString()}
                      date={day}
                      currentMonth={currentDate}
                      selectedDate={selectedDate}
                      appointments={getAppointmentsForDate(day)}
                      onSelect={handleDateSelect}
                      isWeekView
                    />
                  ))}
                </div>
              )}

              {view === 'day' && (
                <div className="space-y-2">
                  {selectedDateAppointments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No hay citas para hoy</p>
                    </div>
                  ) : (
                    selectedDateAppointments.map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedAppointment(apt)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{apt.clientName}</div>
                            <div className="text-sm text-muted-foreground">{apt.service}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{format(apt.datetime, 'HH:mm')}</div>
                            <StatusBadge status={apt.status} />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar - Selected Day Details (Desktop only) */}
          {!isMobile && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {isDateBlocked(selectedDate) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Día bloqueado</p>
                      <p className="text-sm">No hay citas disponibles</p>
                    </div>
                  ) : selectedDateAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No hay citas para este día</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateAppointments
                        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
                        .map(apt => (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className="w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-secondary transition-colors space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-foreground">{apt.clientName}</div>
                                <div className="text-sm text-muted-foreground">{apt.service}</div>
                              </div>
                              <StatusBadge status={apt.status} />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(apt.datetime, 'HH:mm')}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {sourceLabels[apt.source]}
                              </Badge>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Appointment Detail Dialog */}
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalle de Cita</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{selectedAppointment.clientName}</div>
                    <div className="text-sm text-muted-foreground">{selectedAppointment.clientPhone}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{format(selectedAppointment.datetime, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(selectedAppointment.datetime, 'HH:mm')} hrs</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAppointment.service}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedAppointment.status} />
                  <Badge variant="outline">{sourceLabels[selectedAppointment.source]}</Badge>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-3 rounded-lg bg-secondary">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Notas</div>
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mobile Sheets */}
        {isMobile && (
          <>
            <FilterSheet />
            <DayDetailSheet />
          </>
        )}

        {/* Blocking Mode Overlay */}
        <BlockingModeOverlay />
      </div>
    </MainLayout>
  );
};

const Calendar = () => (
  <BlockingModeProvider>
    <CalendarContent />
  </BlockingModeProvider>
);

export default Calendar;
