import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, Phone, MapPin, Calendar as CalendarIcon, Filter, Plus, X, Lock, Loader2, ShoppingBag, DollarSign, Video, ExternalLink } from 'lucide-react';
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
import { useExternalBookings } from '@/hooks/use-external-bookings';
import { useAuth } from '@/hooks/use-auth';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { formatCurrency } from '@/lib/format-currency';
import type { Appointment, AppointmentSource, AppointmentStatus, AppointmentType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BlockingModeProvider, useBlockingMode } from '@/components/calendar/BlockingModeContext';
import { CalendarDayCell } from '@/components/calendar/CalendarDayCell';
import { BlockingPanel } from '@/components/calendar/BlockingPanel';
import { BlockingModeOverlay } from '@/components/calendar/BlockingModeOverlay';
import { useIsMobile } from '@/hooks/use-mobile';

type CalendarView = 'month' | 'week' | 'day';

const CalendarContent = () => {
  const { isLoading: authLoading } = useAuth();
  const { tenantId, tenantCurrency } = useEffectiveTenant();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'product'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  
  const isMobile = useIsMobile();

  // Calcular rango de fechas para el mes actual +/- 1 mes (memoized para evitar refetch infinito)
  const { startDate, endDate } = useMemo(() => {
    return {
      startDate: subMonths(startOfMonth(currentDate), 1),
      endDate: addMonths(endOfMonth(currentDate), 1),
    };
  }, [currentDate]);
  
  // Usar hook de bookings externos (tu Supabase)
  const { 
    bookings: appointments, 
    items, 
    isLoading: loading, 
    error 
  } = useExternalBookings({
    tenantId: tenantId || undefined,
    startDate,
    endDate,
    type: filterType,
    enableRealtime: true,
  });

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

  const filteredAppointments = appointments.filter(apt => {
    if (filterSource !== 'all' && apt.source !== filterSource) return false;
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
    return true;
  });

  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(apt => isSameDay(apt.datetime, date));
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);
  const hasActiveFilters = filterStatus !== 'all' || filterType !== 'all' || filterSource !== 'all';

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
    setFilterType('all');
    setFilterSource('all');
  };

  // Formatear precio usando la divisa del tenant
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    // Si el booking tiene su propia moneda, usarla; sino usar la del tenant
    const currencyToUse = currency || tenantCurrency;
    return formatCurrency(price, currencyToUse as 'CLP' | 'BOB' | 'USD');
  };

  // Empty State
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Sin agendamientos</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Cuando tus clientes agenden citas por WhatsApp, aparecerán aquí automáticamente.
      </p>
    </div>
  );

  // Show loading while auth or bookings are loading
  if (authLoading || loading) {
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

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <PageHeader title="Calendario" subtitle="Gestiona las citas y disponibilidad" />
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="text-destructive mb-4">Error al cargar calendario</div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
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
            <label className="text-sm font-medium">Tipo</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'service' | 'product')}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="service">Servicios</SelectItem>
                <SelectItem value="product">Productos</SelectItem>
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
                      <div className="flex items-start gap-2">
                        {apt.type === 'product' ? (
                          <ShoppingBag className="h-4 w-4 text-primary mt-0.5" />
                        ) : (
                          <CalendarIcon className="h-4 w-4 text-primary mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">{apt.clientName}</div>
                          <div className="text-sm text-muted-foreground">
                            {apt.type === 'product' ? `Compró: ${apt.service}` : apt.service}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {apt.type === 'service' && apt.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </span>
                      )}
                      {apt.price && (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <DollarSign className="h-3 w-3" />
                          {formatPrice(apt.price, apt.currency)}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {apt.type === 'product' ? 'Producto' : 'Servicio'}
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
                  {[filterStatus, filterType, filterSource].filter(f => f !== 'all').length}
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
              <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'service' | 'product')}>
                <SelectTrigger className="w-[140px] bg-background border-border">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="service">Servicios</SelectItem>
                  <SelectItem value="product">Productos</SelectItem>
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
                    {!isMobile && <TabsTrigger value="day">Día</TabsTrigger>}
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className={cn(isMobile && "px-2")}>
              {/* Blocking mode overlay message */}
              <BlockingModeOverlay />

              {/* Always show calendar grid */}
              {view === 'month' && (
                <div className="space-y-1 md:space-y-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                    {(isMobile ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']).map(day => (
                      <div key={day} className="text-center text-[10px] md:text-xs text-muted-foreground py-1 md:py-2 font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                    {getDaysForMonth().map((day, idx) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);

                      if (isMobile) {
                        const blocked = isDateBlocked(day);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleDateSelect(day)}
                            disabled={blocked}
                            className={cn(
                              "aspect-square p-1 rounded-lg text-center transition-all relative",
                              !isCurrentMonth && "opacity-40",
                              blocked && "bg-slate-100 cursor-default",
                              !blocked && "active:bg-secondary",
                              isToday && !blocked && "ring-1 ring-primary",
                              isSelected && !blocked && "bg-primary/10"
                            )}
                          >
                            <span className={cn(
                              "text-sm font-medium",
                              isSelected && !blocked && "text-primary",
                              blocked && "text-slate-400"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {!blocked && dayAppointments.length > 0 && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {dayAppointments.slice(0, 3).map((apt, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-1 h-1 rounded-full",
                                      apt.status === 'confirmed' && "bg-success",
                                      apt.status === 'pending' && "bg-warning",
                                      apt.status === 'canceled' && "bg-destructive"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      }

                      return (
                        <CalendarDayCell
                          key={idx}
                          day={day}
                          isCurrentMonth={isCurrentMonth}
                          isToday={isToday}
                          isSelected={isSelected}
                          appointments={dayAppointments}
                          onSelect={handleDateSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'week' && (
                <div className="space-y-2">
                  <div className={cn(
                    "grid gap-1 md:gap-2",
                    isMobile ? "grid-cols-7" : "grid-cols-7"
                  )}>
                    {getDaysForWeek().map((day, idx) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);
                      const blocked = isDateBlocked(day);

                      return (
                        <button
                          key={idx}
                          onClick={() => !blocked && handleDateSelect(day)}
                          className={cn(
                            "p-2 md:p-3 rounded-lg text-center transition-all flex flex-col",
                            isMobile ? "min-h-[80px]" : "min-h-[120px]",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50",
                            "border border-border",
                            blocked 
                              ? "bg-slate-100 dark:bg-slate-800 cursor-default"
                              : "hover:bg-secondary active:bg-secondary",
                            isToday && !blocked && "ring-1 ring-primary",
                            isSelected && !blocked && "bg-primary/10 border-primary"
                          )}
                          disabled={blocked}
                        >
                          <div className="text-[10px] md:text-xs text-muted-foreground capitalize">
                            {format(day, isMobile ? 'EEEEE' : 'EEE', { locale: es })}
                          </div>
                          <div className={cn(
                            "text-base md:text-lg font-semibold",
                            blocked && "text-slate-400 dark:text-slate-500",
                            isSelected && !blocked && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </div>
                          {blocked ? (
                            <div className="flex-1 mt-1 flex items-center justify-center">
                              <Lock className="h-3 w-3 md:h-4 md:w-4 text-slate-300 dark:text-slate-600" />
                            </div>
                          ) : (
                            <div className="flex-1 mt-1 space-y-0.5">
                              {dayAppointments.slice(0, isMobile ? 2 : 3).map((apt, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "text-[8px] md:text-[10px] px-1 py-0.5 rounded truncate",
                                    apt.status === 'confirmed' && "bg-success/10 text-success",
                                    apt.status === 'pending' && "bg-warning/10 text-warning",
                                    apt.status === 'canceled' && "bg-destructive/10 text-destructive"
                                  )}
                                >
                                  {format(apt.datetime, 'HH:mm')}
                                </div>
                              ))}
                              {dayAppointments.length > (isMobile ? 2 : 3) && (
                                <div className="text-[8px] md:text-[10px] text-muted-foreground">
                                  +{dayAppointments.length - (isMobile ? 2 : 3)} más
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'day' && !isMobile && (
                <div className="space-y-2">
                  <div className="text-center mb-4">
                    <div className="text-xl font-semibold capitalize text-foreground">
                      {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                    </div>
                    {isDateBlocked(currentDate) && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm">
                        <Lock className="h-3 w-3" />
                        Día bloqueado
                      </div>
                    )}
                  </div>
                  {/* Time slots */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
                        const hourAppointments = filteredAppointments.filter(apt => 
                          isSameDay(apt.datetime, currentDate) && apt.datetime.getHours() === hour
                        );
                        const blocked = isDateBlocked(currentDate);
                        
                        return (
                          <div key={hour} className="flex gap-3 py-2 border-b border-border">
                            <div className="w-16 text-sm text-muted-foreground shrink-0">
                              {String(hour).padStart(2, '0')}:00
                            </div>
                            <div className="flex-1 min-h-[40px]">
                              {blocked ? (
                                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Bloqueado</span>
                                </div>
                              ) : hourAppointments.length > 0 ? (
                                <div className="space-y-1">
                                  {hourAppointments.map(apt => (
                                    <button
                                      key={apt.id}
                                      onClick={() => setSelectedAppointment(apt)}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                                        "hover:opacity-80",
                                        apt.status === 'confirmed' && "bg-success/10 border border-success/20",
                                        apt.status === 'pending' && "bg-warning/10 border border-warning/20",
                                        apt.status === 'canceled' && "bg-destructive/10 border border-destructive/20 line-through opacity-60"
                                      )}
                                    >
                                      <div className="font-medium text-foreground">{apt.clientName}</div>
                                      <div className="text-xs text-muted-foreground">{apt.service}</div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-10 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                  Disponible
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Desktop only */}
          {!isMobile && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Show blocking panel when in blocking mode or viewing blocked day */}
                <BlockingPanel 
                  selectedDate={selectedDate} 
                  onSelectDate={setSelectedDate} 
                />
                
                {/* Show normal appointments list when not in blocking mode and day is not blocked */}
                {!isBlockingMode && !isDateBlocked(selectedDate) && (
                  <ScrollArea className="h-[500px]">
                    {selectedDateAppointments.length === 0 ? (
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
                              className="w-full text-left p-4 rounded-lg border border-border bg-background hover:bg-secondary transition-all space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  {apt.type === 'product' ? (
                                    <ShoppingBag className="h-4 w-4 text-primary mt-0.5" />
                                  ) : (
                                    <CalendarIcon className="h-4 w-4 text-primary mt-0.5" />
                                  )}
                                  <div>
                                    <div className="font-medium text-foreground">{apt.clientName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {apt.type === 'product' ? `Compró: ${apt.service}` : apt.service}
                                    </div>
                                  </div>
                                </div>
                                <StatusBadge status={apt.status} />
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {apt.type === 'service' && apt.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {apt.time}
                                  </span>
                                )}
                                {apt.price && (
                                  <span className="flex items-center gap-1 text-success font-medium">
                                    <DollarSign className="h-3 w-3" />
                                    {formatPrice(apt.price, apt.currency)}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  {apt.type === 'product' ? 'Producto' : 'Servicio'}
                                </Badge>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Sheets */}
      {isMobile && (
        <>
          <FilterSheet />
          <DayDetailSheet />
        </>
      )}

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className={cn("border-border", isMobile && "w-[calc(100%-2rem)] rounded-2xl")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAppointment?.type === 'product' ? (
                <ShoppingBag className="h-5 w-5 text-primary" />
              ) : (
                <CalendarIcon className="h-5 w-5 text-primary" />
              )}
              {selectedAppointment?.type === 'product' ? 'Detalles de la compra' : 'Detalles de la cita'}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedAppointment.clientName}</h3>
                  <p className="text-muted-foreground">
                    {selectedAppointment.type === 'product' 
                      ? `Compró: ${selectedAppointment.service}` 
                      : selectedAppointment.service}
                  </p>
                </div>
                <Badge variant={selectedAppointment.type === 'product' ? 'secondary' : 'default'}>
                  {selectedAppointment.type === 'product' ? 'Producto' : 'Servicio'}
                </Badge>
              </div>

              <div className="space-y-3 py-4 border-t border-b border-border">
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {selectedAppointment.type === 'product' ? 'Fecha de compra: ' : ''}
                    {format(selectedAppointment.datetime, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                
                {/* Solo mostrar hora para servicios */}
                {selectedAppointment.type === 'service' && selectedAppointment.time && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedAppointment.time} hrs</span>
                  </div>
                )}
                
                {selectedAppointment.clientPhone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedAppointment.clientPhone}</span>
                  </div>
                )}
                
                {/* Mostrar precio */}
                {selectedAppointment.price && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium text-success">
                      {formatPrice(selectedAppointment.price, selectedAppointment.currency)}
                    </span>
                  </div>
                )}

                {/* Mostrar link de reunión si existe */}
                {selectedAppointment.meetingUrl && (
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={selectedAppointment.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Unirse a la reunión
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Origen:</span>
                <Badge variant="outline">
                  {selectedAppointment.sourceRaw || sourceLabels[selectedAppointment.source]}
                </Badge>
              </div>

              {/* Solo mostrar botones de acción para servicios */}
              {selectedAppointment.type === 'service' && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className={cn("flex-1", isMobile && "h-12")} disabled>
                    Reagendar
                  </Button>
                  <Button variant="outline" className={cn("flex-1 text-destructive hover:text-destructive", isMobile && "h-12")} disabled>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

const Calendar = () => {
  return (
    <BlockingModeProvider>
      <CalendarContent />
    </BlockingModeProvider>
  );
};

export default Calendar;
