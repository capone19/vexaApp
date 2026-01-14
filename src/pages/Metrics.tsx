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
import { fetchDashboardData } from '@/lib/mock/data';
import type { DashboardMetrics, DateRangePreset } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Mock time-series data
const generateTimeSeriesData = () => {
  const data = [];
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  for (let i = 0; i < 7; i++) {
    data.push({
      day: days[i],
      chats: Math.floor(Math.random() * 80) + 40,
      chatsPrev: Math.floor(Math.random() * 70) + 35,
      messages: Math.floor(Math.random() * 600) + 300,
      messagesPrev: Math.floor(Math.random() * 550) + 280,
      avgMessages: Math.floor(Math.random() * 8) + 10,
    });
  }
  return data;
};

const generateFunnelData = () => [
  { stage: 'TOFU', value: 2840, fill: 'hsl(var(--tofu))' },
  { stage: 'MOFU', value: 1247, fill: 'hsl(var(--mofu))' },
  { stage: 'Hot Leads', value: 486, fill: 'hsl(var(--hotlead))' },
  { stage: 'BOFU', value: 342, fill: 'hsl(var(--bofu))' },
];

const generateAbandonmentData = () => [
  { hour: '08:00', rate: 12 },
  { hour: '10:00', rate: 8 },
  { hour: '12:00', rate: 15 },
  { hour: '14:00', rate: 18 },
  { hour: '16:00', rate: 22 },
  { hour: '18:00', rate: 25 },
  { hour: '20:00', rate: 20 },
];

const Metrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>('7d');
  const [showComparison, setShowComparison] = useState(false);
  const [timeSeriesData] = useState(generateTimeSeriesData);
  const [funnelData] = useState(generateFunnelData);
  const [abandonmentData] = useState(generateAbandonmentData);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchDashboardData();
      setMetrics(data);
      setLoading(false);
    };
    loadData();
  }, [dateRange]);

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            title="Total Chats"
            value={metrics.totalChats.toLocaleString()}
            icon={MessageSquare}
            trend={{ value: 12.5, isPositive: true }}
          />
          <KPICard
            title="Total Mensajes"
            value={metrics.totalMessages.toLocaleString()}
            icon={Users}
            trend={{ value: 8.3, isPositive: true }}
          />
          <KPICard
            title="Prom. Msgs/Chat"
            value={metrics.avgMessagesPerChat.toFixed(1)}
            icon={ArrowRightLeft}
            trend={{ value: 2.1, isPositive: false }}
          />
          <KPICard
            title="T. Respuesta"
            value={`${metrics.avgFirstResponseTime}s`}
            icon={Clock}
            trend={{ value: 15.2, isPositive: true }}
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

      </div>
    </MainLayout>
  );
};

export default Metrics;
