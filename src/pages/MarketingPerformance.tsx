import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Calendar } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data para métricas de remarketing WhatsApp
const generateDailyData = () => {
  const data = [];
  const startDate = new Date('2025-10-01');
  
  for (let i = 0; i < 50; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Simular picos y valles realistas
    let mensajesEnviados = Math.floor(Math.random() * 80) + 20;
    let conversiones = Math.floor(mensajesEnviados * (Math.random() * 0.2 + 0.05));
    
    // Pico al inicio (simulando campaña)
    if (i < 10) {
      mensajesEnviados = Math.floor(Math.random() * 100) + 80;
      conversiones = Math.floor(mensajesEnviados * (Math.random() * 0.15 + 0.08));
    }
    
    // Otro pico a mitad de mes
    if (i > 25 && i < 35) {
      mensajesEnviados = Math.floor(Math.random() * 60) + 30;
      conversiones = Math.floor(mensajesEnviados * (Math.random() * 0.18 + 0.06));
    }
    
    data.push({
      date: `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      mensajesEnviados,
      conversiones,
    });
  }
  return data;
};

const MarketingPerformance = () => {
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('chats');
  const [chartData] = useState(generateDailyData);

  // Calcular totales
  const totalMensajesEnviados = chartData.reduce((sum, d) => sum + d.mensajesEnviados, 0);
  const totalConversiones = chartData.reduce((sum, d) => sum + d.conversiones, 0);
  const tasaConversion = ((totalConversiones / totalMensajesEnviados) * 100).toFixed(2);
  const valorRecuperado = totalConversiones * 5985; // Valor promedio por conversión
  const roas = (valorRecuperado / (totalMensajesEnviados * 15)).toFixed(2); // Costo por mensaje ~15 CLP

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard de Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              01 de octubre - 20 de noviembre, 2025
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
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              oct 01, 2025 - nov 20, 2025
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
              <p className="text-3xl font-semibold text-foreground">{totalMensajesEnviados.toLocaleString()}</p>
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
              <p className="text-3xl font-semibold text-foreground">{formatCurrency(valorRecuperado)}</p>
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
              <p className="text-3xl font-semibold text-foreground">{tasaConversion}%</p>
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
              <p className="text-3xl font-semibold text-foreground">{roas}</p>
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
              <div className="space-y-4">
                {[
                  { name: 'cyber_promo_1', enviados: 456, conversiones: 78, tasa: 17.1 },
                  { name: 'recuperacion_diego', enviados: 312, conversiones: 45, tasa: 14.4 },
                  { name: 'cyber_prosa_final', enviados: 289, conversiones: 38, tasa: 13.1 },
                  { name: 'bienvenida_nueva', enviados: 225, conversiones: 28, tasa: 12.4 },
                ].map((template, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.enviados} enviados • {template.conversiones} conversiones</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-success">{template.tasa}%</p>
                      <p className="text-xs text-muted-foreground">Tasa conv.</p>
                    </div>
                  </div>
                ))}
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
              <div className="space-y-4">
                {[
                  { hora: '10:00 - 12:00', enviados: 423, tasa: 18.2, mejor: true },
                  { hora: '14:00 - 16:00', enviados: 356, tasa: 15.8, mejor: false },
                  { hora: '18:00 - 20:00', enviados: 298, tasa: 14.1, mejor: false },
                  { hora: '08:00 - 10:00', enviados: 205, tasa: 12.3, mejor: false },
                ].map((slot, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${slot.mejor ? 'bg-success/10 border border-success/20' : 'bg-secondary/50'}`}>
                    <div>
                      <p className={`font-medium ${slot.mejor ? 'text-success' : 'text-foreground'}`}>{slot.hora}</p>
                      <p className="text-xs text-muted-foreground">{slot.enviados} mensajes enviados</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${slot.mejor ? 'text-success' : 'text-foreground'}`}>{slot.tasa}%</p>
                      <p className="text-xs text-muted-foreground">Conversión</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MarketingPerformance;

