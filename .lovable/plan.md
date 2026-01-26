
# Plan: Corregir Período de Facturación en Modo Impersonación

## Problema Identificado

Cuando un admin impersona un cliente, el período de facturación muestra **"1 ene - 31 ene 2026"** en lugar del período correcto basado en la fecha de creación del cliente (ej: "16 ene - 15 feb 2026" para Estetica Online).

### Causa Raíz
1. `usePeriodUsage` usa `useSubscription` para obtener las fechas del período
2. Cuando se impersona, `useSubscription` hace una query asíncrona para cargar los datos del tenant
3. React Query ejecuta `fetchPeriodUsage` **antes** de que la suscripción termine de cargar
4. Con `subscription = null`, el código cae al **fallback** que usa el mes calendario actual
5. El cache guarda este resultado incorrecto

### Datos en Base de Datos (CORRECTOS)
```
Estetica Online (6fea8edb-fcaa-4724-86c3-3865398e4aa8):
- current_period_start: 2026-01-16
- current_period_end: 2026-02-16
- plan: basic
```

---

## Solución

Modificar `usePeriodUsage` para que **espere** a que la suscripción esté cargada antes de ejecutar la query de período.

### Cambios en `src/hooks/use-period-usage.ts`

**1. Agregar dependencia al estado de carga de suscripción:**

```typescript
export function usePeriodUsage(): UsePeriodUsageReturn {
  const { tenantId } = useEffectiveTenant();
  const { subscription, isLoading: subscriptionLoading } = useSubscription(); // <-- NUEVO
  const queryClient = useQueryClient();

  const queryKey = ['period-usage', tenantId];

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPeriodUsage(tenantId!, subscription),
    // NUEVO: Solo ejecutar cuando:
    // 1. Tenemos tenantId
    // 2. La suscripción ya terminó de cargar
    enabled: !!tenantId && !subscriptionLoading,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    usage: usage ?? null,
    // Mostrar loading si falta tenantId O si la suscripción está cargando
    isLoading: !tenantId ? false : (subscriptionLoading || isLoading),
    error: error ? (error as Error).message : null,
    refetch: async () => { 
      await refetch(); 
    },
  };
}
```

**2. Agregar logging para debug:**

```typescript
console.log('[usePeriodUsage] State:', {
  tenantId,
  subscriptionLoading,
  hasSubscription: !!subscription,
  periodFromSubscription: subscription?.current_period_start 
    ? 'yes' : 'will-fallback',
});
```

---

## Verificación de "Conversaciones Fuera de Plan"

La sección **SÍ está operativa**. Confirmado en el código:

```typescript
// src/hooks/use-period-usage.ts líneas 159-161
const conversationsExtra = Math.max(0, conversationsUsed - conversationsLimit);
const extraCostUSD = conversationsExtra * EXTRA_CONVERSATION_COST_USD; // $0.30
```

### Límites por Plan
| Plan | Límite | Costo Extra |
|------|--------|-------------|
| Basic | 300 | $0.30/conv |
| Pro | 1,000 | $0.30/conv |
| Enterprise | 4,000 | $0.30/conv |

### Comportamiento Actual (Correcto)
- Estetica Online: 156 conversaciones, límite 300
- 156 < 300 → 0 conversaciones extra
- Costo extra: $0.00 USD

### Cuando Supere el Límite
Si Estetica Online llegara a 350 conversaciones:
- 350 - 300 = 50 conversaciones extra
- 50 × $0.30 = **$15.00 USD**
- El panel cambiará de gris a naranja

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/use-period-usage.ts` | Agregar `subscriptionLoading` a la condición `enabled` de React Query |

## Resultado Esperado

1. Admin hace clic en "Ver como cliente" para Estetica Online
2. El hook espera a que `useSubscription` termine de cargar
3. Se obtiene `current_period_start: 2026-01-16`
4. Dashboard muestra: **"16 ene - 15 feb 2026"**

---

## Notas Técnicas

### Por qué el Fallback existe
El fallback al mes calendario es necesario para casos donde:
- Tenants muy nuevos sin suscripción
- Errores de conectividad

Pero **no debería activarse** cuando hay datos válidos en la suscripción.

### Cache de React Query
El `queryKey` incluye `tenantId`, por lo que cada tenant tiene su propio cache. Al corregir el timing, cada impersonación cargará los datos correctos.
