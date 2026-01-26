

# Plan: Corregir Período de Facturación - Usar Fecha de Creación del Tenant

## Problema Identificado

La UI muestra **"1 ene - 31 ene 2026"** cuando debería mostrar **"15 ene - 14 feb 2026"** para Estetica Online.

**Causa raíz:** El código actual prioriza las fechas de `subscriptions.current_period_start/end`, pero cuando el admin impersona un cliente, hay una condición de carrera donde la query de suscripción no ha terminado y el sistema cae al fallback del mes calendario.

**Datos en base de datos (correctos):**
| Campo | Valor |
|-------|-------|
| `tenants.created_at` | 2026-01-16 |
| `subscriptions.current_period_start` | 2026-01-16 |
| `subscriptions.current_period_end` | 2026-02-16 |

**Requerimiento del usuario:** El período de facturación debe ser **SIEMPRE** 1 mes desde la fecha de la columna "Creado" del tenant (visible en Admin > Clientes).

---

## Solución

Modificar `usePeriodUsage` para que **siempre** calcule el período basado en `tenants.created_at`, ignorando las fechas de la tabla `subscriptions`. Esto garantiza:

1. Consistencia visual entre Admin y vista de cliente
2. No hay dependencia de timing con `useSubscription`
3. La lógica es más simple y predecible

---

## Cambios Técnicos

### Archivo: `src/hooks/use-period-usage.ts`

**1. Eliminar prioridad de suscripción, usar siempre `tenants.created_at`:**

```typescript
async function fetchPeriodUsage(
  tenantId: string,
  subscription: Subscription | null
): Promise<PeriodUsage> {
  let periodStart: Date;
  let periodEnd: Date;
  
  // ============================================
  // SIEMPRE calcular basado en fecha de creación del tenant
  // ============================================
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('created_at, plan')
    .eq('id', tenantId)
    .single();
  
  if (tenantError || !tenantData?.created_at) {
    // FALLBACK: Usar el mes actual si no hay fecha de creación
    const now = new Date();
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // Calcular período basado en fecha de creación del tenant
    const createdAt = new Date(tenantData.created_at);
    const calculated = calculateBillingPeriod(createdAt);
    periodStart = calculated.periodStart;
    periodEnd = calculated.periodEnd;
  }
  
  // ============================================
  // USAR PLAN DEL TENANT (no de suscripción)
  // ============================================
  const currentPlan: PlanId = (tenantData?.plan as PlanId) || 'basic';
  
  // ... resto del código sin cambios
}
```

**2. Simplificar dependencias del hook:**

Como ya no dependemos de `useSubscription` para las fechas, podemos eliminar la condición de `subscriptionLoading`:

```typescript
export function usePeriodUsage(): UsePeriodUsageReturn {
  const { tenantId, tenantPlan } = useEffectiveTenant();
  const queryClient = useQueryClient();

  const queryKey = ['period-usage', tenantId];

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPeriodUsage(tenantId!),
    enabled: !!tenantId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    usage: usage ?? null,
    isLoading: tenantId ? isLoading : false,
    error: error ? (error as Error).message : null,
    refetch: async () => { await refetch(); },
  };
}
```

---

## Flujo Corregido

```text
Admin hace clic en "Ver como cliente"
            ↓
useEffectiveTenant() devuelve tenantId impersonado
            ↓
usePeriodUsage() consulta tenants.created_at
            ↓
created_at = 2026-01-16
            ↓
calculateBillingPeriod(2026-01-16) = {
  periodStart: 2026-01-16
  periodEnd: 2026-02-15
}
            ↓
UI muestra: "16 ene - 15 feb 2026"
```

---

## Verificación de Límite por Plan

Para el límite (300/1000/4000) se usará el campo `plan` de la tabla `tenants`, consistente con lo que se muestra en Admin > Clientes:

| Cliente | Plan | Límite |
|---------|------|--------|
| Estetica Online | basic | 300 |
| Casa Buona | pro | 1,000 |
| Growth Partners | pro | 1,000 |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/use-period-usage.ts` | Usar `tenants.created_at` y `tenants.plan` directamente, eliminar dependencia de `useSubscription` para fechas |

---

## Resultado Esperado

1. Estetica Online (creado 15 ene) → Período: **"16 ene - 15 feb 2026"**
2. Casa Buona (creado 17 ene) → Período: **"17 ene - 16 feb 2026"**
3. Growthpartners Demo (creado 10 ene) → Período: **"10 ene - 9 feb 2026"**

Cada cliente tendrá su período de facturación correcto basado en su fecha de creación.

