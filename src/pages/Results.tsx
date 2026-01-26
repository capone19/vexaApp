import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, Award, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KPICard } from '@/components/shared/KPICard';
import { PeriodFilter, type PeriodPreset } from '@/components/shared/PeriodFilter';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { useBillingPeriod } from '@/hooks/use-billing-period';
import { cn } from '@/lib/utils';

// Empty State Component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
      <DollarSign className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">Sin resultados aún</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      Cuando comiences a realizar ventas y agendamientos, tus resultados aparecerán aquí.
    </p>
  </div>
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(value);
};

const Results = () => {
  const { tenantId } = useEffectiveTenant();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>('current');

  // Usar el hook de período de facturación
  const { startDate, endDate, periodInfo } = useBillingPeriod({ selectedPeriod });

  const { metrics, isLoading, error } = useDashboardMetrics({
    tenantId,
    dateRange: startDate && endDate ? { startDate, endDate } : undefined,
  });

  // Check if there's any data - must be before useMemo hooks
  const hasData = metrics && (metrics.servicesBooked > 0 || metrics.revenue > 0);
  
  const conversionRate = metrics && metrics.totalChats > 0 
    ? ((metrics.servicesBooked / metrics.totalChats) * 100).toFixed(1)
    : "0";

  // Conversion trend data from real metrics - MUST be before any conditional returns
  const conversionTrend = useMemo(() => {
    if (!metrics?.dailyData?.length) {
      return [];
    }
    return metrics.dailyData.map(d => ({
      day: d.day,
      appointments: d.bookings,
    }));
  }, [metrics?.dailyData]);

  // Top services data - MUST be before any conditional returns
  const topServicesData = useMemo(() => {
    if (!metrics?.topServices?.length) {
      return [];
    }
    const maxCount = Math.max(...metrics.topServices.map(s => s.count));
    return metrics.topServices.map(s => ({
      ...s,
      percentage: maxCount > 0 ? (s.count / maxCount) * 100 : 0,
    }));
  }, [metrics?.topServices]);

  // CONDITIONAL RETURNS - After all hooks are declared
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Resultados" subtitle="Impacto en el negocio y rendimiento comercial" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-[300px]" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Resultados" subtitle="Impacto en el negocio" />
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="text-destructive mb-4">Error al cargar resultados</div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Resultados" 
          subtitle="Impacto en el negocio y rendimiento comercial"
          actions={
            <PeriodFilter 
              value={selectedPeriod} 
              onChange={setSelectedPeriod}
              periodInfo={periodInfo}
            />
          }
        />

        {/* KPI Cards - Always show but with 0/empty values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Servicios Agendados"
            value={(metrics?.servicesBooked || 0).toLocaleString()}
            icon={Calendar}
            variant="success"
          />
          <KPICard
            title="Tasa de Conversión"
            value={`${conversionRate}%`}
            icon={Target}
            variant="primary"
          />
          <KPICard
            title="Revenue Generado"
            value={formatCurrency(metrics?.revenue || 0)}
            icon={DollarSign}
            variant="warning"
          />
          <KPICard
            title="Total Conversaciones"
            value={(metrics?.totalChats || 0).toLocaleString()}
            icon={BarChart3}
            variant="info"
          />
        </div>

        {/* Empty State or Content */}
        {!hasData ? (
          <Card className="border-border">
            <EmptyState />
          </Card>
        ) : (
          <>
            {/* Conversion Trend & Impact Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversion Trend Chart */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Tendencia de Conversión a Agendamientos
                  </CardTitle>
                  <CardDescription>Servicios agendados por día a través del chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={conversionTrend}>
                      <defs>
                        <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke="hsl(var(--success))" 
                        fill="url(#colorAppointments)" 
                        strokeWidth={2}
                        name="Agendamientos"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Business Impact Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Impacto en el Negocio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Revenue Total (Período)</div>
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(metrics?.revenue || 0)}
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Ticket Promedio</div>
                      <div className="text-lg font-semibold">
                        {metrics && metrics.servicesBooked > 0 
                          ? formatCurrency(metrics.revenue / metrics.servicesBooked)
                          : formatCurrency(0)
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Conversiones</div>
                      <div className="text-lg font-semibold">{metrics?.servicesBooked || 0}</div>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Tasa de Conversión</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-lg px-3 py-1">
                        {conversionRate}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">de conversaciones</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Services */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning" />
                  Top Servicios por Conversiones
                </CardTitle>
                <CardDescription>Servicios más agendados a través del chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                {topServicesData.length > 0 ? (
                  <div className="space-y-4">
                    {topServicesData.map((service, index) => (
                      <div key={service.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-5">
                              #{index + 1}
                            </span>
                            <span className="font-medium text-sm">{service.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(service.revenue)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {service.count} {service.count === 1 ? 'venta' : 'ventas'}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={service.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Los servicios más vendidos aparecerán aquí cuando tengas conversiones</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Results;
