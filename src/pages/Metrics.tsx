import { useState, useEffect } from 'react';
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
import type { DashboardMetrics, DateRangePreset } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { subDays, format } from 'date-fns';

const Metrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>('7d');
  const [showComparison, setShowComparison] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [abandonmentData, setAbandonmentData] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  useEffect(() => {
    const loadData = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Calculate date range
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case '7d':
            startDate = subDays(now, 7);
            break;
          case '30d':
            startDate = subDays(now, 30);
            break;
          case '90d':
            startDate = subDays(now, 90);
            break;
          default:
            startDate = subDays(now, 7);
        }

        // Fetch real data from Supabase
        const [sessionsResult, messagesResult, metricsResult] = await Promise.all([
          supabase
            .from('chat_sessions')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString()),
          supabase
            .from('chat_messages')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString()),
          supabase
            .from('metrics_daily')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('date', format(startDate, 'yyyy-MM-dd'))
            .order('date', { ascending: true }),
        ]);

        const sessions = sessionsResult.data || [];
        const messages = messagesResult.data || [];
        const dailyMetrics = metricsResult.data || [];

        // Calculate metrics
        const totalChats = sessions.length;
        const totalMessages = messages.length;
        const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;
        
        // Calculate funnel stages
        const tofuCount = sessions.filter(s => s.funnel_stage === 'tofu').length;
        const mofuCount = sessions.filter(s => s.funnel_stage === 'mofu').length;
        const hotCount = sessions.filter(s => s.funnel_stage === 'hot').length;
        const bofuCount = sessions.filter(s => s.funnel_stage === 'bofu').length;

        setMetrics({
          totalChats,
          totalMessages,
          avgMessagesPerChat: parseFloat(avgMessagesPerChat.toFixed(1)),
          botResponseRate: 0,
          avgFirstResponseTime: 0,
          avgConversionTime: 0,
          servicesBooked: 0,
          revenue: 0,
          funnel: {
            tofu: tofuCount,
            mofu: mofuCount,
            hotLeads: hotCount,
            bofu: bofuCount,
            deadRate: 0,
            warmRate: 0,
            hotRate: 0,
            conversionRate: 0,
          },
        });

        // Prepare time series data from daily metrics
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        if (dailyMetrics.length > 0) {
          setTimeSeriesData(dailyMetrics.slice(-7).map((m, i) => ({
            day: days[i % 7],
            chats: m.total_sessions || 0,
            chatsPrev: 0,
            messages: m.total_messages || 0,
            messagesPrev: 0,
            avgMessages: m.total_sessions ? (m.total_messages || 0) / m.total_sessions : 0,
          })));
        } else {
          // Empty chart data
          setTimeSeriesData(days.map(day => ({
            day,
            chats: 0,
            chatsPrev: 0,
            messages: 0,
            messagesPrev: 0,
            avgMessages: 0,
          })));
        }

        // Set funnel data
        setFunnelData([
          { stage: 'TOFU', value: tofuCount, fill: 'hsl(var(--tofu))' },
          { stage: 'MOFU', value: mofuCount, fill: 'hsl(var(--mofu))' },
          { stage: 'Hot Leads', value: hotCount, fill: 'hsl(var(--hotlead))' },
          { stage: 'BOFU', value: bofuCount, fill: 'hsl(var(--bofu))' },
        ]);

        // Empty abandonment data
        setAbandonmentData([
          { hour: '08:00', rate: 0 },
          { hour: '10:00', rate: 0 },
          { hour: '12:00', rate: 0 },
          { hour: '14:00', rate: 0 },
          { hour: '16:00', rate: 0 },
          { hour: '18:00', rate: 0 },
          { hour: '20:00', rate: 0 },
        ]);

      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Set empty defaults on error
        setMetrics({
          totalChats: 0,
          totalMessages: 0,
          avgMessagesPerChat: 0,
          botResponseRate: 0,
          avgFirstResponseTime: 0,
          avgConversionTime: 0,
          servicesBooked: 0,
          revenue: 0,
          funnel: { tofu: 0, mofu: 0, hotLeads: 0, bofu: 0, deadRate: 0, warmRate: 0, hotRate: 0, conversionRate: 0 },
        });
      }

      setLoading(false);
    };

    loadData();
  }, [dateRange, tenantId]);

  const handleDateChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  if (loading || !metrics) {
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

  // Check if there's no data
  const hasNoData = metrics.totalChats === 0 && metrics.totalMessages === 0;

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
              {!isMobile && (
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
        {isMobile && (
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

        {hasNoData ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Sin datos aún</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Las métricas aparecerán aquí cuando comiences a recibir conversaciones. 
                Conecta tu canal de WhatsApp para empezar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Chats"
                value={metrics.totalChats.toLocaleString()}
                icon={MessageSquare}
              />
              <KPICard
                title="Total Mensajes"
                value={metrics.totalMessages.toLocaleString()}
                icon={Users}
              />
              <KPICard
                title="Prom. Msgs/Chat"
                value={metrics.avgMessagesPerChat.toFixed(1)}
                icon={ArrowRightLeft}
              />
              <KPICard
                title="T. Respuesta"
                value={`${metrics.avgFirstResponseTime}s`}
                icon={Clock}
              />
            </div>

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
                      {showComparison && (
                        <Area 
                          type="monotone" 
                          dataKey="chatsPrev" 
                          stroke="hsl(var(--muted-foreground))" 
                          fill="none"
                          strokeDasharray="5 5"
                          name="Período anterior"
                        />
                      )}
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
                  <CardDescription className="text-xs md:text-sm">Conversaciones sin respuesta por hora</CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "px-2")}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <LineChart data={abandonmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={isMobile ? 10 : 12} />
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
