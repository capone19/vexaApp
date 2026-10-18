// ============================================
// VEXA - Marketing Performance Dashboard
// ============================================
// Dashboard de rendimiento de campañas de plantillas WhatsApp
// Métricas de envíos, conversiones y ROAS por período de facturación
// ============================================

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, BarChart3, MessageSquare, TrendingUp, DollarSign, Target } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PeriodFilter, type PeriodPreset } from '@/components/shared/PeriodFilter';
import { useBillingPeriod } from '@/hooks/use-billing-period';
import { useMarketingPerformance } from '@/hooks/use-marketing-performance';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';
import { formatCurrency, type DisplayCurrency } from '@/lib/format-currency';

const MarketingPerformance = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>('current');
  const { tenantCurrency } = useEffectiveTenant();
  
  // Obtener fechas del período de facturación
  const { startDate, endDate, periodInfo, isLoading: loadingPeriod } = useBillingPeriod({
    selectedPeriod,
  });

  // Obtener métricas de performance
  const {
    totalMessagesSent,
    totalCostUsd,
    totalRevenue,
    conversions,
    uniqueRecipients,
    conversionRate,
    roas,
    dailyData,
    topTemplates,
    isLoading: loadingMetrics,
    error,
  } = useMarketingPerformance({
    startDate,
    endDate,
  });

  const isLoading = loadingPeriod || loadingMetrics;
  const hasData = totalMessagesSent > 0;

  // Formatear fechas del período para el header
  const periodLabel = periodInfo 
    ? `${format(periodInfo.current.start, 'd MMM', { locale: es })} - ${format(periodInfo.current.end, 'd MMM, yyyy', { locale: es })}`
    : '';

  // Formatear datos del gráfico para mostrar
  const chartData = dailyData.map(d => ({
    ...d,
    dateLabel: format(new Date(d.date), 'd MMM', { locale: es }),
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Performance de Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPeriod === 'all' ? 'Todo el historial' : periodLabel}
            </p>
          </div>
          <PeriodFilter
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            periodInfo={periodInfo}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mensajes Enviados */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Mensajes Enviados</span>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de plantillas WhatsApp enviadas</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <>
                  <p className="text-3xl font-semibold text-foreground">
                    {totalMessagesSent.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gasto: ${totalCostUsd.toFixed(2)} USD
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ventas Recuperadas */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Ventas Recuperadas</span>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ventas atribuidas a envíos de plantillas (ventana de 7 días)</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <>
                  <p className="text-3xl font-semibold text-foreground">
                    {formatCurrency(totalRevenue, tenantCurrency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversions} ventas de {uniqueRecipients} destinatarios
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tasa de Conversión */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Tasa de Conversión</span>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Porcentaje de destinatarios que compraron</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-semibold text-foreground">
                    {conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversions} / {uniqueRecipients} destinatarios
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* ROAS */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">ROAS</span>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retorno por cada dólar gastado en mensajes</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <>
                  <p className="text-3xl font-semibold text-foreground">
                    {roas.toFixed(1)}x
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(totalRevenue, tenantCurrency)} / ${totalCostUsd.toFixed(2)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolución */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Evolución del Período
            </CardTitle>
            <CardDescription>
              Mensajes enviados y conversiones por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : hasData ? (
              <>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))]"></div>
                    <span className="text-sm text-muted-foreground">Mensajes Enviados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-sm text-muted-foreground">Conversiones</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="dateLabel" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
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
                      dataKey="messagesSent" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                      name="Mensajes Enviados"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversions" 
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
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">Sin datos de campañas</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Cuando envíes plantillas de WhatsApp desde Marketing, aquí verás las métricas de rendimiento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Plantillas - Solo si hay datos */}
        {hasData && topTemplates.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Top Plantillas por Conversiones
              </CardTitle>
              <CardDescription>
                Plantillas con mejor rendimiento en el período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTemplates.map((template, index) => (
                  <div 
                    key={template.templateId}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{template.templateName}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.sent} enviados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="font-medium text-foreground">{template.conversions}</p>
                        <p className="text-xs text-muted-foreground">ventas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatCurrency(template.revenue, tenantCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">ingresos</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-medium text-primary">
                          {template.conversionRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">conversión</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default MarketingPerformance;
