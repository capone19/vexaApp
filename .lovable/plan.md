

# Plan: Aplicar Paginación a Datos Diarios de Gráficos

## Problema Identificado

En `src/hooks/use-dashboard-metrics.ts`, los **datos diarios para gráficos** (líneas 168-238) usan una query directa que está siendo truncada a 1,000 filas:

```typescript
// Líneas 172-178 - PROBLEMA
const { data: chatMessagesData } = await externalSupabase
  .from('n8n_chat_histories')
  .select('id, session_id, created_at')
  .eq('tenant_id', tenantId)
  .gte('created_at', startDate.toISOString())
  .lt('created_at', ...)
  .limit(50000); // ❌ El servidor ignora esto y retorna máx 1,000
```

**Consecuencias:**
- **Volumen de Chats**: Muestra menos conversaciones de las reales
- **Mensajes por Conversación**: Promedio incorrecto (sesiones truncadas)
- **Tasa de Abandono**: Sobreestimada (sesiones largas aparecen como cortas)

---

## Solución: Paginación con `.range()`

Reemplazar la query simple con la misma lógica de paginación usada en `countConversations()`.

---

## Cambios Técnicos

### Archivo: `src/hooks/use-dashboard-metrics.ts`

**Sección afectada:** Líneas 168-234 (generación de datos diarios)

**Lógica actual (simplificada):**
```typescript
if (startDate && endDate) {
  const { data: chatMessagesData } = await externalSupabase
    .from('n8n_chat_histories')
    .select('id, session_id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endOfRange.toISOString())
    .limit(50000); // ❌ Ignorado por el servidor
    
  // ... procesar datos diarios
}
```

**Nueva lógica con paginación:**
```typescript
if (startDate && endDate) {
  // PAGINACIÓN para obtener TODOS los mensajes del rango
  const PAGE_SIZE = 1000;
  let allChatMessages: Array<{id: number; session_id: string; created_at: string}> = [];
  let offset = 0;
  let hasMore = true;
  
  const endOfRange = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  
  while (hasMore) {
    const { data, error } = await externalSupabase
      .from('n8n_chat_histories')
      .select('id, session_id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endOfRange.toISOString())
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    
    if (error) {
      console.warn('[useDashboardMetrics] Error fetching daily data page:', error);
      break;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allChatMessages.push(...data);
      offset += data.length;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
    
    // Límite de seguridad
    if (offset >= 50000) {
      console.warn('[useDashboardMetrics] Hit safety limit for daily data');
      hasMore = false;
    }
  }
  
  console.log('[useDashboardMetrics] Daily data fetched:', allChatMessages.length, 'messages');
  
  // Usar allChatMessages en lugar de chatMessagesData
  const chatMessagesData = allChatMessages;
  
  // ... resto del procesamiento sin cambios
}
```

---

## Impacto en Métricas

| Métrica | Antes (truncado) | Después (completo) |
|---------|------------------|---------------------|
| Volumen de Chats | Solo 1,000 msgs procesados | Todos los mensajes del rango |
| Msgs/Conversación | Promedio bajo artificial | Promedio real |
| Tasa de Abandono | Sobreestimada | Calculada correctamente |
| Sesiones por día | Incompletas | Exactas |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/use-dashboard-metrics.ts` | Reemplazar query líneas 172-178 con loop de paginación |

---

## Validación Post-Implementación

El log de consola debería mostrar:
```
[useDashboardMetrics] Daily data fetched: 2500+ messages
```

En lugar del actual máximo de 1,000.

---

## Notas Adicionales

- **Límite de seguridad**: 50,000 mensajes para datos diarios (vs 100,000 para conteo total)
- **Performance**: Para 5,000 mensajes = 5 requests secuenciales
- **Sin impacto en UI**: Solo cambia cómo se obtienen los datos, el procesamiento permanece igual

