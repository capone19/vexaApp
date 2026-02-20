
# Diagnóstico exacto del problema

La tabla externa `bookings` tiene columnas de primer nivel (no en `metadata`):
- `address` (text)
- `comuna` (text)
- `region` (text)
- `shipping_cost` (numeric)
- `payment_method` (text)
- `estimated_delivery_date` (date)
- `estimated_delivery_time` (text)

El código en `use-external-bookings.ts` busca estos datos **dentro del campo JSON `metadata`** (que está NULL/vacío para estos registros). Por eso `shippingData` siempre queda vacío y el modal no muestra nada.

## Archivos a modificar

### 1. `src/integrations/supabase/external-client.ts`
Agregar las columnas faltantes a la interfaz `ExternalBooking`:

```typescript
export interface ExternalBooking {
  // ...campos existentes...
  // Columnas directas de despacho (no en metadata)
  address: string | null;
  comuna: string | null;
  region: string | null;
  shipping_cost: number | null;
  payment_method: string | null;
  estimated_delivery_date: string | null;   // "YYYY-MM-DD"
  estimated_delivery_time: string | null;   // "HH:MM-HH:MM"
}
```

### 2. `src/lib/types/index.ts`
Agregar `paymentMethod` y `estimatedDeliveryTime` a `ShippingData`:

```typescript
export interface ShippingData {
  address?: string;
  commune?: string;
  region?: string;
  email?: string;
  shippingCost?: number;
  subtotal?: number;
  total?: number;
  shippingDate?: string;
  paymentMethod?: string;       // NUEVO
  estimatedDeliveryTime?: string; // NUEVO - "16:00-22:00"
}
```

### 3. `src/hooks/use-external-bookings.ts`
Cambiar la extracción de `shippingData` para leer de **columnas directas** primero, con `metadata` como fallback:

```typescript
const shippingData: ShippingData = {};

// Leer de columnas directas (prioridad sobre metadata)
const address = booking.address || (metadata?.direccion || metadata?.address) as string | undefined;
const commune = booking.comuna || (metadata?.comuna || metadata?.commune) as string | undefined;
const region = booking.region || (metadata?.region || metadata?.estado) as string | undefined;
const shippingCost = booking.shipping_cost ?? (metadata?.costo_envio || metadata?.shipping_cost) as number | undefined;
const paymentMethod = booking.payment_method || undefined;
const shippingDate = booking.estimated_delivery_date || (metadata?.fecha_despacho) as string | undefined;
const estimatedDeliveryTime = booking.estimated_delivery_time || undefined;

if (address) shippingData.address = address;
if (commune) shippingData.commune = commune;
// etc.
```

### 4. `src/pages/Calendar.tsx`
Agregar en la pestaña "Detalle de despacho" los dos campos nuevos:
- **Método de pago** (con ícono `CreditCard`)
- **Horario estimado de entrega** (junto a la fecha de despacho)

## Resultado esperado

| Campo | Origen actual (❌) | Origen correcto (✅) |
|---|---|---|
| Dirección | `metadata.direccion` (NULL) | `booking.address` |
| Comuna | `metadata.comuna` (NULL) | `booking.comuna` |
| Región | `metadata.region` (NULL) | `booking.region` |
| Costo envío | `metadata.costo_envio` (NULL) | `booking.shipping_cost` |
| Fecha despacho | `metadata.fecha_despacho` (NULL) | `booking.estimated_delivery_date` |
| Método pago | — | `booking.payment_method` (NUEVO) |
| Horario entrega | — | `booking.estimated_delivery_time` (NUEVO) |

Con este cambio, todos los pedidos que ya tienen datos en las columnas directas (como los 3 de "mayecura 1239 / vitacura") mostrarán correctamente la información en el modal.
