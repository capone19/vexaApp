import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { LiveBadge } from "@/components/shared/LiveBadge";
import { PeriodFilter, type PeriodPreset } from "@/components/shared/PeriodFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useBillingPeriod } from "@/hooks/use-billing-period";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { formatCurrency } from "@/lib/format-currency";
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
  Clock,
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

export default function Dashboard() {
  const { tenantId, tenantCurrency } = useEffectiveTenant();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("current");
  const isMobile = useIsMobile();
  
  // Hook de período de facturación (para el rango de fechas de métricas)
  const { startDate, endDate, periodInfo } = useBillingPeriod({ selectedPeriod });

  const { metrics, recentAppointments, isLoading, error } = useDashboardMetrics({
    tenantId,
    dateRange: startDate && endDate ? { startDate, endDate } : undefined,
  });

  const formatRevenue = (value: number) => formatCurrency(value, tenantCurrency);

  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos aún</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Cuando comiences a recibir conversaciones y agendamientos, tus métricas aparecerán aquí.
      </p>
    </div>
  );

  if (isLoading && !metrics) {
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

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="text-destructive mb-4">Error al cargar datos</div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    );
  }

  // Si no hay metrics, mostrar estado vacío
  if (!metrics || (metrics.totalChats === 0 && metrics.totalMessages === 0)) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <PageHeader
            title="Dashboard"
            subtitle="Vista general de tu rendimiento"
            badge={<LiveBadge />}
            actions={
              <PeriodFilter
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                periodInfo={periodInfo}
              />
            }
          />
          
          {/* Empty Funnel Card */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <EmptyState />
          </div>

          {/* Empty KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <KPICard
              title="Total mensajes"
              value="0"
              icon={MessageSquare}
              variant="info"
            />
            <KPICard
              title="Promedio msgs/sesión"
              value="0"
              icon={TrendingUp}
              variant="primary"
            />
            <KPICard
              title="Tasa de conversión"
              value="0%"
              icon={TrendingUp}
              variant="success"
            />
            <KPICard
              title="Servicios agendados"
              value="0"
              icon={CalendarCheck}
              variant="warning"
            />
          </div>

          {/* Empty Appointments */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm md:text-base font-semibold text-foreground">Últimos agendamientos</h3>
            </div>
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">Sin agendamientos en este período</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const funnelStages = [
    { 
      label: "TOFU", 
      sublabel: "Conversaciones iniciales", 
      value: metrics.funnel.tofu || 0, 
      icon: Radio,
      bgColor: "bg-slate-100 border-slate-200",
      iconBg: "bg-slate-200",
      iconColor: "text-slate-600"
    },
    { 
      label: "MOFU", 
      sublabel: "Sesiones WhatsApp", 
      value: metrics.funnel.mofu || 0, 
      icon: Flag,
      bgColor: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    { 
      label: "Hot Leads", 
      sublabel: "Alta intención", 
      value: metrics.funnel.hotLeads || 0, 
      icon: Flame,
      bgColor: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    { 
      label: "BOFU", 
      sublabel: "Ventas", 
      value: metrics.funnel.bofu || 0, 
      icon: ShoppingCart,
      bgColor: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
  ];

  const rateStages = [
    { label: "Sin respuesta", value: metrics.funnel.deadRate || 0, color: "bg-slate-400", icon: Snowflake, iconColor: "text-slate-500" },
    { label: "En progreso", value: metrics.funnel.warmRate || 0, color: "bg-sky-400", icon: Thermometer, iconColor: "text-sky-500" },
    { label: "Alta intención", value: metrics.funnel.hotRate || 0, color: "bg-amber-400", icon: Zap, iconColor: "text-amber-500" },
    { label: "Conversión", value: metrics.funnel.conversionRate || 0, color: "bg-emerald-500", icon: Target, iconColor: "text-emerald-500" },
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle="Vista general de tu rendimiento"
          badge={<LiveBadge />}
          actions={
            <PeriodFilter
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              periodInfo={periodInfo}
            />
          }
        />

        {/* Funnel Card */}
        <div className="order-2 md:order-none rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-base font-semibold text-foreground">Resumen del Funnel de Ventas</h3>
            <p className="text-xs md:text-sm text-muted-foreground">TOFU → MOFU → BOFU en tiempo real</p>
          </div>
          
          {/* Pipeline Visual - Responsive Grid/Scroll */}
          {isMobile ? (
            // Mobile: Grid 2x2
            <div className="grid grid-cols-2 gap-3 mb-4">
              {funnelStages.map((stage) => (
                <div key={stage.label} className={`rounded-xl border p-3 ${stage.bgColor}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`rounded-md p-1 ${stage.iconBg}`}>
                      <stage.icon className={`h-3 w-3 ${stage.iconColor}`} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{stage.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground mb-0.5">
                    {typeof stage.value === 'number' ? stage.value.toLocaleString() : stage.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{stage.sublabel}</p>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Grid layout
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

          {/* Rates Bar - Responsive */}
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
        <div className="order-3 md:order-none rounded-lg border border-primary/20 bg-primary/5 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-muted-foreground">Ingresos totales</span>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-foreground">{formatRevenue(metrics.revenue)}</p>
        </div>

        {/* KPI Cards - Responsive Grid */}
        <div className="order-4 md:order-none grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
            value={metrics.servicesBooked.toString()}
            icon={CalendarCheck}
            variant="warning"
          />
        </div>

        {/* Appointments - Responsive Table/Cards */}
        <div className="order-7 md:order-none rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm md:text-base font-semibold text-foreground">Últimos agendamientos</h3>
            {isMobile && recentAppointments.length > 0 && (
              <button className="text-xs text-primary font-medium flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {recentAppointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">Sin agendamientos en este período</p>
            </div>
          ) : isMobile ? (
            // Mobile: Card list
            <div className="divide-y divide-border">
              {recentAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-secondary/30 active:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{apt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{apt.service}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{format(apt.datetime, "dd MMM, HH:mm", { locale: es })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Table
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
                {recentAppointments.slice(0, 8).map((apt) => (
                  <TableRow key={apt.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">
                      {format(apt.datetime, "dd MMM, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-foreground">{apt.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{apt.service}</TableCell>
                    <TableCell>
                      <StatusBadge status={apt.status} />
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
