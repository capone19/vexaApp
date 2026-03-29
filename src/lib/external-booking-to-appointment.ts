import { format } from 'date-fns';
import type { ExternalBooking } from '@/integrations/supabase/external-client';
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  AppointmentType,
  ShippingData,
} from '@/lib/types';

function mapOrigin(origin: string): AppointmentSource {
  const originMap: Record<string, AppointmentSource> = {
    chat: 'chat',
    campaign: 'campaign',
    direct: 'direct',
    manual: 'direct',
    web: 'direct',
    referral: 'referral',
  };
  return originMap[origin] || 'chat';
}

function mapStatus(): AppointmentStatus {
  return 'confirmed';
}

/** Misma lógica que el calendario vía useExternalBookings: ExternalBooking → Appointment. */
export function externalBookingToAppointment(booking: ExternalBooking): Appointment {
  let datetime: Date;
  if (booking.event_time) {
    datetime = new Date(`${booking.event_date}T${booking.event_time}`);
  } else {
    datetime = new Date(`${booking.event_date}T00:00:00`);
  }

  const time = booking.event_time
    ? format(new Date(`2000-01-01T${booking.event_time}`), 'HH:mm')
    : undefined;

  const metadata = booking.metadata as Record<string, unknown> | null;
  const meetingUrl =
    (metadata?.meeting_url as string | undefined) ||
    (metadata?.meetingUrl as string | undefined) ||
    (metadata?.zoom_link as string | undefined) ||
    (metadata?.meet_link as string | undefined);

  const shippingData: ShippingData = {};
  if (metadata) {
    const address = (metadata.direccion ||
      metadata.address ||
      metadata.shipping_address ||
      metadata.direccion_envio) as string | undefined;
    const commune = (metadata.comuna || metadata.commune || metadata.ciudad) as string | undefined;
    const region = (metadata.region ||
      metadata.estado ||
      metadata.province ||
      metadata.provincia) as string | undefined;
    const email = (metadata.email || metadata.correo) as string | undefined;
    const shippingCost = (metadata.costo_envio ||
      metadata.shipping_cost ||
      metadata.envio ||
      metadata.costo_despacho) as number | undefined;
    const subtotal = (metadata.subtotal || metadata.sub_total) as number | undefined;
    const total = (metadata.total || metadata.total_pedido) as number | undefined;
    const shippingDate = (metadata.fecha_despacho ||
      metadata.shipping_date ||
      metadata.fecha_envio ||
      metadata.dispatch_date ||
      metadata.fecha_entrega) as string | undefined;

    if (address) shippingData.address = address;
    if (commune) shippingData.commune = commune;
    if (region) shippingData.region = region;
    if (email) shippingData.email = email;
    if (shippingCost !== undefined) shippingData.shippingCost = Number(shippingCost);
    if (subtotal !== undefined) shippingData.subtotal = Number(subtotal);
    if (total !== undefined) shippingData.total = Number(total);
    if (shippingDate) shippingData.shippingDate = shippingDate;
  }

  if (booking.address) shippingData.address = booking.address;
  if (booking.comuna) shippingData.commune = booking.comuna;
  if (booking.region) shippingData.region = booking.region;
  if (booking.shipping_cost != null) shippingData.shippingCost = Number(booking.shipping_cost);
  if (booking.payment_method) shippingData.paymentMethod = booking.payment_method;
  if (booking.estimated_delivery_date) shippingData.shippingDate = booking.estimated_delivery_date;
  if (booking.estimated_delivery_time) shippingData.estimatedDeliveryTime = booking.estimated_delivery_time;

  const hasShippingData = Object.keys(shippingData).length > 0;

  return {
    id: booking.id,
    datetime,
    clientName: booking.contact_name,
    clientPhone: booking.contact_phone || undefined,
    clientEmail: booking.contact_email || undefined,
    service: booking.item_name,
    source: mapOrigin(booking.origin),
    sourceRaw: booking.origin,
    status: mapStatus(),
    notes: booking.notes || undefined,
    chatId: booking.session_id || undefined,
    createdAt: new Date(booking.created_at),
    type: booking.type as AppointmentType,
    time,
    price: booking.price,
    currency: booking.currency,
    meetingUrl,
    shippingData: hasShippingData ? shippingData : undefined,
  };
}
