import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, Phone, MapPin, Calendar as CalendarIcon, Filter, Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { fetchAppointments } from '@/lib/mock/data';
import type { Appointment, AppointmentSource } from '@/lib/types';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week' | 'day';

const Calendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchAppointments();
      setAppointments(data);
      setLoading(false);
    };
    loadData();
  }, []);

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
  const services = [...new Set(appointments.map(a => a.service))];

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

  // Generate calendar days
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

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Calendario" subtitle="Gestiona las citas y disponibilidad" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><SkeletonCard className="h-[600px]" /></div>
            <div><SkeletonCard className="h-[600px]" /></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Calendario" 
          subtitle="Gestiona las citas y disponibilidad"
          actions={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Bloquear horario
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filtros:</span>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-card border-border/50">
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
            <SelectTrigger className="w-[180px] bg-card border-border/50">
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
            <SelectTrigger className="w-[140px] bg-card border-border/50">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2 bg-card/50 border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={navigatePrevious}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">
                    {getNavigationTitle()}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={navigateNext}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
                  <TabsList className="bg-background/50">
                    <TabsTrigger value="month">Mes</TabsTrigger>
                    <TabsTrigger value="week">Semana</TabsTrigger>
                    <TabsTrigger value="day">Día</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {view === 'month' && (
                <div className="space-y-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                      <div key={day} className="text-center text-xs text-muted-foreground py-2 font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysForMonth().map((day, idx) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "aspect-square p-1 rounded-lg text-sm transition-all relative",
                            "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            !isCurrentMonth && "text-muted-foreground/50",
                            isToday && "ring-1 ring-primary",
                            isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                          )}
                        >
                          <span className="block">{format(day, 'd')}</span>
                          {dayAppointments.length > 0 && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {dayAppointments.slice(0, 3).map((apt, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
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
                    })}
                  </div>
                </div>
              )}

              {view === 'week' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2">
                    {getDaysForWeek().map((day, idx) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "p-3 rounded-xl text-center transition-all min-h-[120px] flex flex-col",
                            "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            "border border-border/30",
                            isToday && "ring-1 ring-primary",
                            isSelected && "bg-primary/20 border-primary"
                          )}
                        >
                          <div className="text-xs text-muted-foreground capitalize">
                            {format(day, 'EEE', { locale: es })}
                          </div>
                          <div className={cn(
                            "text-lg font-semibold",
                            isSelected && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="flex-1 mt-2 space-y-1">
                            {dayAppointments.slice(0, 3).map((apt, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded truncate",
                                  apt.status === 'confirmed' && "bg-success/20 text-success",
                                  apt.status === 'pending' && "bg-warning/20 text-warning",
                                  apt.status === 'canceled' && "bg-destructive/20 text-destructive"
                                )}
                              >
                                {format(apt.datetime, 'HH:mm')}
                              </div>
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{dayAppointments.length - 3} más
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'day' && (
                <div className="space-y-2">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold capitalize">
                      {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                    </div>
                  </div>
                  {/* Time slots */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
                        const hourAppointments = filteredAppointments.filter(apt => 
                          isSameDay(apt.datetime, currentDate) && apt.datetime.getHours() === hour
                        );
                        
                        return (
                          <div key={hour} className="flex gap-3 py-2 border-b border-border/30">
                            <div className="w-16 text-sm text-muted-foreground shrink-0">
                              {String(hour).padStart(2, '0')}:00
                            </div>
                            <div className="flex-1 min-h-[40px]">
                              {hourAppointments.length > 0 ? (
                                <div className="space-y-1">
                                  {hourAppointments.map(apt => (
                                    <button
                                      key={apt.id}
                                      onClick={() => setSelectedAppointment(apt)}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                                        "hover:scale-[1.02]",
                                        apt.status === 'confirmed' && "bg-success/20 border border-success/30",
                                        apt.status === 'pending' && "bg-warning/20 border border-warning/30",
                                        apt.status === 'canceled' && "bg-destructive/20 border border-destructive/30 line-through opacity-60"
                                      )}
                                    >
                                      <div className="font-medium">{apt.clientName}</div>
                                      <div className="text-xs text-muted-foreground">{apt.service}</div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-10 border border-dashed border-border/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
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

          {/* Selected Date Appointments */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                          className="w-full text-left p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{apt.clientName}</div>
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
        </div>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Detalles de la cita</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedAppointment.clientName}</h3>
                  <p className="text-muted-foreground">{selectedAppointment.service}</p>
                </div>
                <StatusBadge status={selectedAppointment.status} />
              </div>

              <div className="space-y-3 py-4 border-t border-b border-border/50">
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedAppointment.datetime, "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedAppointment.datetime, 'HH:mm')} hrs</span>
                </div>
                {selectedAppointment.clientPhone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAppointment.clientPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Sede Providencia</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Origen:</span>
                <Badge variant="outline">{sourceLabels[selectedAppointment.source]}</Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" disabled>
                  Reagendar
                </Button>
                <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" disabled>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Calendar;
