
# Plan: Sistema de Créditos para Marketing WhatsApp

## Resumen

Implementar un sistema de prepago de créditos dentro del módulo de Marketing donde los clientes pueden:
1. Ver su saldo de créditos en USD
2. Comprar/depositar créditos
3. Ver tabla de precios por tipo de mensaje
4. Ver historial de consumo y transacciones
5. Enviar plantillas (solo si tienen saldo suficiente)

---

## Precios a Implementar

Basados en los costos de YCloud con margen para VEXA:

| Tipo de Mensaje | Costo YCloud | Precio VEXA | Margen |
|-----------------|--------------|-------------|--------|
| Marketing | $0.089 | $0.15 | 68% |
| Utility/Notificación | $0.02 | $0.04 | 100% |
| Autenticación | $0.02 | $0.04 | 100% |
| Servicio | Gratis | Gratis | - |

---

## Arquitectura

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Módulo Marketing (Sidebar)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐│
│  │ Plantillas     │  │ Performance    │  │ Créditos (NUEVO)       ││
│  │ /marketing/    │  │ /marketing/    │  │ /marketing/creditos    ││
│  │ plantillas     │  │ performance    │  │                        ││
│  └────────────────┘  └────────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### Nueva Tabla: `tenant_messaging_credits`
```sql
CREATE TABLE tenant_messaging_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance_usd NUMERIC(10,4) DEFAULT 0,
  total_purchased_usd NUMERIC(10,4) DEFAULT 0,
  total_consumed_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);
```

### Nueva Tabla: `messaging_transactions`
```sql
CREATE TABLE messaging_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'deposit', 'consumption', 'refund'
  amount_usd NUMERIC(10,4) NOT NULL,
  balance_after NUMERIC(10,4) NOT NULL,
  message_count INTEGER,
  message_type TEXT,  -- 'marketing', 'utility', 'authentication', 'service'
  template_id UUID REFERENCES whatsapp_templates(id),
  campaign_id UUID REFERENCES campaigns(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies
- Cada tenant solo puede ver/modificar sus propios créditos
- Solo service_role puede insertar transacciones (via Edge Functions)

---

## Nuevos Archivos Frontend

### 1. Nueva Página: `src/pages/MarketingCredits.tsx`

Panel completo con:

**Sección Superior - Dashboard de Créditos:**
- Card grande con saldo actual en USD
- Botón "Agregar créditos" 
- Indicador visual del saldo (verde/amarillo/rojo según nivel)

**Sección de Precios:**
- Tabla con precios por tipo de mensaje:
  - Marketing: $0.15 USD
  - Utility: $0.04 USD
  - Autenticación: $0.04 USD
  - Servicio: Gratis

**Sección de Estadísticas:**
- Mensajes enviados este mes (por tipo)
- Gasto total del mes
- Plantillas más usadas

**Sección de Historial:**
- Tabla de transacciones (depósitos y consumos)
- Filtros por fecha y tipo
- Columnas: Fecha, Tipo, Cantidad, Detalle, Saldo

### 2. Nuevo Hook: `src/hooks/use-messaging-credits.ts`

```typescript
export const useMessagingCredits = () => {
  // Query: obtener balance actual
  // Query: obtener historial de transacciones
  // Mutation: depositar créditos (para admin)
  // Helper: calcular costo de campaña
};
```

### 3. Nueva Constante: `src/lib/messaging-pricing.ts`

```typescript
export const MESSAGE_PRICES = {
  marketing: 0.15,
  utility: 0.04,
  authentication: 0.04,
  service: 0,
};

export const calculateCampaignCost = (
  messageCount: number, 
  category: string
): number => {
  return messageCount * (MESSAGE_PRICES[category] || MESSAGE_PRICES.marketing);
};
```

---

## Modificaciones a Archivos Existentes

### 1. Sidebar (`src/components/layout/Sidebar.tsx`)

Agregar nueva subsección "Créditos" dentro de Marketing:
```typescript
{
  title: "Marketing",
  href: "/marketing",
  icon: Megaphone,
  isUpgrade: true,
  children: [
    { title: "Plantillas", href: "/marketing/plantillas" },
    { title: "Performance", href: "/marketing/performance" },
    { title: "Créditos", href: "/marketing/creditos" },  // NUEVO
  ],
}
```

### 2. App.tsx - Nueva Ruta

```typescript
<Route 
  path="/marketing/creditos" 
  element={
    <ProtectedRoute>
      <PremiumRoute feature="El sistema de créditos">
        <MarketingCredits />
      </PremiumRoute>
    </ProtectedRoute>
  } 
/>
```

### 3. Edge Function `ycloud-send-message/index.ts`

Modificar para:
1. Verificar saldo antes de enviar
2. Calcular costo según categoría del template
3. Descontar créditos después de envío exitoso
4. Registrar transacción en `messaging_transactions`
5. Rechazar envío si saldo insuficiente

```typescript
// Antes de enviar:
const cost = MESSAGE_PRICES[template.category] * recipients.length;
if (balance < cost) {
  throw new Error(`Saldo insuficiente. Necesitas $${cost.toFixed(2)} USD`);
}

// Después de envío exitoso:
// UPDATE tenant_messaging_credits SET balance_usd = balance_usd - cost
// INSERT INTO messaging_transactions (type: 'consumption', ...)
```

### 4. MarketingTemplates.tsx

Agregar:
- Badge con saldo actual en el header
- Cuando se envía un mensaje, mostrar costo estimado
- Alerta si saldo bajo

---

## Flujo de Usuario

### Primer Uso
```text
1. Cliente accede a Marketing → Créditos
2. Ve saldo en $0.00 USD
3. Ve tabla de precios por tipo de mensaje
4. Contacta a VEXA para depositar créditos
5. Admin deposita créditos (transacción registrada)
6. Cliente ve nuevo saldo disponible
```

### Envío de Campaña
```text
1. Cliente va a Plantillas, selecciona template aprobado
2. Configura campaña con 100 destinatarios (marketing)
3. Sistema muestra: "Costo estimado: $15.00 USD"
4. Cliente confirma envío
5. Sistema verifica saldo >= $15.00
6. Envía mensajes vía YCloud
7. Descuenta $15.00 del saldo
8. Registra transacción en historial
9. Cliente ve saldo actualizado
```

---

## UI del Panel de Créditos

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Marketing > Créditos                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  💰 Tu Saldo        │  │  📊 Precios por Mensaje             │  │
│  │                     │  │                                     │  │
│  │  $125.50 USD        │  │  Marketing      $0.15 USD           │  │
│  │                     │  │  Utility        $0.04 USD           │  │
│  │  [Agregar créditos] │  │  Autenticación  $0.04 USD           │  │
│  │                     │  │  Servicio       Gratis              │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📈 Uso Este Mes                                             │   │
│  │  ────────────────────────────────────────────────────────── │   │
│  │  Marketing: 85 mensajes ($12.75)                             │   │
│  │  Utility: 120 mensajes ($4.80)                               │   │
│  │  Total gastado: $17.55 USD                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📋 Historial de Transacciones                               │   │
│  │  ────────────────────────────────────────────────────────── │   │
│  │  Fecha        Tipo       Cantidad   Detalle         Saldo   │   │
│  │  ──────────────────────────────────────────────────────────│   │
│  │  30 ene       Depósito   +$100.00   Recarga         $125.50 │   │
│  │  29 ene       Consumo    -$7.50     50 marketing    $25.50  │   │
│  │  28 ene       Consumo    -$2.00     50 utility      $33.00  │   │
│  │  25 ene       Depósito   +$35.00    Recarga inicial $35.00  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Acción |
|------|---------|--------|
| Migration | `tenant_messaging_credits` | Crear tabla |
| Migration | `messaging_transactions` | Crear tabla |
| Page | `src/pages/MarketingCredits.tsx` | Crear |
| Hook | `src/hooks/use-messaging-credits.ts` | Crear |
| Lib | `src/lib/messaging-pricing.ts` | Crear |
| Edge Function | `ycloud-send-message/index.ts` | Modificar |
| Nav | `src/components/layout/Sidebar.tsx` | Agregar enlace |
| Route | `src/App.tsx` | Agregar ruta |

---

## Sobre la Integración YCloud

**Estado actual de tu plantilla "testeo":**
- ✅ Creada correctamente en YCloud
- ✅ Sincronizada en VEXA (wa_template_id: 653537301154780)
- ⏳ Estado: "Activo-Calidad pendiente" = Meta la está revisando

**Próximos pasos:**
1. Esperar 24-48 horas para aprobación de Meta
2. Una vez aprobada, sincronizar desde VEXA (botón Sincronizar)
3. El estado cambiará a "approved" 
4. Podrás enviar mensajes usando esa plantilla

**Todo está correcto** - la integración funciona, solo falta esperar la aprobación de Meta.

---

## Tiempo Estimado

| Fase | Tiempo |
|------|--------|
| Base de datos (2 tablas + RLS) | 30 min |
| Hook de créditos | 45 min |
| Página de créditos | 2 horas |
| Modificar Edge Function | 1.5 horas |
| Navegación y rutas | 30 min |
| Testing | 1 hora |
| **Total** | **~6 horas** |
