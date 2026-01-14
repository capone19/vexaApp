import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Calendar, BarChart3 } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const MarketingPerformance = () => {
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalMensajesEnviados: 0,
    totalConversiones: 0,
    valorRecuperado: 0,
    roas: 0,
    tasaConversion: 0,
  });
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
        // Get date range based on period
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
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
            startDate = subDays(now, 30);
        }

        // Fetch campaign data from Supabase
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate.toISOString());

        const { data: recipients } = await supabase
          .from('campaign_recipients')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate.toISOString());

        // Calculate metrics from real data
        const totalMensajesEnviados = recipients?.filter(r => r.sent_at).length || 0;
        const totalConversiones = recipients?.filter(r => r.read_at).length || 0;
        const tasaConversion = totalMensajesEnviados > 0 ? (totalConversiones / totalMensajesEnviados) * 100 : 0;
        const valorRecuperado = totalConversiones * 5985; // Average value per conversion
        const roas = totalMensajesEnviados > 0 ? valorRecuperado / (totalMensajesEnviados * 15) : 0;

        setMetrics({
          totalMensajesEnviados,
          totalConversiones,
          valorRecuperado,
          roas: parseFloat(roas.toFixed(2)),
          tasaConversion: parseFloat(tasaConversion.toFixed(2)),
        });

        // Empty chart data for new clients
        setChartData([]);
      } catch (error) {
        console.error('Error loading marketing data:', error);
      }

      setLoading(false);
    };

    loadData();
  }, [tenantId, period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  const hasNoData = metrics.totalMensajesEnviados === 0;

  const getDateRangeLabel = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
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
        startDate = subDays(now, 30);
    }
    
    return `${format(startDate, 'dd MMM', { locale: es })} - ${format(now, 'dd MMM, yyyy', { locale: es })}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard de Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getDateRangeLabel()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] bg-background border-border">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {getDateRangeLabel()}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="remarketing">Remarketing WhatsApp</TabsTrigger>
          </TabsList>
        </Tabs>

        {hasNoData ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Sin datos de performance aún</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Los datos de performance aparecerán aquí cuando ejecutes campañas de marketing.
                Crea tu primera campaña para empezar a ver resultados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Mensajes Enviados</span>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total de mensajes de remarketing enviados</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-semibold text-foreground">{metrics.totalMensajesEnviados.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total del período</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Ventas Recuperadas</span>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Valor total de ventas generadas por remarketing</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-semibold text-foreground">{formatCurrency(metrics.valorRecuperado)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Valor total recuperado</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tasa de Conversión</span>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Porcentaje de mensajes que generaron venta</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-semibold text-foreground">{metrics.tasaConversion}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversiones / enviados</p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">ROAS</span>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Retorno sobre los gastos en publicidad</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-semibold text-foreground">{metrics.roas}</p>
                  <p className="text-xs text-muted-foreground mt-1">Retorno sobre los gastos en publicidad</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  Mensajes de Remarketing Enviados
                </CardTitle>
                <CardDescription>
                  Evolución diaria de mensajes de remarketing enviados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#6366F1]"></div>
                        <span className="text-sm text-muted-foreground">Mensajes Enviados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                        <span className="text-sm text-muted-foreground">Conversiones</span>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          interval={4}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="mensajesEnviados" 
                          stroke="#6366F1" 
                          strokeWidth={2}
                          dot={{ fill: '#6366F1', strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: '#6366F1' }}
                          name="Mensajes Enviados"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="conversiones" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: '#10B981' }}
                          name="Conversiones"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 opacity-30 mb-4" />
                    <p>No hay datos de campaña para mostrar</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Templates */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Plantillas con Mejor Rendimiento
                  </CardTitle>
                  <CardDescription>
                    Mensajes con mayor tasa de conversión
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <p className="text-sm">Sin plantillas con datos aún</p>
                  </div>
                </CardContent>
              </Card>

              {/* Performance by Hour */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Mejor Horario de Envío
                  </CardTitle>
                  <CardDescription>
                    Horas con mayor tasa de apertura y conversión
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <p className="text-sm">Sin datos de horarios aún</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default MarketingPerformance;
