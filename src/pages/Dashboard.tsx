import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { LiveBadge } from "@/components/shared/LiveBadge";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { fetchDashboardData, mockAppointments } from "@/lib/mock/data";
import type { DashboardMetrics, DateRangePreset } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MessageSquare,
  TrendingUp,
  Bot,
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
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchDashboardData();
      setMetrics(data);
      setLoading(false);
    };
    load();
  }, [dateRange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);

  if (loading || !metrics) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SkeletonCard className="w-64 h-16" lines={1} />
            <SkeletonCard className="w-48 h-10" lines={1} />
          </div>
          <SkeletonCard className="h-48" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={5} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
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

        {/* Funnel Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Resumen del Funnel de Ventas</h3>
            <p className="text-sm text-muted-foreground">TOFU → MOFU → BOFU en tiempo real</p>
          </div>
          
          {/* Pipeline Visual - 4 Cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { 
                label: "TOFU", 
                sublabel: "Conversaciones iniciales", 
                value: metrics.funnel.tofu || "--", 
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
            ].map((stage, idx, arr) => (
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

          {/* Rates Bar */}
          <div className="flex items-center gap-6 pt-4 border-t border-border">
            {[
              { label: "Sin respuesta", value: metrics.funnel.deadRate, color: "bg-slate-400", icon: Snowflake, iconColor: "text-slate-500" },
              { label: "En progreso", value: metrics.funnel.warmRate, color: "bg-sky-400", icon: Thermometer, iconColor: "text-sky-500" },
              { label: "Alta intención", value: metrics.funnel.hotRate, color: "bg-amber-400", icon: Zap, iconColor: "text-amber-500" },
              { label: "Conversión", value: metrics.funnel.conversionRate, color: "bg-emerald-500", icon: Target, iconColor: "text-emerald-500" },
            ].map((rate, idx, arr) => (
              <div key={rate.label} className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <rate.icon className={`h-3.5 w-3.5 ${rate.iconColor}`} />
                  <span className="text-xs text-muted-foreground">{rate.label}</span>
                  <span className={`text-sm font-semibold ml-auto ${
                    rate.label === "Sin respuesta" ? "text-slate-600" :
                    rate.label === "En progreso" ? "text-sky-600" :
                    rate.label === "Alta intención" ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>{rate.value}%</span>
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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Ingresos totales</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{formatCurrency(metrics.revenue)}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
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
            title="Tasa respuesta bot"
            value={`${metrics.botResponseRate}%`}
            icon={Bot}
            variant="success"
          />
          <KPICard
            title="Servicios agendados"
            value={metrics.servicesBooked}
            icon={CalendarCheck}
            variant="warning"
          />
        </div>

        {/* Appointments Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Últimos agendamientos</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Fecha/Hora</TableHead>
                <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
                <TableHead className="text-muted-foreground font-medium">Servicio</TableHead>
                <TableHead className="text-muted-foreground font-medium">Origen</TableHead>
                <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAppointments.slice(0, 8).map((apt) => (
                <TableRow key={apt.id} className="border-border hover:bg-secondary/50">
                  <TableCell className="font-medium text-foreground">
                    {format(apt.datetime, "dd MMM, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="text-foreground">{apt.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">{apt.service}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{apt.source}</TableCell>
                  <TableCell>
                    <StatusBadge status={apt.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
