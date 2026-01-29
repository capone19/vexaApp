// ============================================
// VEXA - Panel Admin de Clientes
// ============================================
// IMPORTANTE: Usa la función centralizada countConversationsForBillingPeriod
// para garantizar que el conteo de chats sea consistente con Facturación.
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { countConversationsForBillingPeriod } from '@/lib/api/conversation-counter';
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, CheckCircle, XCircle, Copy, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { DisplayCurrency } from '@/lib/format-currency';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean | null;
  whatsapp_phone_id: string | null;
  created_at: string | null;
  owner_email: string | null;
  display_currency?: DisplayCurrency;
  chat_count: number;      // Viene del backend (puede estar desactualizado)
  chat_count_real?: number; // Calculado en frontend con función centralizada
  chat_limit: number;
  chats_extra?: number;    // Chats por encima del límite del plan
  cobro_extra_usd?: number; // Cobro asociado en USD ($0.30 por chat extra)
  subscriptions: {
    price_usd: number;
    status: string;
  }[] | null;
}

export default function AdminClients() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRealCounts, setIsLoadingRealCounts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingCurrencyId, setUpdatingCurrencyId] = useState<string | null>(null);

  // Cargar tenants del backend
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        
        // Call the edge function to list all tenants (bypasses RLS)
        const { data, error: fnError } = await supabase.functions.invoke('admin-list-tenants');
        
        if (fnError) {
          throw fnError;
        }

        const tenantsData = data?.tenants || [];
        setTenants(tenantsData);
        
        // Cargar conteos reales después de obtener los tenants
        if (tenantsData.length > 0) {
          loadRealChatCounts(tenantsData);
        }
      } catch (err) {
        console.error('[AdminClients] Error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar clientes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  // Cargar conteos reales usando la función centralizada
  // IMPORTANTE: El período se calcula basado en la fecha de creación de cada tenant
  const loadRealChatCounts = async (tenantsToLoad: Tenant[]) => {
    setIsLoadingRealCounts(true);
    
    try {
      // Cargar conteos en paralelo para todos los tenants
      const countPromises = tenantsToLoad.map(async (tenant) => {
        try {
          // Pasar la fecha de creación del tenant para calcular el período correcto
          const tenantCreatedAt = tenant.created_at ? new Date(tenant.created_at) : undefined;
          const result = await countConversationsForBillingPeriod(
            tenant.id,
            undefined, // periodStart - se calculará basado en created_at
            undefined, // periodEnd - se calculará basado en created_at
            tenantCreatedAt
          );
          return { tenantId: tenant.id, count: result.totalConversations };
        } catch (err) {
          console.warn(`[AdminClients] Error counting for ${tenant.id}:`, err);
          return { tenantId: tenant.id, count: tenant.chat_count }; // Fallback al valor del backend
        }
      });

      const results = await Promise.all(countPromises);
      
      // Tarifa por chat extra: $0.30 USD
      const TARIFA_CHAT_EXTRA_USD = 0.30;
      
      // Actualizar los tenants con los conteos reales y cálculos de exceso
      setTenants(prev => prev.map(tenant => {
        const realCount = results.find(r => r.tenantId === tenant.id);
        const chatCountReal = realCount?.count ?? tenant.chat_count;
        
        // Calcular chats extra (solo si excede el límite)
        const chatsExtra = Math.max(0, chatCountReal - tenant.chat_limit);
        const cobroExtraUsd = chatsExtra * TARIFA_CHAT_EXTRA_USD;
        
        return {
          ...tenant,
          chat_count_real: chatCountReal,
          chats_extra: chatsExtra,
          cobro_extra_usd: cobroExtraUsd,
        };
      }));

      console.log('[AdminClients] ✓ Real chat counts loaded:', results);
    } catch (err) {
      console.error('[AdminClients] Error loading real counts:', err);
    } finally {
      setIsLoadingRealCounts(false);
    }
  };

  // Refrescar conteos manualmente
  const handleRefreshCounts = () => {
    if (tenants.length > 0) {
      loadRealChatCounts(tenants);
      toast.success('Actualizando conteos...');
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'enterprise':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('ID copiado al portapapeles');
  };

  const getChatUsagePercentage = (count: number, limit: number) => {
    return Math.min((count / limit) * 100, 100);
  };

  const getChatUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleImpersonate = async (tenant: Tenant) => {
    if (impersonatingId) return; // Prevenir doble clic
    
    setImpersonatingId(tenant.id);
    
    const success = await startImpersonation({
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      slug: tenant.slug,
      currency: tenant.display_currency,
    });

    if (success) {
      // Redirigir al dashboard del cliente
      navigate('/');
    }
    
    setImpersonatingId(null);
  };

  // Handler para cambiar la divisa del tenant
  const handleChangeCurrency = async (tenantId: string, currency: DisplayCurrency) => {
    setUpdatingCurrencyId(tenantId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-tenant-currency', {
        body: { tenantId, currency }
      });
      
      if (error) throw error;
      
      // Actualizar estado local
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, display_currency: currency } : t
      ));
      
      toast.success(`Divisa actualizada a ${currency}`);
    } catch (err) {
      console.error('[AdminClients] Update currency error:', err);
      toast.error('Error al cambiar la divisa');
    } finally {
      setUpdatingCurrencyId(null);
    }
  };

  // Handler para toggle de estado activo/inactivo
  const handleToggleStatus = async (tenantId: string, newStatus: boolean) => {
    setTogglingId(tenantId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-toggle-tenant-status', {
        body: { tenantId, isActive: newStatus }
      });
      
      if (error) throw error;
      
      // Actualizar estado local
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, is_active: newStatus } : t
      ));
      
      toast.success(newStatus ? 'Cliente activado' : 'Cliente desactivado');
    } catch (err) {
      console.error('[AdminClients] Toggle status error:', err);
      toast.error('Error al cambiar estado del cliente');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Todos los clientes registrados en la plataforma
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lista de Clientes ({tenants.length})
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCounts}
                    disabled={isLoadingRealCounts}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingRealCounts ? 'animate-spin' : ''}`} />
                    {isLoadingRealCounts ? 'Actualizando...' : 'Actualizar conteos'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recalcular conteos de conversaciones (período actual)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                {error}
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Acción</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tenant ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Divisa</TableHead>
                      <TableHead>Uso de Chats</TableHead>
                      <TableHead>Chats Extra</TableHead>
                      <TableHead>Cobro Extra</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Creado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => {
                      // USAR CONTEO REAL si está disponible, sino el del backend
                      const chatCount = tenant.chat_count_real ?? tenant.chat_count;
                      const usagePercentage = getChatUsagePercentage(chatCount, tenant.chat_limit);
                      const isCurrentlyImpersonating = impersonatingId === tenant.id;
                      
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleImpersonate(tenant)}
                                  disabled={!!impersonatingId}
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  {isCurrentlyImpersonating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver como cliente</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[120px]">
                                {tenant.id.slice(0, 8)}...
                              </code>
                              <button
                                onClick={() => copyToClipboard(tenant.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copiar ID completo"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tenant.owner_email || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                              {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                            </Badge>
                          </TableCell>
                          {/* Divisa */}
                          <TableCell>
                            <Select
                              value={tenant.display_currency || 'USD'}
                              onValueChange={(val) => handleChangeCurrency(tenant.id, val as DisplayCurrency)}
                              disabled={updatingCurrencyId === tenant.id}
                            >
                              <SelectTrigger className="w-[90px] h-8">
                                {updatingCurrencyId === tenant.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="CLP">CLP</SelectItem>
                                <SelectItem value="BOB">BOB</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-[140px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className={getChatUsageColor(usagePercentage)}>
                                  {isLoadingRealCounts && tenant.chat_count_real === undefined ? (
                                    <span className="flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      {tenant.chat_count}
                                    </span>
                                  ) : (
                                    `${chatCount} / ${tenant.chat_limit}`
                                  )}
                                </span>
                                <span className="text-muted-foreground">
                                  {usagePercentage.toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={usagePercentage} 
                                className="h-1.5"
                              />
                            </div>
                          </TableCell>
                          {/* Chats Extra */}
                          <TableCell>
                            {isLoadingRealCounts && tenant.chats_extra === undefined ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (tenant.chats_extra ?? 0) > 0 ? (
                              <Badge variant="destructive" className="font-mono">
                                +{tenant.chats_extra}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">0</span>
                            )}
                          </TableCell>
                          {/* Cobro Extra */}
                          <TableCell>
                            {isLoadingRealCounts && tenant.cobro_extra_usd === undefined ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (tenant.cobro_extra_usd ?? 0) > 0 ? (
                              <span className="font-semibold text-destructive">
                                ${tenant.cobro_extra_usd?.toFixed(2)} USD
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">$0.00</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={tenant.is_active !== false}
                                onCheckedChange={(checked) => handleToggleStatus(tenant.id, checked)}
                                disabled={togglingId === tenant.id}
                              />
                              {togglingId === tenant.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <span className={tenant.is_active !== false ? 'text-green-600 text-sm' : 'text-destructive text-sm'}>
                                  {tenant.is_active !== false ? 'Activo' : 'Inactivo'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant.whatsapp_phone_id ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Conectado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <XCircle className="h-4 w-4" />
                                No conectado
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tenant.created_at
                              ? format(new Date(tenant.created_at), 'd MMM yyyy', { locale: es })
                              : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
