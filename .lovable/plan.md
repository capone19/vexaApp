

# Plan: Corregir Sincronización de Métricas en Tiempo Real

## Problema Identificado

Las métricas no se actualizan visualmente a pesar de que:
- ✅ Realtime está habilitado en `n8n_chat_histories` y `bookings`
- ✅ El canal realtime está conectado (`[ChatRealtimeSync] ✅ Realtime connected successfully`)
- ✅ El polling está funcionando cada 30 segundos

**Causa raíz**: Se está usando `invalidateQueries` que solo marca el cache como "obsoleto", pero no fuerza un refetch inmediato. Los datos solo se refrescan cuando hay un trigger como navegación o window focus.

## Solución

Cambiar de `invalidateQueries` a `refetchQueries` para forzar la actualización inmediata de los datos.

## Archivo a Modificar

`src/hooks/use-chat-realtime-sync.ts`

### Cambios Específicos

Actualizar la función `invalidateAllChatCaches` para usar `refetchQueries`:

```typescript
// ANTES
queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
queryClient.invalidateQueries({ queryKey: ['period-usage'] });
queryClient.invalidateQueries({ queryKey: ['billing-usage'] });
queryClient.invalidateQueries({ queryKey: ['subscription'] });

// DESPUÉS
queryClient.refetchQueries({ queryKey: ['dashboard-metrics'] });
queryClient.refetchQueries({ queryKey: ['period-usage'] });
queryClient.refetchQueries({ queryKey: ['billing-usage'] });
queryClient.refetchQueries({ queryKey: ['subscription'] });
```

### Consideración de Performance

Para evitar sobrecarga en refetch del polling, también agregaremos la opción `type: 'active'` que solo refetcha queries activamente montadas en la UI:

```typescript
queryClient.refetchQueries({ 
  queryKey: ['dashboard-metrics'],
  type: 'active' // Solo refetcha si el componente está montado
});
```

## Resultado Esperado

1. Nuevo chat llega vía WhatsApp
2. `useChatRealtimeSync` detecta el INSERT (o polling cada 30s)
3. `refetchQueries` fuerza refetch inmediato
4. Dashboard, Métricas y Facturación se actualizan visualmente sin necesidad de navegar o hacer focus

## Sección Técnica

### Diferencia entre invalidateQueries y refetchQueries

| Método | Marca Stale | Fuerza Refetch | Cuándo Refetcha |
|--------|-------------|----------------|-----------------|
| `invalidateQueries` | ✅ | ❌ | En próximo trigger (mount, focus, etc.) |
| `refetchQueries` | ✅ | ✅ | Inmediatamente |

### Código Completo de la Función Actualizada

```typescript
const invalidateAllChatCaches = useCallback(() => {
  const now = Date.now();
  if (now - lastInvalidationRef.current < 1000) {
    return;
  }
  lastInvalidationRef.current = now;

  console.log('[ChatRealtimeSync] 🔄 Refetching all chat-related caches');
  
  // Refetch forzado de todas las queries activas
  queryClient.refetchQueries({ 
    queryKey: ['dashboard-metrics'],
    type: 'active' 
  });
  
  queryClient.refetchQueries({ 
    queryKey: ['period-usage'],
    type: 'active' 
  });
  
  queryClient.refetchQueries({ 
    queryKey: ['billing-usage'],
    type: 'active' 
  });
  
  queryClient.refetchQueries({ 
    queryKey: ['subscription'],
    type: 'active' 
  });
}, [queryClient]);
```

