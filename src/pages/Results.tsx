import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, Award, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/shared/KPICard';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { useAuth } from '@/hooks/use-auth';
import type { DateRangePreset } from '@/lib/types';
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
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRangePreset>('7d');

  // Calcular rango de fechas
  const dateRangeObj = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "ytd":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }
    
    return { startDate, endDate: now };
  }, [dateRange]);

  const { metrics, isLoading, error } = useDashboardMetrics({
    tenantId: user?.tenantId,
    dateRange: dateRangeObj,
  });

  const handleDateChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

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

  // Check if there's any data
  const hasData = metrics && (metrics.servicesBooked > 0 || metrics.revenue > 0);
  
  const conversionRate = metrics && metrics.totalChats > 0 
    ? ((metrics.servicesBooked / metrics.totalChats) * 100).toFixed(1)
    : "0";

  // Empty conversion trend data
  const conversionTrend = [
    { day: 'Lun', appointments: 0 },
    { day: 'Mar', appointments: 0 },
    { day: 'Mié', appointments: 0 },
    { day: 'Jue', appointments: 0 },
    { day: 'Vie', appointments: 0 },
    { day: 'Sáb', appointments: 0 },
    { day: 'Dom', appointments: 0 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Resultados" 
          subtitle="Impacto en el negocio y rendimiento comercial"
          actions={<DateRangeFilter value={dateRange} onChange={handleDateChange} />}
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

            {/* Top Services - Empty State */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning" />
                  Top Servicios por Conversiones
                </CardTitle>
                <CardDescription>Servicios más agendados a través del chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Los servicios más vendidos aparecerán aquí cuando tengas conversiones</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Results;
