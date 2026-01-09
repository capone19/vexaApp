import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, MessageSquare, Users, Clock, ArrowRightLeft, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

const generateChannelFunnelData = () => [
  { channel: 'WhatsApp', tofu: 1800, mofu: 800, hot: 320, bofu: 220 },
  { channel: 'Instagram', tofu: 650, mofu: 280, hot: 100, bofu: 75 },
  { channel: 'Messenger', tofu: 300, mofu: 120, hot: 50, bofu: 35 },
  { channel: 'Web', tofu: 90, mofu: 47, hot: 16, bofu: 12 },
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
  const [channelFunnelData] = useState(generateChannelFunnelData);
  const [abandonmentData] = useState(generateAbandonmentData);

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
        <div className="space-y-6">
          <PageHeader title="Métricas" subtitle="Análisis detallado de conversaciones y rendimiento" />
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Métricas" 
          subtitle="Análisis detallado de conversaciones y rendimiento"
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  id="comparison" 
                  checked={showComparison} 
                  onCheckedChange={setShowComparison} 
                />
                <Label htmlFor="comparison" className="text-sm text-muted-foreground">
                  Comparar período anterior
                </Label>
              </div>
              <DateRangeFilter value={dateRange} onChange={handleDateChange} />
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            title="Promedio Msgs/Chat"
            value={metrics.avgMessagesPerChat.toFixed(1)}
            icon={ArrowRightLeft}
            trend={{ value: 2.1, isPositive: false }}
          />
          <KPICard
            title="Tiempo Respuesta"
            value={`${metrics.avgFirstResponseTime}s`}
            icon={Clock}
            trend={{ value: 15.2, isPositive: true }}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Volume Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Volumen de Chats
              </CardTitle>
              <CardDescription>Conversaciones iniciadas por día</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                Mensajes por Conversación
              </CardTitle>
              <CardDescription>Promedio de mensajes intercambiados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={timeSeriesData}>
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
                  <Bar 
                    dataKey="avgMessages" 
                    fill="hsl(var(--cyan-glow))" 
                    radius={[4, 4, 0, 0]}
                    name="Promedio mensajes"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Visualization */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Funnel de Conversaciones</CardTitle>
              <CardDescription>Distribución por etapa del funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Tasa de Abandono
              </CardTitle>
              <CardDescription>Porcentaje de conversaciones sin respuesta por hora</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={abandonmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}%`, 'Tasa abandono']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Channel Funnel Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por Canal y Etapa</CardTitle>
            <CardDescription>Distribución de conversaciones por canal en cada etapa del funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Canal</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'hsl(var(--tofu))' }}>TOFU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'hsl(var(--mofu))' }}>MOFU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'hsl(var(--hotlead))' }}>Hot Leads</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'hsl(var(--bofu))' }}>BOFU</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {channelFunnelData.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{row.channel}</td>
                      <td className="text-right py-3 px-4">{row.tofu.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{row.mofu.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{row.hot.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{row.bofu.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className="text-success font-medium">
                          {((row.bofu / row.tofu) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Metrics;
