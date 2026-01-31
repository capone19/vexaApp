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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Building2, CheckCircle, XCircle, Copy, Eye, RefreshCw, Sparkles, FileText } from 'lucide-react';
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
  vexa_ads_enabled: boolean | null;
  whatsapp_phone_id: string | null;
  created_at: string | null;
  owner_email: string | null;
  display_currency?: DisplayCurrency;
  chat_count: number;      // Viene del backend (puede estar desactualizado)
  chat_count_real?: number; // Calculado en frontend con función centralizada
  chat_limit: number;
  chats_extra?: number;    // Chats por encima del límite del plan
  cobro_extra_usd?: number; // Cobro asociado en USD ($0.30 por chat extra)
  addons?: string[];       // IDs de addons activos
  subscriptions: {
    price_usd: number;
    status: string;
  }[] | null;
}

// Definición de reportes para gestión
const ALL_REPORTS = [
  { id: 'agent-performance', title: 'Rendimiento del agente', includedIn: ['basic', 'pro', 'enterprise'] },
  { id: 'conversational-metrics', title: 'Métricas conversacionales', includedIn: ['pro', 'enterprise'] },
  { id: 'unconverted-leads', title: 'Clientes no convertidos', includedIn: ['enterprise'] },
  { id: 'converted-sales', title: 'Clientes convertidos', includedIn: [] },
  { id: 'meta-ads', title: 'Marketing / Meta Ads', includedIn: [] },
  { id: 'ad-advisor', title: 'Asesor publicitario', includedIn: [] },
];

// Cuenta reportes incluidos según el plan
function countIncludedReports(plan: string): number {
  return ALL_REPORTS.filter(r => r.includedIn.includes(plan.toLowerCase())).length;
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
  const [togglingVexaAdsId, setTogglingVexaAdsId] = useState<string | null>(null);
  const [updatingCurrencyId, setUpdatingCurrencyId] = useState<string | null>(null);
  
  // Estado para dialog de reportes
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedTenantForReports, setSelectedTenantForReports] = useState<Tenant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isSavingAddons, setIsSavingAddons] = useState(false);

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
      createdAt: tenant.created_at || undefined,  // Para cálculo correcto del período de facturación
    });

    if (success) {
      // Redirigir al dashboard del cliente
      navigate('/');
    }
    
    setImpersonatingId(null);
  };

  // Calcular próximo cobro basado en fecha de creación del tenant
  const getNextBillingDate = (createdAt: string | null): Date | null => {
    if (!createdAt) return null;
    
    const created = new Date(createdAt);
    const now = new Date();
    const dayOfMonth = created.getDate();
    
    // Calcular próximo aniversario mensual
    let nextBilling = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    
    // Si ya pasó ese día este mes, es el próximo mes
    if (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    return nextBilling;
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

  // Handler para toggle de VEXA Ads
  const handleToggleVexaAds = async (tenantId: string, enabled: boolean) => {
    setTogglingVexaAdsId(tenantId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-toggle-vexa-ads', {
        body: { tenantId, enabled }
      });
      
      if (error) throw error;
      
      // Actualizar estado local
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, vexa_ads_enabled: enabled } : t
      ));
      
      toast.success(enabled ? 'VEXA Ads activado' : 'VEXA Ads desactivado');
    } catch (err) {
      console.error('[AdminClients] Toggle VEXA Ads error:', err);
      toast.error('Error al cambiar estado de VEXA Ads');
    } finally {
      setTogglingVexaAdsId(null);
    }
  };

  // Abrir dialog de reportes
  const openReportDialog = (tenant: Tenant) => {
    setSelectedTenantForReports(tenant);
    // Reportes incluidos por plan + addons activos
    const includedByPlan = ALL_REPORTS
      .filter(r => r.includedIn.includes(tenant.plan.toLowerCase()))
      .map(r => r.id);
    const activeAddons = tenant.addons || [];
    // Unir y eliminar duplicados
    const combined = [...new Set([...includedByPlan, ...activeAddons])];
    setSelectedAddons(combined);
    setReportDialogOpen(true);
  };

  // Guardar cambios de addons
  const handleSaveAddons = async () => {
    if (!selectedTenantForReports) return;
    
    setIsSavingAddons(true);
    try {
      // Filtrar solo los que NO están incluidos por plan (esos son los addons manuales)
      const includedByPlan = ALL_REPORTS
        .filter(r => r.includedIn.includes(selectedTenantForReports.plan.toLowerCase()))
        .map(r => r.id);
      
      const addonsToSave = selectedAddons.filter(id => !includedByPlan.includes(id));
      
      const { error } = await supabase.functions.invoke('admin-manage-tenant-addons', {
        body: { 
          tenantId: selectedTenantForReports.id,
          addons: addonsToSave,
        }
      });
      
      if (error) throw error;
      
      // Actualizar estado local
      setTenants(prev => prev.map(t => 
        t.id === selectedTenantForReports.id 
          ? { ...t, addons: addonsToSave }
          : t
      ));
      
      toast.success('Reportes actualizados correctamente');
      setReportDialogOpen(false);
    } catch (err) {
      console.error('[AdminClients] Save addons error:', err);
      toast.error('Error al guardar reportes');
    } finally {
      setIsSavingAddons(false);
    }
  };

  // Toggle individual addon
  const toggleAddon = (addonId: string) => {
    if (!selectedTenantForReports) return;
    
    // No permitir desactivar los incluidos por plan
    const includedByPlan = ALL_REPORTS
      .filter(r => r.includedIn.includes(selectedTenantForReports.plan.toLowerCase()))
      .map(r => r.id);
    
    if (includedByPlan.includes(addonId)) return; // No se puede desactivar
    
    setSelectedAddons(prev => 
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
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
                      <TableHead>VEXA Ads</TableHead>
                      <TableHead>Reportes</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Próx. Cobro</TableHead>
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
                          {/* VEXA Ads Toggle */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={tenant.vexa_ads_enabled === true}
                                onCheckedChange={(checked) => handleToggleVexaAds(tenant.id, checked)}
                                disabled={togglingVexaAdsId === tenant.id}
                              />
                              {togglingVexaAdsId === tenant.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <span className={tenant.vexa_ads_enabled === true ? 'text-primary text-sm flex items-center gap-1' : 'text-muted-foreground text-sm'}>
                                  {tenant.vexa_ads_enabled === true ? (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      Activo
                                    </>
                                  ) : 'Off'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {/* Reportes */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {countIncludedReports(tenant.plan)}/{ALL_REPORTS.length}
                                {(tenant.addons?.length || 0) > 0 && (
                                  <span className="text-primary ml-1">+{tenant.addons?.length}</span>
                                )}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => openReportDialog(tenant)}
                              >
                                <FileText className="h-3 w-3" />
                                Gestionar
                              </Button>
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
                          <TableCell>
                            {tenant.created_at ? (
                              <span className="text-primary font-medium">
                                {format(getNextBillingDate(tenant.created_at)!, 'd MMM', { locale: es })}
                              </span>
                            ) : '-'}
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

      {/* Dialog de gestión de reportes */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reportes de {selectedTenantForReports?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTenantForReports && (
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground mb-4">
                Plan actual: <Badge variant="outline">{selectedTenantForReports.plan}</Badge>
              </div>
              
              <div className="space-y-3">
                {ALL_REPORTS.map((report) => {
                  const isIncludedInPlan = report.includedIn.includes(selectedTenantForReports.plan.toLowerCase());
                  const isChecked = selectedAddons.includes(report.id);
                  
                  return (
                    <div key={report.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={report.id}
                        checked={isChecked}
                        onCheckedChange={() => toggleAddon(report.id)}
                        disabled={isIncludedInPlan}
                      />
                      <label
                        htmlFor={report.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                      >
                        {report.title}
                      </label>
                      {isIncludedInPlan ? (
                        <Badge variant="secondary" className="text-xs">
                          En plan
                        </Badge>
                      ) : isChecked ? (
                        <Badge className="bg-success/10 text-success border-success/30 text-xs">
                          Activo
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Manual
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAddons} disabled={isSavingAddons}>
              {isSavingAddons ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
