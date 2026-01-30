
# Plan: Dashboard de Performance de Marketing (Plantillas WhatsApp)

## Objetivo

Crear un dashboard funcional de Performance de Marketing que mida:
- Mensajes de plantilla enviados
- Ventas recuperadas (atribuidas a plantillas)
- Tasa de conversión
- ROAS (Return on Ad Spend)
- Evolución diaria

Todo filtrado por el **período de facturación** del cliente.

---

## Arquitectura de Atribución

El sistema necesita conectar:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE ATRIBUCIÓN                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. ENVÍO DE PLANTILLA
   ┌──────────────────────┐
   │ messaging_transactions │
   │ - template_id         │
   │ - message_count       │
   │ - metadata.recipients │ ◄─── Guardar los teléfonos a los que se envió
   │ - created_at          │
   └──────────────────────┘
             │
             │ Se envía a phone_number
             ▼
2. CONVERSACIÓN (DB Externa)
   ┌──────────────────────┐
   │ n8n_chat_histories    │
   │ - session_id          │
   │ - phone_number        │ ◄─── Vincula teléfono con sesión
   │ - created_at          │
   └──────────────────────┘
             │
             │ Si hay venta
             ▼
3. CONVERSIÓN (DB Externa)
   ┌──────────────────────┐
   │ bookings              │
   │ - session_id          │ ◄─── Vincula sesión con venta
   │ - contact_phone       │
   │ - price               │
   │ - event_date          │
   └──────────────────────┘
```

**Lógica de atribución**: Una venta se atribuye a una plantilla si:
1. La plantilla fue enviada a un `phone_number`
2. Hay un `booking` posterior al envío de la plantilla
3. El `booking` tiene el mismo `contact_phone` que el destinatario de la plantilla
4. El `booking` ocurrió dentro de una ventana de 7 días después del envío

---

## Parte 1: Modificar el Edge Function de Envío

**Archivo**: `supabase/functions/ycloud-send-message/index.ts`

Actualmente el metadata solo guarda `template_name` y `failed_count`. Necesitamos guardar también los teléfonos destinatarios para poder hacer la atribución:

```typescript
// Registrar transacción con los destinatarios
const { error: txError } = await supabase
  .from('messaging_transactions')
  .insert({
    // ... campos existentes
    metadata: {
      template_name: template.name,
      failed_count: errorCount,
      recipients: results
        .filter(r => r.success)
        .map(r => r.to), // Guardar los teléfonos exitosos
    },
  });
```

---

## Parte 2: Crear Hook de Performance

**Nuevo archivo**: `src/hooks/use-marketing-performance.ts`

```typescript
interface MarketingPerformanceData {
  // KPIs principales
  totalMessagesSent: number;
  totalCostUsd: number;
  totalRevenue: number;
  conversions: number;
  conversionRate: number; // conversions / unique_recipients
  roas: number; // revenue / cost
  
  // Datos diarios para gráfico
  dailyData: Array<{
    date: string;
    messagesSent: number;
    cost: number;
    conversions: number;
    revenue: number;
  }>;
  
  // Top templates
  topTemplates: Array<{
    templateId: string;
    templateName: string;
    sent: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>;
}
```

### Lógica del Hook

1. **Obtener transacciones de mensajería** del período (Lovable Cloud)
2. **Extraer todos los teléfonos** a los que se enviaron plantillas
3. **Consultar bookings** de esos teléfonos en el período (DB externa)
4. **Calcular atribución** basada en:
   - Teléfono coincidente
   - Booking ocurrió después del envío de plantilla
   - Dentro de ventana de 7 días

---

## Parte 3: Actualizar la Página de Performance

**Archivo**: `src/pages/MarketingPerformance.tsx`

### Cambios principales:

1. **Eliminar tabs/subsecciones** - Una sola vista simplificada
2. **Usar PeriodFilter** - Filtrar por período de facturación
3. **KPIs reales**:
   - Mensajes Enviados (de messaging_transactions)
   - Ventas Recuperadas (bookings atribuidos)
   - Tasa de Conversión
   - ROAS
4. **Gráfico de evolución diaria** con datos reales
5. **Top Templates** (si hay datos)

### UI Simplificada

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Performance de Marketing               [Período: Actual ▼]         │
│  15 ene - 14 feb, 2025                                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ Mensajes     │ │ Ventas       │ │ Conversión   │ │ ROAS         ││
│  │ Enviados     │ │ Recuperadas  │ │              │ │              ││
│  │              │ │              │ │              │ │              ││
│  │    127       │ │   $4,280     │ │   12.5%      │ │    2.8x      ││
│  │              │ │              │ │              │ │              ││
│  │ Gasto: $19   │ │ 16 ventas    │ │ 16/127       │ │ $4280/$19    ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Evolución del Período                       │  │
│  │                                                                │  │
│  │         ___                                                    │  │
│  │    ___/    \___         Mensajes: ───                         │  │
│  │   /            \___    Conversiones: - - -                    │  │
│  │  ──────────────────                                            │  │
│  │  15   17   19   21   23   25   27   29   31                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Top Plantillas                                                │  │
│  │  ────────────────────────────────────────────────────────────  │  │
│  │  1. promo_febrero        45 enviados  │ 8 ventas │ 17.8% conv │  │
│  │  2. recordatorio_cita    38 enviados  │ 5 ventas │ 13.2% conv │  │
│  │  3. bienvenida           44 enviados  │ 3 ventas │  6.8% conv │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/hooks/use-marketing-performance.ts` | **Crear** | Hook que calcula métricas de performance |
| `src/pages/MarketingPerformance.tsx` | **Modificar** | Reemplazar contenido mock con datos reales |
| `supabase/functions/ycloud-send-message/index.ts` | **Modificar** | Guardar destinatarios en metadata |

---

## Consideraciones Técnicas

### Normalización de Teléfonos

Para hacer match entre el teléfono de envío y el de booking, normalizar a formato `+XXXXXXXXXXX`:

```typescript
function normalizePhone(phone: string): string {
  return phone.replace(/\s|-|\(|\)/g, '').replace(/^0+/, '+');
}
```

### Ventana de Atribución

- Default: 7 días después del envío de plantilla
- Una venta solo se atribuye a la plantilla más reciente enviada a ese teléfono

### Rendimiento

- Paginar transacciones si hay muchas
- Cache de bookings ya procesados
- Usar `useMemo` para cálculos pesados

---

## Datos de Entrada (Resumen)

**Desde Lovable Cloud (`messaging_transactions`)**:
- Todas las transacciones tipo `consumption` del período
- template_id, message_count, amount_usd, metadata.recipients

**Desde DB Externa (`bookings`)**:
- Todos los bookings del período
- contact_phone, price, event_date, session_id

**Cálculos**:
- Conversión = booking.contact_phone está en los recipients de una plantilla enviada en los últimos 7 días
- ROAS = total_revenue / total_cost

