import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment } from '@/lib/types';
import { formatCurrency, type DisplayCurrency } from '@/lib/format-currency';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_PRINT_WEBHOOK =
  'https://n8ninnovatec-n8n.t0bgq1.easypanel.host/webhook/imprimir';

export type PrintBookingPayload = {
  timestamp_cliente: string;
  booking_id: string;
  type: Appointment['type'];
  chat_id: string | null;
  notes: string | null;
  status: Appointment['status'];
  created_at_booking: string;
  tenant_id: string | null;
  compra: {
    client_name: string;
    client_phone: string | null;
    client_email: string | null;
    service: string;
    purchase_date_iso: string;
    purchase_date_formatted: string;
    price: number | null;
    currency: string | null;
    subtotal: number | null;
    shipping_cost: number | null;
    total: number | null;
    subtotal_display: string | null;
    shipping_cost_display: string | null;
    total_display: string | null;
    source: Appointment['source'];
    source_raw: string | null;
  };
  despacho: {
    address: string | null;
    commune: string | null;
    region: string | null;
    email: string | null;
    shippingCost: number | null;
    subtotal: number | null;
    total: number | null;
    shippingDate: string | null;
    estimatedDeliveryTime: string | null;
    paymentMethod: string | null;
    dispatch_label: string | null;
  };
};

export function buildPrintBookingPayload(
  apt: Appointment,
  tenantId: string | null,
  tenantCurrencyFallback: DisplayCurrency
): PrintBookingPayload {
  const sd = apt.shippingData;

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    const currencyToUse = (currency || tenantCurrencyFallback) as DisplayCurrency;
    return formatCurrency(price, currencyToUse);
  };

  let dispatch_label: string | null = null;
  if (sd?.shippingDate) {
    const d = sd.shippingDate;
    const parsed = parseISO(d.length === 10 ? `${d}T12:00:00` : d);
    const label = isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : d;
    dispatch_label = sd.estimatedDeliveryTime ? `${label} (${sd.estimatedDeliveryTime})` : label;
  } else if (sd?.estimatedDeliveryTime) {
    dispatch_label = sd.estimatedDeliveryTime;
  }

  const subtotalNum = sd?.subtotal ?? apt.price ?? null;
  const shippingCostNum = sd?.shippingCost ?? null;
  const totalNum = sd?.total ?? apt.price ?? null;

  return {
    timestamp_cliente: new Date().toISOString(),
    booking_id: apt.id,
    type: apt.type,
    chat_id: apt.chatId ?? null,
    notes: apt.notes ?? null,
    status: apt.status,
    created_at_booking: apt.createdAt.toISOString(),
    tenant_id: tenantId ?? null,
    compra: {
      client_name: apt.clientName,
      client_phone: apt.clientPhone ?? null,
      client_email: apt.clientEmail ?? null,
      service: apt.service,
      purchase_date_iso: apt.datetime.toISOString(),
      purchase_date_formatted: format(apt.datetime, "d 'de' MMMM, yyyy", { locale: es }),
      price: apt.price ?? null,
      currency: apt.currency ?? null,
      subtotal: subtotalNum,
      shipping_cost: shippingCostNum,
      total: totalNum,
      subtotal_display: formatPrice(sd?.subtotal ?? apt.price ?? undefined, apt.currency) ?? null,
      shipping_cost_display:
        sd?.shippingCost != null ? formatPrice(sd.shippingCost, apt.currency) : null,
      total_display:
        formatPrice((sd?.total ?? apt.price) as number | undefined, apt.currency) ?? null,
      source: apt.source,
      source_raw: apt.sourceRaw ?? null,
    },
    despacho: {
      address: sd?.address ?? null,
      commune: sd?.commune ?? null,
      region: sd?.region ?? null,
      email: sd?.email ?? null,
      shippingCost: sd?.shippingCost ?? null,
      subtotal: sd?.subtotal ?? null,
      total: sd?.total ?? null,
      shippingDate: sd?.shippingDate ?? null,
      estimatedDeliveryTime: sd?.estimatedDeliveryTime ?? null,
      paymentMethod: sd?.paymentMethod ?? null,
      dispatch_label,
    },
  };
}

export type SendPrintBookingResult =
  | { ok: true }
  | {
      ok: false;
      toast: { title: string; description: string; variant?: 'destructive' };
    };

/** Mismo flujo que el calendario: POST directo al webhook, luego proxy print_imprimir. */
export async function sendPrintBookingPayload(
  payload: PrintBookingPayload
): Promise<SendPrintBookingResult> {
  const PRINT_WEBHOOK =
    import.meta.env.VITE_N8N_PRINT_WEBHOOK_URL ?? DEFAULT_PRINT_WEBHOOK;

  let ok = false;
  let errMsg = '';

  try {
    const res = await fetch(PRINT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) ok = true;
    else errMsg = `Webhook directo: HTTP ${res.status}`;
  } catch {
    errMsg = 'Webhook directo no disponible (CORS o red).';
  }

  if (!ok) {
    const { data, error } = await supabase.functions.invoke('webhook-n8n-proxy', {
      body: { __vexa_action: 'print_imprimir', ...payload },
    });

    if (error) {
      return {
        ok: false,
        toast: {
          title: 'Error al enviar a imprimir',
          description: `${errMsg} ${error.message}`.trim(),
          variant: 'destructive',
        },
      };
    }

    const result = data as {
      success?: boolean;
      status?: number;
      error?: string;
    } | null;
    if (!result?.success) {
      return {
        ok: false,
        toast: {
          title: 'No se pudo completar la impresión',
          description:
            result?.error ||
            (result?.status
              ? `n8n respondió HTTP ${result.status}`
              : 'Redespliega webhook-n8n-proxy (incluye ruta print_imprimir) o print-booking-proxy.'),
          variant: 'destructive',
        },
      };
    }
  }

  return { ok: true };
}
