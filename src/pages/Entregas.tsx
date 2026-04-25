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
  Package,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { externalSupabase, ExternalBooking } from '@/integrations/supabase/external-client';
import { externalBookingToAppointment } from '@/lib/external-booking-to-appointment';
import {
  buildPrintBookingPayload,
  sendPrintBookingPayload,
} from '@/lib/print-booking-webhook';
import type { DisplayCurrency } from '@/lib/format-currency';
import { toast } from '@/hooks/use-toast';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';

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

interface EditForm {
  contact_name: string;
  contact_phone: string;
  address: string;
  comuna: string;
  region: string;
  estimated_delivery_date: string;
  estimated_delivery_time: string;
  notes: string;
  total: string;
}

function getEffectiveTotal(b: ExternalBooking): number | null {
  const meta = b.metadata as Record<string, unknown> | null;
  const metaTotal = meta?.total ?? meta?.total_pedido;
  if (metaTotal != null) return Number(metaTotal);
  return b.price ?? null;
}

function bookingToForm(b: ExternalBooking): EditForm {
  const effectiveTotal = getEffectiveTotal(b);
  return {
    contact_name: b.contact_name ?? '',
    contact_phone: b.contact_phone ?? '',
    address: b.address ?? '',
    comuna: b.comuna ?? '',
    region: b.region ?? '',
    estimated_delivery_date: b.estimated_delivery_date ?? '',
    estimated_delivery_time: b.estimated_delivery_time ?? '',
    notes: b.notes ?? '',
    total: effectiveTotal != null ? String(effectiveTotal) : '',
  };
}

export default function Entregas() {
  const { tenantId, tenantCurrency } = useEffectiveTenant();

  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit dialog state
  const [editingBooking, setEditingBooking] = useState<ExternalBooking | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);

    try {
      const FETCH_PAGE = 1000;
      let all: ExternalBooking[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await externalSupabase
          .from('bookings')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('estimated_delivery_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + FETCH_PAGE - 1);

        if (fetchError) {
          console.error('[Entregas] Fetch error:', fetchError);
          hasMore = false;
        } else if (!data || data.length === 0) {
          hasMore = false;
        } else {
          all.push(...(data as ExternalBooking[]));
          offset += data.length;
          if (data.length < FETCH_PAGE) hasMore = false;
        }

        if (offset >= 50000) {
          console.warn('[Entregas] Safety limit reached');
          hasMore = false;
        }
      }

      setBookings(all);
    } catch (err) {
      console.error('[Entregas] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando entregas');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId, fetchData]);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (filterType !== 'all') {
      result = result.filter((b) => b.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.contact_name?.toLowerCase().includes(q) ||
          b.contact_phone?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q) ||
          b.comuna?.toLowerCase().includes(q) ||
          b.region?.toLowerCase().includes(q)
      );
    }

    return [...result].sort(compareByDeliveryDate);
  }, [bookings, filterType, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  const handlePrint = useCallback(
    async (booking: ExternalBooking) => {
      if (booking.type !== 'product') return;
      setPrintingId(booking.id);
      try {
        const apt = externalBookingToAppointment(booking);
        const currency = toDisplayCurrency(booking.currency ?? tenantCurrency);
        const payload = buildPrintBookingPayload(apt, booking.tenant_id, currency);
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
    },
    [tenantCurrency]
  );

  const openEditDialog = useCallback((booking: ExternalBooking, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBooking(booking);
    setEditForm(bookingToForm(booking));
  }, []);

  const closeEditDialog = useCallback(() => {
    if (isSaving) return;
    setEditingBooking(null);
    setEditForm(null);
  }, [isSaving]);

  const handleSave = useCallback(async () => {
    if (!editingBooking || !editForm) return;
    setIsSaving(true);
    try {
      const newTotal = editForm.total.trim() !== '' ? Number(editForm.total.trim()) : null;

      // If metadata already had a total key, keep it in sync
      const meta = editingBooking.metadata as Record<string, unknown> | null;
      const hasMetaTotal = meta != null && ('total' in meta || 'total_pedido' in meta);
      const updatedMetadata = hasMetaTotal && newTotal != null
        ? { ...meta, total: newTotal, ...(meta?.total_pedido != null ? { total_pedido: newTotal } : {}) }
        : editingBooking.metadata;

      const patch: Partial<ExternalBooking> = {
        contact_name: editForm.contact_name.trim() || editingBooking.contact_name,
        contact_phone: editForm.contact_phone.trim() || null,
        address: editForm.address.trim() || null,
        comuna: editForm.comuna.trim() || null,
        region: editForm.region.trim() || null,
        estimated_delivery_date: editForm.estimated_delivery_date.trim() || null,
        estimated_delivery_time: editForm.estimated_delivery_time.trim() || null,
        notes: editForm.notes.trim() || null,
        ...(newTotal != null ? { price: newTotal } : {}),
        ...(hasMetaTotal ? { metadata: updatedMetadata } : {}),
      };

      const { error: updateError } = await externalSupabase
        .from('bookings')
        .update(patch)
        .eq('id', editingBooking.id);

      if (updateError) {
        toast({
          title: 'Error al guardar',
          description: updateError.message,
          variant: 'destructive',
        });
        return;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBooking.id ? { ...b, ...patch } : b
        )
      );

      toast({
        title: 'Pedido actualizado',
        description: 'Los datos de entrega se guardaron correctamente.',
      });
      setEditingBooking(null);
      setEditForm(null);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingBooking, editForm]);

  const updateField = useCallback(
    <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
      setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando entregas...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Entregas"
          subtitle={`Cliente, entrega y monto (${filteredBookings.length} registros)`}
          actions={
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, teléfono, dirección, comuna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

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

        {/* Empty state */}
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="text-foreground font-medium">Sin entregas</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterType !== 'all'
                    ? 'No se encontraron entregas con los filtros aplicados.'
                    : 'Aún no hay entregas registradas.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                      <TableHead className="w-[220px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.map((booking) => {
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
                              <span className="font-medium">
                                {booking.contact_name || '—'}
                              </span>
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
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={(e) => openEditDialog(booking, e)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  disabled={!isProduct || printingId === booking.id}
                                  onClick={() => void handlePrint(booking)}
                                  title={
                                    isProduct
                                      ? 'Enviar al webhook de impresión'
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
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expanded row */}
                          {isOpen && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-0">
                              <TableCell colSpan={5} className="py-4 px-6">
                                <div className="grid gap-4 text-sm max-w-3xl">
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
                                  {booking.notes && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                        Notas
                                      </p>
                                      <p className="text-foreground whitespace-pre-wrap break-words">
                                        {booking.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} de{' '}
              {filteredBookings.length}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar datos de entrega
            </DialogTitle>
          </DialogHeader>

          {editForm && (
            <div className="grid gap-5 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">Nombre del cliente</Label>
                <Input
                  id="edit-name"
                  value={editForm.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={editForm.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-address">Dirección</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Av. Ejemplo 123, Depto 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-comuna">Comuna</Label>
                  <Input
                    id="edit-comuna"
                    value={editForm.comuna}
                    onChange={(e) => updateField('comuna', e.target.value)}
                    placeholder="Santiago"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-region">Región</Label>
                  <Input
                    id="edit-region"
                    value={editForm.region}
                    onChange={(e) => updateField('region', e.target.value)}
                    placeholder="Metropolitana"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-date">Fecha de entrega</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editForm.estimated_delivery_date}
                    onChange={(e) => updateField('estimated_delivery_date', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-time">Horario de entrega</Label>
                  <Input
                    id="edit-time"
                    value={editForm.estimated_delivery_time}
                    onChange={(e) => updateField('estimated_delivery_time', e.target.value)}
                    placeholder="16:00-22:00"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-total">Monto total ({editingBooking?.currency || 'CLP'})</Label>
                <Input
                  id="edit-total"
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.total}
                  onChange={(e) => updateField('total', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Indicaciones adicionales..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={closeEditDialog}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
