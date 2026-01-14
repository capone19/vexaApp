import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { LiveBadge } from "@/components/shared/LiveBadge";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { fetchRealDashboardData, fetchRealAppointments } from "@/lib/dashboard-data";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardMetrics, DateRangePreset } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MessageSquare,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  DollarSign,
  Radio,
  Flag,
  Flame,
  ShoppingCart,
  Snowflake,
  Thermometer,
  Zap,
  Target,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Appointment {
  id: string;
  datetime: Date;
  clientName: string;
  service: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'cancelled' | 'no_show';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      if (!user?.tenantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [metricsData, appointmentsData] = await Promise.all([
          fetchRealDashboardData(user.tenantId, dateRange),
          fetchRealAppointments(user.tenantId, 8),
        ]);
        setMetrics(metricsData);
        setAppointments(appointmentsData);
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
      }
      setLoading(false);
    };
    load();
  }, [dateRange, user?.tenantId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);

  if (loading || !metrics) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SkeletonCard className="w-48 md:w-64 h-12 md:h-16" lines={1} />
            <SkeletonCard className="w-36 md:w-48 h-10" lines={1} />
          </div>
          <SkeletonCard className="h-32 md:h-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={5} />
        </div>
      </MainLayout>
    );
  }

  const funnelStages = [
    { 
      label: "TOFU", 
      sublabel: "Conversaciones iniciales", 
      value: metrics.funnel.tofu, 
      icon: Radio,
      bgColor: "bg-slate-100 border-slate-200",
      iconBg: "bg-slate-200",
      iconColor: "text-slate-600"
    },
    { 
      label: "MOFU", 
      sublabel: "Sesiones WhatsApp", 
      value: metrics.funnel.mofu, 
      icon: Flag,
      bgColor: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    { 
      label: "Hot Leads", 
      sublabel: "6+ mensajes", 
      value: metrics.funnel.hotLeads, 
      icon: Flame,
      bgColor: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    { 
      label: "BOFU", 
      sublabel: "Ventas", 
      value: metrics.funnel.bofu, 
      icon: ShoppingCart,
      bgColor: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
  ];

  const rateStages = [
    { label: "Sin respuesta", value: metrics.funnel.deadRate, color: "bg-slate-400", icon: Snowflake, iconColor: "text-slate-500" },
    { label: "En progreso", value: metrics.funnel.warmRate, color: "bg-sky-400", icon: Thermometer, iconColor: "text-sky-500" },
    { label: "Alta intención", value: metrics.funnel.hotRate, color: "bg-amber-400", icon: Zap, iconColor: "text-amber-500" },
    { label: "Conversión", value: metrics.funnel.conversionRate, color: "bg-emerald-500", icon: Target, iconColor: "text-emerald-500" },
  ];

  // Estado vacío para nuevos usuarios
  const hasData = metrics.totalChats > 0 || metrics.totalMessages > 0 || appointments.length > 0;

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle="Vista general de tu rendimiento"
          badge={<LiveBadge />}
          actions={
            <DateRangeFilter
              value={dateRange}
              onChange={(preset) => setDateRange(preset)}
            />
          }
        />

        {/* Empty State for new users */}
        {!hasData && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 md:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              ¡Bienvenido a VEXA!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Aquí verás tus métricas cuando comiences a recibir chats y agendamientos. 
              Configura tu agente de IA para empezar.
            </p>
          </div>
        )}

        {/* Funnel Card */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-base font-semibold text-foreground">Resumen del Funnel de Ventas</h3>
            <p className="text-xs md:text-sm text-muted-foreground">TOFU → MOFU → BOFU en tiempo real</p>
          </div>
          
          {/* Pipeline Visual - Responsive Grid/Scroll */}
          {isMobile ? (
            <ScrollArea className="w-full -mx-4 px-4 mb-4">
              <div className="flex gap-3 pb-2">
                {funnelStages.map((stage, idx, arr) => (
                  <div key={stage.label} className="flex items-center shrink-0">
                    <div className={`rounded-xl border p-4 min-w-[140px] ${stage.bgColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`rounded-md p-1.5 ${stage.iconBg}`}>
                          <stage.icon className={`h-3.5 w-3.5 ${stage.iconColor}`} />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{stage.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-0.5">
                        {typeof stage.value === 'number' ? stage.value.toLocaleString() : stage.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{stage.sublabel}</p>
                    </div>
                    {idx < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 mx-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {funnelStages.map((stage, idx, arr) => (
                <div key={stage.label} className="flex items-center">
                  <div className={`flex-1 rounded-xl border p-4 ${stage.bgColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`rounded-md p-1.5 ${stage.iconBg}`}>
                        <stage.icon className={`h-3.5 w-3.5 ${stage.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stage.label}</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1">
                      {typeof stage.value === 'number' ? stage.value.toLocaleString() : stage.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stage.sublabel}</p>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 mx-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rates Bar */}
          <div className={cn(
            "pt-4 border-t border-border",
            isMobile ? "space-y-4" : "flex items-center gap-6"
          )}>
            {rateStages.map((rate) => (
              <div key={rate.label} className={cn(isMobile ? "" : "flex-1")}>
                <div className="flex items-center gap-2 mb-2">
                  <rate.icon className={`h-3.5 w-3.5 ${rate.iconColor}`} />
                  <span className="text-xs text-muted-foreground">{rate.label}</span>
                  <span className={cn(
                    "text-sm font-semibold ml-auto",
                    rate.label === "Sin respuesta" ? "text-slate-600" :
                    rate.label === "En progreso" ? "text-sky-600" :
                    rate.label === "Alta intención" ? "text-amber-600" :
                    "text-emerald-600"
                  )}>{rate.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className={`h-full ${rate.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(rate.value * 2, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Card */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-muted-foreground">Ingresos totales</span>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-foreground">{formatCurrency(metrics.revenue)}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            title="Total mensajes"
            value={metrics.totalMessages.toLocaleString()}
            icon={MessageSquare}
            variant="info"
          />
          <KPICard
            title="Promedio msgs/sesión"
            value={metrics.avgMessagesPerChat.toFixed(1)}
            icon={TrendingUp}
            variant="primary"
          />
          <KPICard
            title="Tasa de conversión"
            value={`${metrics.funnel.conversionRate}%`}
            icon={TrendingUp}
            variant="success"
          />
          <KPICard
            title="Servicios agendados"
            value={metrics.servicesBooked}
            icon={CalendarCheck}
            variant="warning"
          />
        </div>

        {/* Appointments */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm md:text-base font-semibold text-foreground">Últimos agendamientos</h3>
            {isMobile && appointments.length > 0 && (
              <button className="text-xs text-primary font-medium flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay agendamientos aún</p>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {appointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-secondary/30 active:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{apt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{apt.service}</p>
                    </div>
                    <StatusBadge status={apt.status === 'cancelled' ? 'canceled' : apt.status as any} />
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{format(apt.datetime, "dd MMM, HH:mm", { locale: es })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Fecha/Hora</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Servicio</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.slice(0, 8).map((apt) => (
                  <TableRow key={apt.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">
                      {format(apt.datetime, "dd MMM, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-foreground">{apt.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{apt.service}</TableCell>
                    <TableCell>
                      <StatusBadge status={apt.status === 'cancelled' ? 'canceled' : apt.status as any} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
