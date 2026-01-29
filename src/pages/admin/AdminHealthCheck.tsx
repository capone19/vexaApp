import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ServiceCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error?: string;
}

interface HealthCheckResult {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'down';
  services: ServiceCheck[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    avg_response_time_ms: number;
  };
}

const statusConfig = {
  healthy: {
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2,
    label: 'Healthy',
  },
  degraded: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Degraded',
  },
  down: {
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Down',
  },
};

export default function AdminHealthCheck() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      
      if (error) throw error;
      
      setResult(data);
      setLastCheck(new Date());
      
      if (data.overall_status === 'down') {
        toast.error('Algunos servicios están caídos');
      } else if (data.overall_status === 'degraded') {
        toast.warning('Algunos servicios están lentos');
      } else {
        toast.success('Todos los servicios operativos');
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      toast.error('Error al ejecutar health check');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 60 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      runHealthCheck();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Initial check on mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down') => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={`${config.bgColor} ${config.textColor} ${config.borderColor} gap-1`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Estado de Servicios
            </h1>
            {lastCheck && (
              <p className="text-sm text-muted-foreground mt-1">
                Última verificación: {formatDistanceToNow(lastCheck, { addSuffix: true, locale: es })}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
                Auto-refresh (60s)
              </Label>
            </div>
            
            <Button onClick={runHealthCheck} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Verificar Ahora
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {loading && !result ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : result ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall Status */}
            <Card className={`${statusConfig[result.overall_status].borderColor} border-2`}>
              <CardContent className="pt-6 text-center">
                <div className={`w-16 h-16 rounded-full ${statusConfig[result.overall_status].color} mx-auto flex items-center justify-center mb-3`}>
                  {(() => {
                    const Icon = statusConfig[result.overall_status].icon;
                    return <Icon className="h-8 w-8 text-white" />;
                  })()}
                </div>
                <p className="text-2xl font-bold">
                  {result.summary.healthy}/{result.summary.total}
                </p>
                <p className="text-sm text-muted-foreground">Servicios Healthy</p>
              </CardContent>
            </Card>

            {/* Average Response Time */}
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <p className="text-2xl font-bold">
                  {result.summary.avg_response_time_ms}ms
                </p>
                <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
              </CardContent>
            </Card>

            {/* Uptime Indicator */}
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {Math.round((result.summary.healthy / result.summary.total) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Disponibilidad</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !result ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : result ? (
              <div className="divide-y">
                {result.services.map((service) => (
                  <div 
                    key={service.name} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      {service.error && (
                        <p className="text-sm text-destructive mt-1">{service.error}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(service.status)}
                      
                      <span className={`text-sm font-mono ${
                        service.status === 'down' 
                          ? 'text-muted-foreground' 
                          : service.response_time_ms >= 500 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                      }`}>
                        {service.status === 'down' ? '---' : `${service.response_time_ms}ms`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay datos disponibles
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Healthy (&lt;500ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Degraded (≥500ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Down (error/timeout)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
