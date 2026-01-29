
# Plan: Corregir Período de Facturación en Impersonación + Columna "Próximo Cobro"

## Problema 1: Período Incorrecto al Impersonar

### Diagnóstico
El log de consola muestra el problema:
```
[usePeriodUsage] No se pudo obtener created_at del tenant, usando fallback
tenantCreatedAt: undefined
periodStart: "2026-01-01"  ← Mes actual (fallback)
```

**Causa raíz:** Cuando el admin impersona un cliente, el hook `usePeriodUsage` intenta leer `tenants.created_at` directamente de la base de datos, pero **RLS bloquea el acceso** porque el admin no tiene una relación `user_roles` con el tenant impersonado.

### Solución
Pasar la fecha de creación del tenant impersonado desde el contexto de impersonación (que ya tiene esa info desde `admin-list-tenants`).

**Cambios:**

1. **ImpersonationContext**: Agregar `createdAt` a `ImpersonatedTenant`
2. **AdminClients.tsx**: Pasar `created_at` al iniciar impersonación
3. **useEffectiveTenant**: Exponer `tenantCreatedAt`
4. **usePeriodUsage**: Usar `tenantCreatedAt` del hook en lugar de consultar la BD

---

## Problema 2: Columna "Próximo Cobro" en Admin

### Diseño
Agregar una columna "Próx. Cobro" que muestre la fecha del próximo cobro para cada cliente, calculada dinámicamente.

**Cálculo:** 
- Basado en `created_at` del tenant
- El próximo cobro es el siguiente aniversario mensual
- Ejemplo: Si `created_at` es 16 enero, próximo cobro es 16 febrero

---

## Cambios Técnicos Detallados

### 1. ImpersonationContext.tsx

```typescript
interface ImpersonatedTenant {
  id: string;
  name: string;
  plan: string;
  slug: string;
  currency?: 'CLP' | 'BOB' | 'USD';
  createdAt?: string;  // NUEVO: Fecha de creación del tenant
}
```

### 2. AdminClients.tsx - Inicio de Impersonación

```typescript
const handleImpersonate = async (tenant: Tenant) => {
  // ...
  const success = await startImpersonation({
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    slug: tenant.slug,
    currency: tenant.display_currency,
    createdAt: tenant.created_at || undefined,  // NUEVO
  });
  // ...
};
```

### 3. useEffectiveTenant.ts

```typescript
interface EffectiveTenantInfo {
  tenantId: string | null;
  isImpersonating: boolean;
  tenantName: string | null;
  tenantPlan: string | null;
  tenantCurrency: DisplayCurrency;
  tenantCreatedAt: Date | null;  // NUEVO
}

// En la función:
if (isAdmin && isImpersonating && impersonatedTenant) {
  return {
    // ...
    tenantCreatedAt: impersonatedTenant.createdAt 
      ? new Date(impersonatedTenant.createdAt) 
      : null,
  };
}
```

### 4. usePeriodUsage.ts

```typescript
export function usePeriodUsage(): UsePeriodUsageReturn {
  const { tenantId, tenantCreatedAt } = useEffectiveTenant();  // NUEVO: obtener createdAt
  // ...

  const { data: usage, ... } = useQuery({
    queryKey: ['period-usage', tenantId, tenantCreatedAt?.toISOString()],  // Incluir en cache key
    queryFn: () => fetchPeriodUsage(tenantId!, tenantCreatedAt),  // NUEVO: pasar createdAt
    // ...
  });
}

// Modificar fetchPeriodUsage:
async function fetchPeriodUsage(
  tenantId: string, 
  providedCreatedAt?: Date | null  // NUEVO parámetro
): Promise<PeriodUsage> {
  let periodStart: Date;
  let periodEnd: Date;
  
  // NUEVO: Si ya tenemos createdAt (de impersonación), usarlo
  if (providedCreatedAt) {
    const calculated = calculateBillingPeriod(providedCreatedAt);
    periodStart = calculated.periodStart;
    periodEnd = calculated.periodEnd;
  } else {
    // Consultar BD (caso normal sin impersonación)
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('created_at, plan')
      .eq('id', tenantId)
      .single();
    
    if (tenantData?.created_at) {
      const calculated = calculateBillingPeriod(new Date(tenantData.created_at));
      periodStart = calculated.periodStart;
      periodEnd = calculated.periodEnd;
    } else {
      // Fallback...
    }
  }
  
  // ... resto de la lógica igual
}
```

---

### 5. AdminClients.tsx - Nueva Columna "Próx. Cobro"

**Ubicación:** Después de "Creado"

```typescript
// Función para calcular próximo cobro
const getNextBillingDate = (createdAt: string | null): Date | null => {
  if (!createdAt) return null;
  
  const created = new Date(createdAt);
  const now = new Date();
  const dayOfMonth = created.getDate();
  
  // Calcular próximo aniversario
  let nextBilling = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // Si ya pasó este mes, es el siguiente
  if (nextBilling <= now) {
    nextBilling.setMonth(nextBilling.getMonth() + 1);
  }
  
  return nextBilling;
};

// En la tabla:
<TableHead>Próx. Cobro</TableHead>

// Celda:
<TableCell>
  {tenant.created_at ? (
    <span className="text-muted-foreground">
      {format(getNextBillingDate(tenant.created_at)!, 'd MMM', { locale: es })}
    </span>
  ) : '-'}
</TableCell>
```

---

## Flujo Corregido

```text
Admin clica "Ver como cliente" en AdminClients
        ↓
startImpersonation({ ..., createdAt: "2025-01-16T..." })
        ↓
ImpersonationContext almacena createdAt
        ↓
Usuario navega a Facturación
        ↓
usePeriodUsage() → useEffectiveTenant() → tenantCreatedAt: "2025-01-16"
        ↓
fetchPeriodUsage(tenantId, new Date("2025-01-16"))
        ↓
Usa createdAt sin consultar BD (evita RLS)
        ↓
Período correcto: 16 ene - 15 feb ✓
```

---

## Resumen de Archivos

| Archivo | Cambio |
|---------|--------|
| `src/contexts/ImpersonationContext.tsx` | Agregar `createdAt` a la interfaz |
| `src/hooks/use-effective-tenant.ts` | Exponer `tenantCreatedAt` |
| `src/hooks/use-period-usage.ts` | Recibir y usar `tenantCreatedAt` |
| `src/pages/admin/AdminClients.tsx` | Pasar `createdAt` + nueva columna "Próx. Cobro" |

---

## Validación Post-Implementación

1. **Test impersonación:** Admin impersona un cliente con `created_at` = día 16
   - Verificar que el período mostrado sea "16 ene - 15 feb" (no "1 ene - 1 feb")
   
2. **Test columna:** Verificar que "Próx. Cobro" muestre la fecha correcta
   - Si hoy es 29 enero y `created_at` = 16 enero → Próx. Cobro = "16 feb"
