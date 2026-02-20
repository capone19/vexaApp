
# Plan: Rediseño del Modal de Compras con Dos Pestañas (Tenant 557bd366)

## Diagnóstico del Problema

El modal actualmente existe y tiene código para "Datos de despacho", pero hay dos fallas:

1. **La sección no se activa visualmente** porque depende de `selectedAppointment.shippingData && Object.keys(...).length > 0`. Si los campos en el `metadata` de la tabla `bookings` externa tienen nombres diferentes a los esperados (`direccion`, `comuna`, etc.), el objeto queda vacío y la sección no renderiza.

2. **Diseño plano, no organizado en pestañas**. El usuario pide dos pestañas separadas dentro del popup para mejor organización.

3. **Faltan campos**: `region` y `fecha de despacho` no se extraen del `metadata`.

## Cambios a Realizar

### 1. `src/lib/types/index.ts` — Ampliar `ShippingData`

Agregar dos campos nuevos a la interfaz:
```typescript
export interface ShippingData {
  address?: string;
  commune?: string;
  region?: string;        // NUEVO
  email?: string;
  shippingCost?: number;
  subtotal?: number;
  total?: number;
  shippingDate?: string;  // NUEVO - fecha de despacho como string
}
```

### 2. `src/hooks/use-external-bookings.ts` — Extraer más campos del metadata

Ampliar el mapeo para capturar `region` y `fecha de despacho` desde el `metadata`, con múltiples claves alternativas para mayor cobertura:
```typescript
// Nuevas extracciones:
const region = (metadata.region || metadata.estado || metadata.province) as string | undefined;
const shippingDate = (metadata.fecha_despacho || metadata.shipping_date || metadata.fecha_envio || metadata.dispatch_date) as string | undefined;

if (region) shippingData.region = region;
if (shippingDate) shippingData.shippingDate = shippingDate;
```

**Importante**: También se agregarán `console.log` temporales del objeto `shippingData` para facilitar depuración del tenant específico.

### 3. `src/pages/Calendar.tsx` — Rediseñar el modal con pestañas

#### Estructura del nuevo modal para tipo `product` + tenant `557bd366-37e7-4155-82f8-b10d4c31ac72`:

El modal se dividirá en **dos pestañas** usando el componente `Tabs` ya importado:

**Pestaña 1: "Detalle de compra"** (ícono ShoppingBag)
- Nombre del cliente + badge "Producto"
- Producto comprado (nombre del item)
- Fecha de compra
- Precio del producto (el campo `price` directo del booking)
- Tabla de costos: subtotal, costo de envío y total del pedido
- Origen del pedido

**Pestaña 2: "Detalle de despacho"** (ícono Truck)
- Nombre del cliente
- Teléfono (`clientPhone` del booking)
- Email (`clientEmail` del booking O `shippingData.email`)
- Dirección (`shippingData.address`)
- Comuna (`shippingData.commune`)
- Región (`shippingData.region`)
- Fecha de despacho (`shippingData.shippingDate`)

#### Para tipo `service` o cualquier otro tenant:
El modal queda **igual que hoy** (sin pestañas).

## Estructura Visual del Nuevo Modal

```text
┌─────────────────────────────────────────────┐
│  🛍 Detalles de la compra               [X] │
├─────────────────────────────────────────────┤
│  [ Detalle de compra ] [ Detalle de despacho]│
├─────────────────────────────────────────────┤
│  PESTAÑA 1:                                 │
│  Nicolás Varela                  [Producto] │
│  Compró: Cross Bag Antirrobo               │
│  ─────────────────────────────────────────  │
│  📅 Fecha de compra: viernes 20 feb, 2026  │
│  ─────────────────────────────────────────  │
│  Subtotal            $14.990               │
│  Envío               $2.990                │
│  ─────────────────────────────────────────  │
│  Total               $17.980               │
│  ─────────────────────────────────────────  │
│  Origen:  [chat]                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  🛍 Detalles de la compra               [X] │
├─────────────────────────────────────────────┤
│  [ Detalle de compra ] [ Detalle de despacho]│
├─────────────────────────────────────────────┤
│  PESTAÑA 2:                                 │
│  👤 Nicolás Varela                          │
│  📞 +56 9 3487 3487                         │
│  ✉  nicolas@email.com                       │
│  📍 Av. Las Condes 1234, Las Condes         │
│  🗺  Región Metropolitana                   │
│  📅 Fecha de despacho: lunes 24 feb, 2026  │
└─────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `src/lib/types/index.ts` | Agregar `region` y `shippingDate` a `ShippingData` |
| `src/hooks/use-external-bookings.ts` | Extraer `region` y `shippingDate` del metadata; log de debug |
| `src/pages/Calendar.tsx` | Rediseñar el modal con pestañas para el tenant específico |

## Consideraciones Técnicas

- El componente `Tabs`, `TabsList`, `TabsTrigger` y `TabsContent` ya están importados en `Calendar.tsx`.
- Se añadirá un `useState` para controlar la pestaña activa del modal (`modalTab`), que se reinicia al abrir un nuevo appointment.
- La condición de activación del nuevo modal: `selectedAppointment.type === 'product' && tenantId === '557bd366-37e7-4155-82f8-b10d4c31ac72'`
- Para los demás tenants y tipos de cita, el modal existente permanece sin cambios.
- El `TabsContent` para despacho mostrará todos los campos disponibles, omitiendo los que sean `undefined`.
