
# Plan de Sincronización: Total de Chats en Tiempo Real

## Objetivo
Sincronizar el conteo de chats entre **Dashboard**, **Métricas**, **Facturación** y **Chats** para que todos muestren el mismo número y se actualicen cuando se crean nuevos chats.

---

## Diagnóstico del Problema

### Arquitectura Actual
Todas las secciones leen de la misma tabla externa `n8n_chat_histories`, pero cada una tiene su propia lógica de cache y actualización:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EXTERNO                             │
│                 n8n_chat_histories                              │
│                (tabla con mensajes)                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   CHATS     │ │  DASHBOARD  │ │  MÉTRICAS   │ │ FACTURACIÓN │
│             │ │             │ │             │ │             │
│ useN8nChat  │ │useDashboard │ │useDashboard │ │usePeriod    │
│ History     │ │ Metrics     │ │ Metrics     │ │ Usage       │
│             │ │             │ │             │ │             │
│ ✅ Realtime │ │ ✅ Realtime │ │ ✅ Realtime │ │ ❌ No cache │
│ ✅ Polling  │ │ ✅ Query    │ │ ✅ Query    │ │ ❌ useState │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │               │               │               │
       │               ▼               ▼               │
       │        (Cache React Query)                    │
       │        ['dashboard-metrics']                  │
       │                                               │
       └────────────────────X──────────────────────────┘
                    NO SE COMUNICAN
```

### Problemas Identificados

1. **`usePeriodUsage` no usa React Query** - Usa `useState` sin cache compartido
2. **No hay invalidación cruzada** - Cuando llega un mensaje nuevo, solo la sección que lo recibe se actualiza
3. **Realtime está configurado pero aislado** - Cada hook invalida solo su propio cache

---

## Solución Propuesta

### Fase 1: Migrar `usePeriodUsage` a React Query

**Archivo:** `src/hooks/use-period-usage.ts`

Convertir de:
```typescript
const [usage, setUsage] = useState<PeriodUsage | null>(null);
useEffect(() => { fetchUsage(); }, [fetchUsage]);
```

A:
```typescript
const { data: usage, isLoading, error, refetch } = useQuery({
  queryKey: ['period-usage', tenantId],
  queryFn: () => fetchPeriodUsage(tenantId, subscription),
  enabled: !!tenantId,
  staleTime: 30000, // 30 segundos
});
```

Esto permite:
- Cache compartido con React Query
- Invalidación desde otros hooks
- Refetch automático cuando cambia tenantId

---

### Fase 2: Crear Hook de Sincronización Global

**Nuevo archivo:** `src/hooks/use-chat-realtime-sync.ts`

Este hook se montará UNA VEZ en el layout principal y:
- Escuchará eventos de `n8n_chat_histories`
- Invalidará TODOS los caches relacionados cuando llegue un nuevo mensaje

```typescript
export function useChatRealtimeSync(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = externalSupabase
      .channel(`chat-sync-${tenantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'n8n_chat_histories',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        console.log('[ChatRealtimeSync] New message, invalidating caches');
        
        // Invalidar TODOS los caches relacionados
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['period-usage'] });
        queryClient.invalidateQueries({ queryKey: ['billing-usage'] });
      })
      .subscribe();

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}
```

---

### Fase 3: Montar el Hook de Sincronización en MainLayout

**Archivo:** `src/components/layout/MainLayout.tsx`

Agregar el hook de sincronización:

```typescript
import { useChatRealtimeSync } from '@/hooks/use-chat-realtime-sync';
import { useEffectiveTenant } from '@/hooks/use-effective-tenant';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = useEffectiveTenant();
  
  // Sincronización global de chats
  useChatRealtimeSync(tenantId);
  
  // ... resto del componente
}
```

---

### Fase 4: Limpiar Subscripciones Duplicadas en useDashboardMetrics

**Archivo:** `src/hooks/use-dashboard-metrics.ts`

Remover la suscripción realtime local (líneas 353-401) ya que ahora la sincronización es global. Mantener solo el React Query con invalidación externa.

Esto evita:
- Múltiples suscripciones al mismo canal
- Conflictos entre invalidaciones
- Overhead de conexiones realtime

---

## Diagrama de la Nueva Arquitectura

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EXTERNO                             │
│                 n8n_chat_histories                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              useChatRealtimeSync (en MainLayout)                │
│                                                                 │
│   Escucha INSERT → Invalida TODOS los caches                   │
│   ['dashboard-metrics', 'period-usage', 'billing-usage']       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   CHATS     │ │  DASHBOARD  │ │  MÉTRICAS   │ │ FACTURACIÓN │
│ useN8nChat  │ │useDashboard │ │useDashboard │ │usePeriod    │
│ History     │ │ Metrics     │ │ Metrics     │ │ Usage       │
│ (local RT)  │ │ (useQuery)  │ │ (useQuery)  │ │ (useQuery)  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │               │               │               │
       │               └───────────────┴───────────────┘
       │                       │
       │              Comparten cache React Query
       │              Actualizan juntos
       │
    (Mantiene su propio realtime para UX inmediata)
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/use-period-usage.ts` | Migrar a React Query |
| `src/hooks/use-chat-realtime-sync.ts` | **CREAR** - Hook de sincronización global |
| `src/components/layout/MainLayout.tsx` | Montar hook de sincronización |
| `src/hooks/use-dashboard-metrics.ts` | Remover suscripción realtime local |

---

## Resultado Esperado

1. **Dashboard** muestra 15 chats
2. Nuevo chat llega vía WhatsApp
3. **useChatRealtimeSync** detecta INSERT
4. Invalida caches: `dashboard-metrics`, `period-usage`
5. **Todas las secciones** muestran 16 chats simultáneamente

---

## Consideraciones Técnicas

### Requisito: Realtime debe estar habilitado en la BD externa

La tabla `n8n_chat_histories` en el Supabase externo (`gfltyrhndfuttacrmcjd`) debe tener Realtime habilitado:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_chat_histories;
```

Si esto no está configurado, el realtime no funcionará y se dependerá solo del polling como fallback.

### Fallback con Polling

Si el realtime falla silenciosamente:
- `useN8nChatHistory` ya tiene polling cada 3 segundos
- Podemos agregar polling periódico en `useChatRealtimeSync` como respaldo
