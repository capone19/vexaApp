import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Loader2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { externalSupabase, ExternalBooking } from '@/integrations/supabase/external-client';
import { supabase } from '@/integrations/supabase/client';
import { externalBookingToAppointment } from '@/lib/external-booking-to-appointment';
import {
  buildPrintBookingPayload,
  sendPrintBookingPayload,
} from '@/lib/print-booking-webhook';
import type { DisplayCurrency } from '@/lib/format-currency';
import { toast } from '@/hooks/use-toast';

interface TenantInfo {
  id: string;
  name: string;
}

const PAGE_SIZE = 25;

const CURRENCIES: DisplayCurrency[] = ['CLP', 'BOB', 'USD'];

function toDisplayCurrency(currency: string | undefined): DisplayCurrency {
  if (currency && CURRENCIES.includes(currency as DisplayCurrency)) {
    return currency as DisplayCurrency;
  }
  return 'CLP';
}

const formatMoney = (value: number, currency: string) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return format(d, "d 'de' MMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
};

const compareByDeliveryDate = (a: ExternalBooking, b: ExternalBooking): number => {
  const dateA = a.estimated_delivery_date;
  const dateB = b.estimated_delivery_date;
  if (!dateA && !dateB) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }
  if (!dateA) return 1;
  if (!dateB) return -1;
  const tA = new Date(dateA + 'T00:00:00').getTime();
  const tB = new Date(dateB + 'T00:00:00').getTime();
  if (tA !== tB) return tB - tA;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export default function AdminEntregas() {
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tenantNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tenants) map[t.id] = t.name;
    return map;
  }, [tenants]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [tenantsResult, bookingsResult] = await Promise.all([
        supabase.functions.invoke('admin-list-tenants'),
        fetchAllBookings(),
      ]);

      if (tenantsResult.error) {
        throw new Error('Error al obtener tenants: ' + tenantsResult.error.message);
      }

      const tenantList = (tenantsResult.data?.tenants || []) as Array<{ id: string; name: string }>;

      setTenants(tenantList.map((t) => ({ id: t.id, name: t.name })));
      setBookings(bookingsResult);
    } catch (err) {
      console.error('[AdminEntregas] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando entregas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllBookings = async (): Promise<ExternalBooking[]> => {
    const FETCH_PAGE = 1000;
    let all: ExternalBooking[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await externalSupabase
        .from('bookings')
        .select('*')
        .order('estimated_delivery_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + FETCH_PAGE - 1);

      if (fetchError) {
        console.error('[AdminEntregas] Fetch error:', fetchError);
        hasMore = false;
      } else if (!data || data.length === 0) {
        hasMore = false;
      } else {
        all.push(...(data as ExternalBooking[]));
        offset += data.length;
        if (data.length < FETCH_PAGE) hasMore = false;
      }

      if (offset >= 50000) {
        console.warn('[AdminEntregas] Safety limit reached');
        hasMore = false;
      }
    }

    return all;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (filterTenant !== 'all') {
      result = result.filter((b) => b.tenant_id === filterTenant);
    }

    if (filterType !== 'all') {
      result = result.filter((b) => b.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.contact_name?.toLowerCase().includes(q) ||
          tenantNameById[b.tenant_id]?.toLowerCase().includes(q) ||
          b.contact_phone?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q) ||
          b.comuna?.toLowerCase().includes(q) ||
          b.region?.toLowerCase().includes(q)
      );
    }

    return [...result].sort(compareByDeliveryDate);
  }, [bookings, filterTenant, filterType, searchQuery, tenantNameById]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTenant, filterType, searchQuery]);

  const handlePrint = useCallback(async (booking: ExternalBooking) => {
    if (booking.type !== 'product') return;
    setPrintingId(booking.id);
    try {
      const apt = externalBookingToAppointment(booking);
      const payload = buildPrintBookingPayload(
        apt,
        booking.tenant_id,
        toDisplayCurrency(booking.currency)
      );
      const result = await sendPrintBookingPayload(payload);
      if (!result.ok) {
        toast(result.toast);
        return;
      }
      toast({
        title: 'Enviado a imprimir',
        description: 'El pedido se envió al webhook de impresión.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setPrintingId(null);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando entregas...</p>
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
            <p className="text-destructive mb-2">Error al cargar entregas</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entregas</h1>
            <p className="text-muted-foreground">
              Cliente, entrega y monto ({filteredBookings.length} registros)
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, teléfono, dirección, comuna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterTenant} onValueChange={setFilterTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los negocios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los negocios</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="product">Productos</SelectItem>
                  <SelectItem value="service">Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {filteredBookings.length} resultado{filteredBookings.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 p-2" />
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha de entrega</TableHead>
                    <TableHead className="text-right">Monto total</TableHead>
                    <TableHead className="w-[130px] text-right">Imprimir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No se encontraron entregas con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBookings.map((booking) => {
                      const isProduct = booking.type === 'product';
                      const apt = externalBookingToAppointment(booking);
                      const sd = apt.shippingData;
                      const deliveryDateStr =
                        sd?.shippingDate ?? booking.estimated_delivery_date ?? null;
                      const timeStr =
                        sd?.estimatedDeliveryTime ?? booking.estimated_delivery_time ?? null;
                      const totalNum = sd?.total ?? apt.price;
                      const totalDisplay =
                        totalNum != null
                          ? formatMoney(Number(totalNum), booking.currency)
                          : '—';
                      const isOpen = expandedId === booking.id;
                      const fullAddress = sd?.address ?? booking.address ?? '';
                      const commune = sd?.commune ?? booking.comuna ?? '';
                      const region = sd?.region ?? booking.region ?? '';
                      const phone = apt.clientPhone || booking.contact_phone || '';
                      const tenantName =
                        tenantNameById[booking.tenant_id] || booking.tenant_id.slice(0, 8);

                      return (
                        <Fragment key={booking.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setExpandedId(isOpen ? null : booking.id)}
                          >
                            <TableCell className="p-2 align-middle">
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  {booking.contact_name || '—'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {tenantName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span>{formatDate(deliveryDateStr)}</span>
                                {timeStr ? (
                                  <span className="text-xs text-muted-foreground">{timeStr}</span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {totalDisplay}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={!isProduct || printingId === booking.id}
                                onClick={() => void handlePrint(booking)}
                                title={
                                  isProduct
                                    ? 'Enviar al webhook de impresión (igual que en calendario)'
                                    : 'Solo disponible para productos'
                                }
                              >
                                {printingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Printer className="h-4 w-4" />
                                )}
                                Imprimir
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-0">
                              <TableCell colSpan={5} className="py-4 px-6">
                                <div className="grid gap-4 text-sm max-w-3xl">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Tenant
                                    </p>
                                    <p className="text-foreground">{tenantName}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Teléfono
                                    </p>
                                    <p className="text-foreground">{phone || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                      Dirección
                                    </p>
                                    <p className="text-foreground whitespace-pre-wrap break-words">
                                      {fullAddress || '—'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                        Comuna
                                      </p>
                                      <p className="text-foreground">{commune || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                        Región
                                      </p>
                                      <p className="text-foreground">{region || '—'}</p>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} de {filteredBookings.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
