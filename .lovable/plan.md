

# Plan: Corregir Conteo de Conversaciones con Paginación

## Problema Detectado

El log de consola mostró claramente el problema:
```
rawDataCount: 1000  ← Límite del servidor externo
totalConversations: 177  ← Conteo INCOMPLETO
```

El servidor externo de Supabase tiene un límite máximo de 1,000 filas por consulta, ignorando el `.limit(50000)` del código.

---

## Solución: Paginación con `.range()`

Implementar paginación para obtener TODOS los mensajes en lotes de 1,000.

---

## Cambios Técnicos

### Archivo: `src/lib/api/conversation-counter.ts`

**Lógica actual (líneas 76-80):**
```typescript
const { data, error } = await externalSupabase
  .from('n8n_chat_histories')
  .select('session_id, created_at')
  .eq('tenant_id', tenantId)
  .limit(50000);
```

**Nueva lógica con paginación:**
```typescript
const PAGE_SIZE = 1000;
let allData: Array<{ session_id: string; created_at: string }> = [];
let offset = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await externalSupabase
    .from('n8n_chat_histories')
    .select('session_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw error;

  if (!data || data.length === 0) {
    hasMore = false;
  } else {
    allData.push(...data);
    offset += data.length;
    
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }
  
  // Límite de seguridad: máximo 100,000 mensajes
  if (offset >= 100000) {
    console.warn('[countConversations] Hit safety limit');
    hasMore = false;
  }
}
```

---

## Comparación

| Aspecto | Antes | Después |
|---------|-------|---------|
| Mensajes obtenidos | Máx 1,000 | Todos (hasta 100K) |
| Conteo conversaciones | Incompleto | Exacto |
| Facturación | Incorrecta | Correcta |
| Requests | 1 | N (donde N = mensajes/1000) |

---

## Impacto

- **Riesgo bajo**: Solo cambia cómo se obtienen los datos
- **Sin cambios en servidor**: Funciona con la configuración actual
- **Performance aceptable**: Para 5,000 mensajes = 5 requests

---

## Validación Post-Implementación

El log debería mostrar:
```
[countConversations] Fetched total rows: 2500+  // Número real
rawDataCount: 2500+  // Ya no será 1000
totalConversations: 300+  // Número real de sesiones
```

