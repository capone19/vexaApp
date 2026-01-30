
# Plan: Alinear Métricas del Admin Dashboard con la Lógica Centralizada

## Resumen del Problema

El Admin Dashboard (`AdminDashboard.tsx`) no está alineado con la lógica de conteo que usan los clientes porque:

1. **No usa paginación** → Solo obtiene 1,000 filas (límite de Supabase), pero hay más datos
2. **No filtra por tenant** → La query intenta obtener todo sin filtro
3. **La query a `tenants` falla** → RLS bloquea el acceso directo, mostrando 0 clientes
4. **No usa `countConversations()`** → La función centralizada que ya resuelve estos problemas

## Solución

Modificar `AdminDashboard.tsx` para:
1. Obtener la lista de tenants activos desde `admin-list-tenants` (Edge Function)
2. Para cada tenant, llamar a `countConversations()` y sumar los totales
3. Para bookings, implementar la misma paginación

---

## Cambios Técnicos

### Archivo: `src/pages/admin/AdminDashboard.tsx`

#### 1. Importar la función centralizada

```typescript
import { countConversations } from '@/lib/api/conversation-counter';
import { supabase } from '@/integrations/supabase/client';
```

#### 2. Obtener lista de tenants desde Edge Function

En lugar de consultar directamente la tabla `tenants` (bloqueada por RLS):

```typescript
// ANTES (líneas 182-188) - NO FUNCIONA por RLS:
const { data: tenants, error: tenantsError } = await supabase
  .from('tenants')
  .select('id, name, is_active');

// DESPUÉS - Usar Edge Function:
const { data: tenantsResponse } = await supabase.functions.invoke('admin-list-tenants');
const tenants = tenantsResponse?.tenants || [];
const totalClients = tenants.length;
const activeClients = tenants.filter((t: any) => t.is_active !== false).length;
```

#### 3. Usar `countConversations()` para cada tenant activo

```typescript
// ANTES (líneas 92-145) - Query única sin paginación:
const { data: allMessages } = await externalSupabase
  .from('n8n_chat_histories')
  .select('session_id, created_at')
  .order('created_at', { ascending: false });

// DESPUÉS - Iterar sobre cada tenant y usar la función centralizada:
let globalTodayChats = 0;
let globalTodayMessages = 0;
let globalPeriodChats = 0;
let globalPeriodMessages = 0;
let globalTotalChats = 0;
let globalTotalMessages = 0;

// Obtener lista de tenant IDs activos
const activeTenantIds = tenants
  .filter((t: any) => t.is_active !== false)
  .map((t: any) => t.id);

// Para cada tenant, usar la función centralizada
for (const tenantId of activeTenantIds) {
  // Conteo TOTAL (histórico)
  const totalCount = await countConversations({ tenantId });
  globalTotalChats += totalCount.totalConversations;
  globalTotalMessages += totalCount.totalMessages;
  
  // Conteo del MES
  const periodCount = await countConversations({
    tenantId,
    startDate: monthStart,
    endDate: now,
  });
  globalPeriodChats += periodCount.totalConversations;
  globalPeriodMessages += periodCount.totalMessages;
  
  // Conteo de HOY
  const todayCount = await countConversations({
    tenantId,
    startDate: todayStart,
    endDate: now,
  });
  globalTodayChats += todayCount.totalConversations;
  globalTodayMessages += todayCount.totalMessages;
}
```

#### 4. Paginación para Bookings

```typescript
// ANTES (líneas 150-156) - Sin paginación:
const { data: allBookings } = await externalSupabase
  .from('bookings')
  .select('id, price, created_at, event_date');

// DESPUÉS - Con paginación:
const PAGE_SIZE = 1000;
let allBookings: any[] = [];
let offset = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await externalSupabase
    .from('bookings')
    .select('id, price, created_at, event_date, currency')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  
  if (error || !data || data.length === 0) {
    hasMore = false;
  } else {
    allBookings.push(...data);
    offset += data.length;
    if (data.length < PAGE_SIZE) hasMore = false;
  }
  
  // Límite de seguridad
  if (offset >= 50000) hasMore = false;
}
```

#### 5. Optimización: Paralelizar queries de tenants

Para evitar lentitud con muchos clientes:

```typescript
// Ejecutar en paralelo (máximo 5 a la vez para no saturar)
const BATCH_SIZE = 5;
for (let i = 0; i < activeTenantIds.length; i += BATCH_SIZE) {
  const batch = activeTenantIds.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(tenantId => countConversations({ tenantId }))
  );
  results.forEach(count => {
    globalTotalChats += count.totalConversations;
    globalTotalMessages += count.totalMessages;
  });
}
```

---

## Flujo Corregido

```text
Admin abre /admin/dashboard
        ↓
1. Llamar admin-list-tenants (Edge Function)
        ↓
2. Obtener lista de tenants activos
        ↓
3. Para cada tenant:
   - countConversations() para HOY
   - countConversations() para MES
   - countConversations() para TOTAL
        ↓
4. Sumar todos los conteos
        ↓
5. Bookings con paginación
        ↓
6. Mostrar métricas agregadas correctas
```

---

## Consideraciones de Rendimiento

| Aspecto | Con 1 cliente | Con 10 clientes |
|---------|---------------|-----------------|
| Queries de chats | 3 (hoy, mes, total) | 30 (3 × 10) |
| Tiempo estimado | ~1 seg | ~3-5 seg |
| Paginación | Hasta 100k msgs | Por tenant (seguro) |

**Nota:** Con 10 clientes proyectados, el rendimiento será aceptable. Si escala a 50+ clientes, se debería considerar una Edge Function que haga el agregado en el servidor.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/AdminDashboard.tsx` | Refactorizar `fetchGlobalMetrics()` para usar `countConversations()` + paginación de bookings + Edge Function para tenants |

---

## Validación Post-Implementación

1. **Verificar totales:** Los números del Admin Dashboard deben coincidir con la suma de todos los dashboards de clientes
2. **Verificar clientes:** Debe mostrar el número correcto de clientes activos (actualmente 1)
3. **Verificar hoy:** Si hay actividad hoy, debe reflejarse en las métricas de "Hoy"
4. **Verificar paginación:** Si hay más de 1,000 mensajes, deben contarse todos

---

## Lo Que NO Se Toca

- `countConversations()` - Se usa tal cual (ya funciona perfecto)
- Dashboard de clientes - Sin cambios
- Facturación - Sin cambios
- Edge Functions de n8n - Sin cambios
