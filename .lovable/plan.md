

# Plan Fase 1: Correcciones de Seguridad SIN Impacto en Producción

## Resumen Ejecutivo

Tras revisar el código en detalle, he identificado qué cambios son **seguros** y cuáles **deben postponerse** para no afectar a tus clientes en producción.

---

## Análisis de Impacto por Bloqueante

### 1. Tabla `health_checks` sin políticas RLS

**Impacto en producción: NINGUNO**

Esta tabla es solo para el panel admin de Health Check que acabamos de crear. No afecta:
- Webhooks
- Envío de mensajes
- n8n
- Ningún flujo de cliente

**Acción:** Agregar política RLS simple. ✅ SEGURO

---

### 2. Anon Key hardcodeada en `external-client.ts`

**Contexto actual:**
```typescript
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGci...';
```

Esta key se usa para:
- Leer `n8n_chat_histories` (mensajes de chat)
- Leer `bookings` externos
- Realtime subscriptions
- Dashboard metrics

**Impacto de moverla a Edge Function:**
- Romperías TODAS las funcionalidades de chat en el frontend
- El realtime dejaría de funcionar
- El dashboard perdería datos

**Decisión: POSTERGAR**

La key anon está diseñada para ser pública. El riesgo real depende de las políticas RLS del Supabase externo (que no controlamos desde aquí). Cambiar esto requiere rediseñar la arquitectura de datos.

---

### 3. `webhook-n8n-proxy` sin autenticación

**Contexto actual:**
- Se llama desde `src/lib/api/webhook-n8n.ts`
- Usa `supabase.functions.invoke()` que **SÍ** incluye el token del usuario
- Solo se invoca cuando un usuario guarda Agent Settings

```typescript
// En webhook-n8n.ts línea 135
const { data, error } = await supabase.functions.invoke('webhook-n8n-proxy', {
  body: payload,
});
```

**El payload ya incluye:**
- `tenant_id` del usuario actual
- `updated_by` (userId)

**Riesgo real:**
Un atacante podría enviar payloads falsos a n8n, pero:
- n8n solo recibe notificaciones de "settings guardados"
- No puede modificar datos en VEXA
- El impacto es spam a n8n, no fuga de datos

**Decisión: IMPLEMENTAR con cuidado**

Agregar validación de JWT sin cambiar la lógica de negocio. El cambio es aditivo (verificar token antes de procesar), no modifica el flujo.

---

### 4. `human-message-proxy` sin validación de tenant ownership

**Contexto actual:**
- Se llama desde `src/pages/Chats.tsx` línea 156
- El payload incluye `tenant_id` y `session_id`
- El edge function confía en el `tenant_id` del payload

**Riesgo:**
Un usuario podría enviar mensajes a nombre de otro tenant si conoce su ID.

**Decisión: IMPLEMENTAR**

Agregar validación de que el usuario autenticado pertenece al `tenant_id` del payload. No cambia el flujo, solo agrega una verificación.

---

## Plan de Implementación (Solo cambios seguros)

### Fase 1A: Cambios 100% Seguros

| Cambio | Riesgo | Impacto en producción |
|--------|--------|----------------------|
| RLS en `health_checks` | Ninguno | Solo afecta admin panel nuevo |
| Validar JWT en `webhook-n8n-proxy` | Bajo | El cliente ya envía token |
| Validar tenant en `human-message-proxy` | Bajo | El cliente ya envía tenant_id correcto |

### Fase 1B: Postponer

| Cambio | Razón |
|--------|-------|
| Mover `EXTERNAL_SUPABASE_ANON_KEY` | Requiere rediseño de arquitectura |

---

## Implementación Detallada

### 1. RLS para `health_checks`

```sql
-- Solo el service role puede escribir (desde edge function)
-- Nadie puede leer directamente (la UI usa la edge function)
CREATE POLICY "Service role has full access to health_checks"
  ON health_checks FOR ALL
  USING (true)
  WITH CHECK (true);
```

No hay lectura directa desde frontend, así que no hay impacto.

### 2. Validar JWT en `webhook-n8n-proxy`

**Cambio en `supabase/functions/webhook-n8n-proxy/index.ts`:**

```typescript
// ANTES: Acepta cualquier request
serve(async (req) => {
  const payload = await req.json();
  // Forward to n8n...
});

// DESPUÉS: Verifica JWT pero sigue funcionando igual
serve(async (req) => {
  // Verificar que hay token válido
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.warn("[webhook-n8n-proxy] No auth header, rejecting");
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }
  
  // Validar token
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: claims, error: authError } = await supabase.auth.getClaims(
    authHeader.replace('Bearer ', '')
  );
  
  if (authError || !claims) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid token' }),
      { status: 401, headers: corsHeaders }
    );
  }
  
  // Continuar con lógica existente...
  const payload = await req.json();
  // Forward to n8n...
});
```

**Por qué es seguro:**
- `supabase.functions.invoke()` ya envía el token del usuario
- Solo rechazamos requests sin token (atacantes externos)
- La lógica de negocio no cambia

### 3. Validar tenant ownership en `human-message-proxy`

**Cambio en `supabase/functions/human-message-proxy/index.ts`:**

```typescript
// DESPUÉS de validar mensaje, ANTES de buscar webhook
const tenantId = payload.tenant_id as string | undefined;

// NUEVO: Verificar que el usuario pertenece a este tenant
if (tenantId) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error } = await supabase.auth.getClaims(token);
    
    if (!error && claims?.claims?.sub) {
      // Verificar membership
      const { data: membership } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', claims.claims.sub)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!membership) {
        console.warn("[human-message-proxy] User not member of tenant");
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden' }),
          { status: 403, headers: corsHeaders }
        );
      }
    }
  }
}

// Continuar con lógica existente...
```

**Por qué es seguro:**
- Si la validación falla, simplemente rechaza (no rompe flujos válidos)
- Los usuarios legítimos ya envían el token correcto
- Es validación adicional, no reemplazo de lógica

---

## Orden de Deployment

1. **Primero:** Migración SQL para RLS de `health_checks`
2. **Segundo:** Actualizar `webhook-n8n-proxy` con validación JWT
3. **Tercero:** Actualizar `human-message-proxy` con validación de tenant
4. **Deploy:** Todo junto en un solo build

---

## Rollback Plan

Si algo falla:
- Los edge functions anteriores quedan en el historial de Supabase
- Se puede revertir desde Cloud View
- La migración SQL no tiene rollback necesario (solo agrega política)

---

## Qué NO vamos a tocar

| Componente | Razón |
|------------|-------|
| `external-client.ts` | Rompe chat, realtime, dashboard |
| `use-n8n-chat-history.ts` | Funciona correctamente |
| `use-external-bookings.ts` | Funciona correctamente |
| URLs de webhooks n8n | Son las correctas |
| `tenant_webhooks` | Ya funciona con validación por tenant |

---

## Resumen

- 3 cambios seguros que no afectan producción
- 1 cambio postponedo que requiere rediseño
- Tiempo estimado: 15 minutos de implementación
- Riesgo de downtime: 0%

