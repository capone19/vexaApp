// ============================================
// VEXA Admin - Dashboard de Métricas Globales
// ============================================
// Muestra métricas agregadas de TODOS los clientes
// Usa countConversations() para alinearse con el conteo de clientes
// ============================================

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MessageSquare, 
  Users, 
  CalendarCheck, 
  DollarSign, 
  TrendingUp,
  Building2,
  Loader2,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { KPICard } from '@/components/shared/KPICard';
import { externalSupabase } from '@/integrations/supabase/external-client';
import { supabase } from '@/integrations/supabase/client';
import { countConversations } from '@/lib/api/conversation-counter';

interface GlobalMetrics {
  // Métricas de hoy
  todayChats: number;
  todayMessages: number;
  todayBookings: number;
  todayRevenue: number;
  
  // Métricas del período actual (mes)
  periodChats: number;
  periodMessages: number;
  periodBookings: number;
  periodRevenue: number;
  
  // Totales históricos
  totalChats: number;
  totalMessages: number;
  totalBookings: number;
  totalRevenue: number;
  
  // Clientes activos
  activeClients: number;
  totalClients: number;
}

const emptyMetrics: GlobalMetrics = {
  todayChats: 0,
  todayMessages: 0,
  todayBookings: 0,
  todayRevenue: 0,
  periodChats: 0,
  periodMessages: 0,
  periodBookings: 0,
  periodRevenue: 0,
  totalChats: 0,
  totalMessages: 0,
  totalBookings: 0,
  totalRevenue: 0,
  activeClients: 0,
  totalClients: 0,
};

const fetchTenants = async () => {
  const { data: tenantsResponse, error: tenantsError } = await supabase.functions.invoke('admin-list-tenants');
  if (tenantsError) {
    console.error('[AdminDashboard] admin-list-tenants error:', tenantsError.message);
    throw new Error('No se pudo conectar con admin-list-tenants. Verifica que la Edge Function esté desplegada.');
  }
  return (tenantsResponse?.tenants || []) as Array<{ id: string; is_active?: boolean | null }>;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<GlobalMetrics>(emptyMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalMetrics();
  }, []);

  const fetchGlobalMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      
      // Inicio del día de hoy (medianoche)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      // Inicio del mes actual
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

      // ============================================
      // 1. OBTENER LISTA DE TENANTS (Edge Function + fallback directo)
      // ============================================
      const tenants = await fetchTenants();
      const totalClients = tenants.length;
      const activeClients = tenants.filter((t: any) => t.is_active !== false).length;
      
      // Obtener IDs de TODOS los tenants para métricas macro
      const tenantIds = tenants.map((t: any) => t.id);

      console.log('[AdminDashboard] Tenants encontrados:', { totalClients, activeClients, tenantIds });

      // ============================================
      // 2. CONTAR CHATS USANDO countConversations()
      // (Función centralizada con paginación)
      // ============================================
      let globalTodayChats = 0;
      let globalTodayMessages = 0;
      let globalPeriodChats = 0;
      let globalPeriodMessages = 0;
      let globalTotalChats = 0;
      let globalTotalMessages = 0;

      // Procesar en batches de 5 para no saturar
      const BATCH_SIZE = 5;
      for (let i = 0; i < tenantIds.length; i += BATCH_SIZE) {
        const batch = tenantIds.slice(i, i + BATCH_SIZE);
        
        // Ejecutar en paralelo: Total, Mes, Hoy para cada tenant del batch
        const batchPromises = batch.flatMap((tenantId: string) => [
          // Total histórico
          countConversations({ tenantId }),
          // Este mes
          countConversations({ tenantId, startDate: monthStart, endDate: now }),
          // Hoy
          countConversations({ tenantId, startDate: todayStart, endDate: now }),
        ]);

        const results = await Promise.all(batchPromises);

        // Procesar resultados (cada tenant tiene 3 resultados: total, mes, hoy)
        for (let j = 0; j < batch.length; j++) {
          const totalResult = results[j * 3];
          const periodResult = results[j * 3 + 1];
          const todayResult = results[j * 3 + 2];

          globalTotalChats += totalResult.totalConversations;
          globalTotalMessages += totalResult.totalMessages;
          globalPeriodChats += periodResult.totalConversations;
          globalPeriodMessages += periodResult.totalMessages;
          globalTodayChats += todayResult.totalConversations;
          globalTodayMessages += todayResult.totalMessages;
        }
      }

      console.log('[AdminDashboard] Chats contados (centralizado):', {
        globalTodayChats,
        globalTodayMessages,
        globalPeriodChats,
        globalPeriodMessages,
        globalTotalChats,
        globalTotalMessages,
      });

      // ============================================
      // 3. OBTENER TODOS LOS BOOKINGS CON PAGINACIÓN
      // ============================================
      const PAGE_SIZE = 1000;
      let allBookings: Array<{ id: string; price: number | null; created_at: string; event_date: string | null }> = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: bookingsError } = await externalSupabase
          .from('bookings')
          .select('id, price, created_at, event_date')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (bookingsError) {
          console.error('[AdminDashboard] Error fetching bookings page:', bookingsError);
          hasMore = false;
        } else if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allBookings.push(...data);
          offset += data.length;
          if (data.length < PAGE_SIZE) hasMore = false;
        }

        // Límite de seguridad
        if (offset >= 50000) {
          console.warn('[AdminDashboard] Hit bookings safety limit of 50,000');
          hasMore = false;
        }
      }

      console.log('[AdminDashboard] Bookings totales obtenidos:', allBookings.length);

      const totalBookings = allBookings.length;
      const totalRevenue = allBookings.reduce((sum, b) => sum + (b.price || 0), 0);

      // Bookings de hoy (por fecha de creación)
      const todayBookingsData = allBookings.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate >= todayStart;
      });
      
      const todayBookings = todayBookingsData.length;
      const todayRevenue = todayBookingsData.reduce((sum, b) => sum + (b.price || 0), 0);

      // Bookings del mes
      const monthBookingsData = allBookings.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate >= monthStart;
      });
      
      const periodBookings = monthBookingsData.length;
      const periodRevenue = monthBookingsData.reduce((sum, b) => sum + (b.price || 0), 0);

      // ============================================
      // 4. ACTUALIZAR ESTADO
      // ============================================
      setMetrics({
        todayChats: globalTodayChats,
        todayMessages: globalTodayMessages,
        todayBookings,
        todayRevenue,
        periodChats: globalPeriodChats,
        periodMessages: globalPeriodMessages,
        periodBookings,
        periodRevenue,
        totalChats: globalTotalChats,
        totalMessages: globalTotalMessages,
        totalBookings,
        totalRevenue,
        activeClients,
        totalClients,
      });

    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando métricas');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando métricas globales...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Error al cargar métricas</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Global</h1>
          <p className="text-muted-foreground">
            Métricas agregadas de todos los clientes de VEXA
          </p>
        </div>

        {/* Métricas de HOY */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Hoy - {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </CardTitle>
            <CardDescription>Métricas del día actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Chats</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.todayChats}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Mensajes</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.todayMessages}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Agendamientos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics.todayBookings}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.todayRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas del MES */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {format(new Date(), "MMMM yyyy", { locale: es })} (1 - {format(new Date(), "d", { locale: es })})
            </CardTitle>
            <CardDescription>Chats y ventas con actividad este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                title="Total Chats"
                value={metrics.periodChats.toLocaleString()}
                icon={MessageSquare}
                variant="info"
              />
              <KPICard
                title="Total Mensajes"
                value={metrics.periodMessages.toLocaleString()}
                icon={TrendingUp}
                variant="primary"
              />
              <KPICard
                title="Agendamientos"
                value={metrics.periodBookings.toLocaleString()}
                icon={CalendarCheck}
                variant="success"
              />
              <KPICard
                title="Revenue"
                value={formatCurrency(metrics.periodRevenue)}
                icon={DollarSign}
                variant="warning"
              />
            </div>
          </CardContent>
        </Card>

        {/* Totales Históricos y Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Totales Históricos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Totales Históricos</CardTitle>
              <CardDescription>Desde el inicio de VEXA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Total Conversaciones</span>
                </div>
                <span className="text-lg font-bold">{metrics.totalChats.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <span className="text-sm">Total Mensajes</span>
                </div>
                <span className="text-lg font-bold">{metrics.totalMessages.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Total Agendamientos</span>
                </div>
                <span className="text-lg font-bold">{metrics.totalBookings.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  <span className="text-sm">Revenue Total</span>
                </div>
                <span className="text-lg font-bold">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Clientes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Clientes VEXA</CardTitle>
              <CardDescription>Estado de los clientes en la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Building2 className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-4xl font-bold text-primary mb-1">{metrics.activeClients}</p>
                  <p className="text-sm text-muted-foreground">Clientes Activos</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    de {metrics.totalClients} registrados
                  </p>
                </div>
              </div>
              
              {/* Promedio por cliente */}
              {metrics.activeClients > 0 && (
                <div className="border-t pt-4 mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Promedio por cliente (mes)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <p className="text-lg font-semibold">
                        {Math.round(metrics.periodChats / metrics.activeClients)}
                      </p>
                      <p className="text-xs text-muted-foreground">chats</p>
                    </div>
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <p className="text-lg font-semibold">
                        {Math.round(metrics.periodBookings / metrics.activeClients)}
                      </p>
                      <p className="text-xs text-muted-foreground">agendamientos</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
