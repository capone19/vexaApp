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
          <h3 className="text-lg font-semibold mb-6">Resumen del Funnel de Ventas</h3>
          
          {/* Pipeline Visual */}
          <div className="flex items-center justify-between mb-8">
            {[
              { label: "TOFU", sublabel: "Meta Ads", value: metrics.funnel.tofu, color: "bg-info" },
              { label: "MOFU", sublabel: "Sesiones WhatsApp", value: metrics.funnel.mofu, color: "bg-primary" },
              { label: "Hot Leads", sublabel: "6+ mensajes", value: metrics.funnel.hotLeads, color: "bg-warning" },
              { label: "BOFU", sublabel: "Ventas / Agendamientos", value: metrics.funnel.bofu, color: "bg-hot" },
            ].map((stage, idx, arr) => (
              <div key={stage.label} className="flex items-center flex-1">
                <div className="flex-1 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${stage.color} mb-2`}>
                    <span className="text-xl font-bold text-background">{stage.value.toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.sublabel}</p>
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Rates */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Dead Rate", value: metrics.funnel.deadRate, color: "bg-muted" },
              { label: "Warm Rate", value: metrics.funnel.warmRate, color: "bg-info" },
              { label: "Hot Rate", value: metrics.funnel.hotRate, color: "bg-warning" },
              { label: "Conversión", value: metrics.funnel.conversionRate, color: "bg-primary" },
            ].map((rate) => (
              <div key={rate.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{rate.label}</span>
                  <span className="font-medium">{rate.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full ${rate.color} rounded-full transition-all`}
                    style={{ width: `${rate.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 glow-subtle">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Revenue Total</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(metrics.revenue)}</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium text-muted-foreground">Comisión GP (35%)</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(metrics.commission)}</p>
          </div>
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
            variant="hot"
          />
        </div>

        {/* Appointments Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Últimos agendamientos</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAppointments.slice(0, 8).map((apt) => (
                <TableRow key={apt.id} className="border-border">
                  <TableCell className="font-medium">
                    {format(apt.datetime, "dd MMM, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>{apt.clientName}</TableCell>
                  <TableCell>{apt.service}</TableCell>
                  <TableCell className="capitalize">{apt.source}</TableCell>
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
