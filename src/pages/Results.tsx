import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, Award, Zap, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/shared/KPICard';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { fetchDashboardData } from '@/lib/mock/data';
import type { DashboardMetrics, DateRangePreset } from '@/lib/types';
import { cn } from '@/lib/utils';

// Mock data for results
const generateConversionTrend = () => {
  const data = [];
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  for (let i = 0; i < 7; i++) {
    data.push({
      day: days[i],
      appointments: Math.floor(Math.random() * 30) + 20,
      appointmentsPrev: Math.floor(Math.random() * 25) + 18,
      rate: Math.floor(Math.random() * 8) + 10,
    });
  }
  return data;
};

// WhatsApp performance data
const whatsappPerformance = {
  chats: 1800,
  conversions: 220,
  revenue: 9900000,
  conversionRate: 12.2,
  avgTicket: 45000,
  trend: 15.3
};

const topServices = [
  { name: 'Corte de cabello', conversions: 145, revenue: 2175000, growth: 18.5 },
  { name: 'Tinte completo', conversions: 89, revenue: 4005000, growth: 12.3 },
  { name: 'Manicure + Pedicure', conversions: 67, revenue: 2010000, growth: -5.2 },
  { name: 'Tratamiento capilar', conversions: 41, revenue: 1435000, growth: 25.8 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
};

const Results = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>('7d');
  const [conversionTrend] = useState(generateConversionTrend);

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
          <PageHeader title="Ventas" subtitle="Impacto en el negocio y rendimiento comercial" />
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

  const totalConversions = whatsappPerformance.conversions;
  const totalRevenue = whatsappPerformance.revenue;
  const avgConversionRate = (totalConversions / metrics.totalChats) * 100;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Resultados" 
          subtitle="Impacto en el negocio y rendimiento comercial"
          actions={<DateRangeFilter value={dateRange} onChange={handleDateChange} />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Servicios Agendados"
            value={metrics.servicesBooked.toLocaleString()}
            icon={Calendar}
            trend={{ value: 18.2, isPositive: true }}
            variant="success"
          />
          <KPICard
            title="Tasa de Conversión"
            value={`${avgConversionRate.toFixed(1)}%`}
            icon={Target}
            trend={{ value: 3.5, isPositive: true }}
            variant="primary"
          />
          <KPICard
            title="Revenue Generado"
            value={formatCurrency(metrics.revenue)}
            icon={DollarSign}
            trend={{ value: 22.4, isPositive: true }}
            variant="warning"
          />
        </div>

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
                <div className="text-3xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                <div className="flex items-center gap-1 text-sm text-success">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>+22.4% vs período anterior</span>
                </div>
              </div>

              <div className="h-px bg-border/50" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Ticket Promedio</div>
                  <div className="text-lg font-semibold">{formatCurrency(totalRevenue / totalConversions)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Conversiones</div>
                  <div className="text-lg font-semibold">{totalConversions}</div>
                </div>
              </div>

              <div className="h-px bg-border/50" />

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">ROI Estimado del Bot</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-lg px-3 py-1">
                    +340%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs atención manual</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topServices.map((service, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg font-bold",
                        idx === 0 && "text-warning",
                        idx === 1 && "text-muted-foreground",
                        idx === 2 && "text-orange-600",
                        idx >= 3 && "text-muted-foreground"
                      )}>
                        #{idx + 1}
                      </span>
                    </div>
                    <span className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      service.growth >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {service.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(service.growth)}%
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.conversions} conversiones</div>
                  </div>
                  <div className="text-lg font-semibold text-primary">
                    {formatCurrency(service.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Results;
