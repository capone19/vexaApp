import { useState, useMemo } from 'react';
import { TrendingDown, MessageSquare, Users, Clock, ArrowRightLeft, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { KPICard } from '@/components/shared/KPICard';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import type { DateRangePreset } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Empty State Component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
      <BarChart3 className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">Sin métricas aún</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      Cuando comiences a recibir conversaciones, tus métricas y gráficos aparecerán aquí.
    </p>
  </div>
);

const Metrics = () => {
  const { tenantId } = useEffectiveTenant();
  const [dateRange, setDateRange] = useState<DateRangePreset>('7d');
  const [showComparison, setShowComparison] = useState(false);
  const isMobile = useIsMobile();

  // Calcular rango de fechas
  const dateRangeObj = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
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
    
    return { startDate, endDate };
  }, [dateRange]);

  const { metrics, isLoading, error } = useDashboardMetrics({
    tenantId,
    dateRange: dateRangeObj,
  });

  const handleDateChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  // Check if there's any data - must be before useMemo hooks
  const hasData = metrics && (metrics.totalChats > 0 || metrics.totalMessages > 0);

  // Time series data from real metrics - MUST be before any conditional returns
  const timeSeriesData = useMemo(() => {
    if (!hasData || !metrics?.dailyData?.length) {
      return [];
    }
    return metrics.dailyData.map(d => ({
      day: d.day,
      chats: d.chats,
      avgMessages: d.avgMessages,
    }));
  }, [hasData, metrics?.dailyData]);

  // Abandonment data from real metrics - MUST be before any conditional returns
  const abandonmentData = useMemo(() => {
    if (!hasData || !metrics?.dailyData?.length) {
      return [];
    }
    return metrics.dailyData.map(d => ({
      day: d.day,
      rate: d.abandonmentRate,
    }));
  }, [hasData, metrics?.dailyData]);

  // Funnel data
  const funnelData = useMemo(() => {
    if (!hasData) return [];
    return [
      { stage: 'TOFU', value: metrics?.funnel.tofu || 0, fill: 'hsl(var(--tofu))' },
      { stage: 'MOFU', value: metrics?.funnel.mofu || 0, fill: 'hsl(var(--mofu))' },
      { stage: 'Hot Leads', value: metrics?.funnel.hotLeads || 0, fill: 'hsl(var(--hotlead))' },
      { stage: 'BOFU', value: metrics?.funnel.bofu || 0, fill: 'hsl(var(--bofu))' },
    ];
  }, [hasData, metrics?.funnel]);

  // CONDITIONAL RETURNS - After all hooks are declared
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <PageHeader title="Métricas" subtitle={isMobile ? undefined : "Análisis detallado de conversaciones y rendimiento"} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-[250px] md:h-[300px]" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <PageHeader title="Métricas" subtitle="Análisis detallado" />
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="text-destructive mb-4">Error al cargar métricas</div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader 
          title="Métricas" 
          subtitle={isMobile ? undefined : "Análisis detallado de conversaciones y rendimiento"}
          actions={
            <div className={cn(
              "flex items-center gap-2 md:gap-4",
              isMobile && "flex-wrap justify-end"
            )}>
              {!isMobile && hasData && (
                <div className="flex items-center gap-2">
                  <Switch 
                    id="comparison" 
                    checked={showComparison} 
                    onCheckedChange={setShowComparison} 
                  />
                  <Label htmlFor="comparison" className="text-sm text-muted-foreground whitespace-nowrap">
                    Comparar período
                  </Label>
                </div>
              )}
              <DateRangeFilter value={dateRange} onChange={handleDateChange} />
            </div>
          }
        />

        {/* Mobile: Comparison toggle */}
        {isMobile && hasData && (
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="comparison-mobile" className="text-sm text-muted-foreground">
              Comparar con período anterior
            </Label>
            <Switch 
              id="comparison-mobile" 
              checked={showComparison} 
              onCheckedChange={setShowComparison} 
            />
          </div>
        )}

        {/* KPI Cards - Always show but with 0 values */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            title="Total Chats"
            value={(metrics?.totalChats || 0).toLocaleString()}
            icon={MessageSquare}
          />
          <KPICard
            title="Total Mensajes"
            value={(metrics?.totalMessages || 0).toLocaleString()}
            icon={Users}
          />
          <KPICard
            title="Prom. Msgs/Chat"
            value={(metrics?.avgMessagesPerChat || 0).toFixed(1)}
            icon={ArrowRightLeft}
          />
          <KPICard
            title="T. Respuesta"
            value={`${metrics?.avgFirstResponseTime || 0}s`}
            icon={Clock}
          />
        </div>

        {/* Empty State or Charts */}
        {!hasData ? (
          <Card className="border-border">
            <EmptyState />
          </Card>
        ) : (
          <>
            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Chat Volume Chart */}
              <Card className="border-border">
                <CardHeader className={cn(isMobile && "pb-2")}>
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Volumen de Chats
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Conversaciones iniciadas por día</CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "px-2")}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} width={isMobile ? 30 : 40} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: isMobile ? '12px' : '14px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="chats" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorChats)" 
                        strokeWidth={2}
                        name="Chats"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Messages per Conversation */}
              <Card className="border-border">
                <CardHeader className={cn(isMobile && "pb-2")}>
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Mensajes por Conversación
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Promedio de mensajes intercambiados</CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "px-2")}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} width={isMobile ? 30 : 40} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: isMobile ? '12px' : '14px'
                        }} 
                      />
                      <Bar 
                        dataKey="avgMessages" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        name="Promedio mensajes"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Funnel Visualization */}
              <Card className="border-border">
                <CardHeader className={cn(isMobile && "pb-2")}>
                  <CardTitle className="text-sm md:text-base">Funnel de Conversaciones</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Distribución por etapa del funnel</CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "px-2")}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} />
                      <YAxis 
                        type="category" 
                        dataKey="stage" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={isMobile ? 10 : 12} 
                        width={isMobile ? 60 : 80} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: isMobile ? '12px' : '14px'
                        }} 
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Abandonment Rate */}
              <Card className="border-border">
                <CardHeader className={cn(isMobile && "pb-2")}>
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Tasa de Abandono
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Conversaciones abandonadas por día</CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "px-2")}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <LineChart data={abandonmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} unit="%" width={isMobile ? 35 : 45} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: isMobile ? '12px' : '14px'
                        }}
                        formatter={(value) => [`${value}%`, 'Tasa abandono']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: isMobile ? 3 : 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Metrics;
