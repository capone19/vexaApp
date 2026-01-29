
# Plan: Agregar Columna de Divisa por Cliente en Admin

## Resumen

Agregar una columna "Divisa" en el panel de Admin → Clientes que permita seleccionar entre CLP, BOB, USD para cada cliente. Esta divisa se propagará al resto de la aplicación para mostrar los ingresos en la moneda correcta.

---

## Alcance del Cambio

### Dónde se aplicará la divisa del cliente:
- Dashboard → Ingresos totales
- Resultados → Revenue Generado, Revenue Total, Ticket Promedio, Servicios Top
- Calendario → Precios de citas/servicios
- Admin Dashboard → Revenue por tenant (cuando hay múltiples)
- Notificaciones → Valor del servicio

### Excepciones (siempre en USD):
- Cobros de planes (suscripciones)
- Cobro de conversación adicional ($0.30 USD)
- Panel de facturación del cliente

---

## Cambios Técnicos

### 1. Base de Datos: Nueva columna en `tenants`

```sql
ALTER TABLE tenants 
ADD COLUMN display_currency text DEFAULT 'USD' 
CHECK (display_currency IN ('CLP', 'BOB', 'USD'));
```

**Nota:** Esta columna solo afecta la moneda de VISUALIZACIÓN, no cambia los datos de bookings.

---

### 2. Backend: `admin-list-tenants` Edge Function

**Archivo:** `supabase/functions/admin-list-tenants/index.ts`

**Cambio:** Incluir `display_currency` en el SELECT de tenants:
```typescript
.select(`
  id, name, slug, plan, is_active, whatsapp_phone_id,
  display_currency,  // NUEVO
  created_at,
  subscriptions (...)
`)
```

---

### 3. Backend: Nueva Edge Function `admin-update-tenant-currency`

**Archivo:** `supabase/functions/admin-update-tenant-currency/index.ts`

**Funcionalidad:**
- Recibe: `{ tenantId: string, currency: 'CLP' | 'BOB' | 'USD' }`
- Valida que el usuario sea admin
- Actualiza `tenants.display_currency`
- Retorna éxito/error

---

### 4. Frontend: Panel Admin de Clientes

**Archivo:** `src/pages/admin/AdminClients.tsx`

**Cambios:**
1. Agregar `display_currency` a la interfaz `Tenant`
2. Nueva columna "Divisa" en la tabla con `<Select>`
3. Handler para actualizar divisa llamando a la edge function
4. Opciones: CLP (Peso Chileno), BOB (Boliviano), USD (Dólar)

```typescript
interface Tenant {
  // ... campos existentes
  display_currency?: 'CLP' | 'BOB' | 'USD';
}

// En la tabla:
<TableHead>Divisa</TableHead>

// Celda:
<TableCell>
  <Select
    value={tenant.display_currency || 'USD'}
    onValueChange={(val) => handleChangeCurrency(tenant.id, val)}
  >
    <SelectItem value="CLP">CLP</SelectItem>
    <SelectItem value="BOB">BOB</SelectItem>
    <SelectItem value="USD">USD</SelectItem>
  </Select>
</TableCell>
```

---

### 5. Context: Exponer divisa del tenant

**Archivo:** `src/contexts/ImpersonationContext.tsx`

**Cambios:**
- Agregar `currency` a `ImpersonatedTenant`:
```typescript
interface ImpersonatedTenant {
  id: string;
  name: string;
  plan: string;
  slug: string;
  currency?: 'CLP' | 'BOB' | 'USD';  // NUEVO
}
```

---

### 6. Hook: `useEffectiveTenant` con divisa

**Archivo:** `src/hooks/use-effective-tenant.ts`

**Cambios:**
- Agregar `tenantCurrency` al retorno
- Si está impersonando, usar la divisa del tenant impersonado
- Si no, cargar la divisa del tenant del usuario

```typescript
interface EffectiveTenantInfo {
  tenantId: string | null;
  isImpersonating: boolean;
  tenantName: string | null;
  tenantPlan: string | null;
  tenantCurrency: 'CLP' | 'BOB' | 'USD';  // NUEVO
}
```

---

### 7. Utility: Función formatCurrency centralizada

**Archivo:** `src/lib/format-currency.ts` (NUEVO)

```typescript
export type DisplayCurrency = 'CLP' | 'BOB' | 'USD';

export function formatCurrency(
  value: number, 
  currency: DisplayCurrency = 'USD'
): string {
  const locales: Record<DisplayCurrency, string> = {
    CLP: 'es-CL',
    BOB: 'es-BO',
    USD: 'en-US',
  };

  return new Intl.NumberFormat(locales[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value);
}
```

---

### 8. Páginas a Actualizar (Consumir divisa del tenant)

| Archivo | Cambio |
|---------|--------|
| `src/pages/Dashboard.tsx` | Reemplazar `formatCurrency` local con la versión centralizada usando `tenantCurrency` |
| `src/pages/Results.tsx` | Igual que Dashboard |
| `src/pages/Calendar.tsx` | Usar `tenantCurrency` para `formatPrice()` |
| `src/pages/Notifications.tsx` | Usar `tenantCurrency` |
| `src/pages/admin/AdminDashboard.tsx` | Mantener USD para métricas agregadas de todos los tenants |

**Ejemplo de cambio en Dashboard.tsx:**
```typescript
// Antes
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(value);

// Después
import { formatCurrency } from '@/lib/format-currency';
const { tenantCurrency } = useEffectiveTenant();

// Uso:
<p>{formatCurrency(metrics.revenue, tenantCurrency)}</p>
```

---

## Flujo de Datos

```text
Admin selecciona divisa
        ↓
admin-update-tenant-currency (edge function)
        ↓
UPDATE tenants SET display_currency = 'CLP'
        ↓
Cliente carga Dashboard
        ↓
useEffectiveTenant() → tenantCurrency: 'CLP'
        ↓
formatCurrency(revenue, 'CLP') → "$150.000 CLP"
```

---

## Archivos a Crear/Modificar

| Tipo | Archivo |
|------|---------|
| SQL Migration | Nueva columna `display_currency` en `tenants` |
| Edge Function (NUEVO) | `supabase/functions/admin-update-tenant-currency/index.ts` |
| Edge Function (EDITAR) | `supabase/functions/admin-list-tenants/index.ts` |
| Utility (NUEVO) | `src/lib/format-currency.ts` |
| Hook (EDITAR) | `src/hooks/use-effective-tenant.ts` |
| Context (EDITAR) | `src/contexts/ImpersonationContext.tsx` |
| Page (EDITAR) | `src/pages/admin/AdminClients.tsx` |
| Page (EDITAR) | `src/pages/Dashboard.tsx` |
| Page (EDITAR) | `src/pages/Results.tsx` |
| Page (EDITAR) | `src/pages/Calendar.tsx` |
| Page (EDITAR) | `src/pages/Notifications.tsx` |

---

## Notas Importantes

1. **Valor por defecto:** USD para tenants sin divisa configurada
2. **No afecta datos históricos:** Solo cambia cómo se MUESTRA el número, no el valor almacenado
3. **Excepción USD:** Facturación y cobros extra siempre en USD (ya están así)
4. **Impersonación:** Cuando admin impersona, ve la divisa configurada para ese cliente
