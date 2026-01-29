
# Plan: Página de Health Check para Panel Admin

## Resumen

Crear una nueva sección en el panel de administración que muestre el estado de salud de todos los servicios críticos de VEXA, incluyendo edge functions, bases de datos y webhooks externos. Las métricas se almacenarán para análisis histórico.

---

## Servicios a Monitorear

| Servicio | Tipo | Endpoint/Target | Criticidad |
|----------|------|-----------------|------------|
| Lovable Cloud DB | Base de datos | Query simple a `tenants` | Alta |
| External DB (n8n) | Base de datos | Query simple a `n8n_chat_histories` | Alta |
| Edge: save-agent-settings | Edge Function | POST con payload mínimo | Media |
| Edge: admin-toggle-tenant-status | Edge Function | Health endpoint | Media |
| Edge: webhook-n8n-proxy | Edge Function | Health endpoint | Alta |
| n8n Webhook | Externo | HEAD request a n8n | Media |

---

## Arquitectura

```text
┌─────────────────────┐
│  AdminHealthCheck   │
│     (React Page)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Edge Function:     │────▶│  health_checks      │
│  health-check       │     │  (tabla histórico)  │
└─────────────────────┘     └─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Ping a cada servicio en paralelo       │
│  - Supabase DBs                         │
│  - Edge Functions                       │
│  - n8n Webhook                          │
└─────────────────────────────────────────┘
```

---

## Implementación

### 1. Crear Tabla para Historial de Health Checks

Nueva migración SQL:

```sql
CREATE TABLE public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER NOT NULL,
  error_message TEXT,
  metadata JSONB
);

-- Índices para consultas rápidas
CREATE INDEX idx_health_checks_service ON public.health_checks(service_name);
CREATE INDEX idx_health_checks_checked_at ON public.health_checks(checked_at DESC);

-- RLS: Solo admins pueden leer
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- Política para lectura (via service role desde edge function)
-- No se necesita política de usuario ya que solo se accede via edge function
```

### 2. Crear Edge Function: `health-check`

Nueva función en `supabase/functions/health-check/index.ts`:

**Responsabilidades:**
- Verificar que el solicitante sea admin
- Ejecutar pings a todos los servicios en paralelo
- Medir tiempo de respuesta de cada uno
- Guardar resultados en tabla `health_checks`
- Retornar estado actual de todos los servicios

**Lógica de cada ping:**
```typescript
// Para bases de datos
const checkDB = async (client, name) => {
  const start = Date.now();
  try {
    await client.from('tenants').select('id').limit(1);
    return { 
      service: name, 
      status: 'healthy', 
      responseTime: Date.now() - start 
    };
  } catch (e) {
    return { 
      service: name, 
      status: 'down', 
      responseTime: Date.now() - start,
      error: e.message 
    };
  }
};

// Para edge functions (HEAD request ligero)
const checkEdgeFunction = async (name) => {
  const start = Date.now();
  try {
    // Endpoint especial /health que solo retorna 200
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'OPTIONS'
    });
    return {
      service: `edge:${name}`,
      status: res.ok ? 'healthy' : 'degraded',
      responseTime: Date.now() - start
    };
  } catch (e) {
    return {
      service: `edge:${name}`,
      status: 'down',
      responseTime: Date.now() - start,
      error: e.message
    };
  }
};
```

### 3. Crear Página: `AdminHealthCheck.tsx`

Nueva página en `src/pages/admin/AdminHealthCheck.tsx`:

**Componentes de UI:**
- **Estado General:** Indicador grande (verde/amarillo/rojo) con timestamp del último check
- **Tabla de Servicios:** Lista de todos los servicios con:
  - Nombre del servicio
  - Estado (badge con color)
  - Tiempo de respuesta (ms)
  - Último error (si aplica)
- **Botón "Run Health Check":** Ejecuta verificación manual
- **Gráfico Histórico:** Línea temporal mostrando uptime por servicio (últimas 24h)
- **Auto-refresh:** Toggle para verificación automática cada 60 segundos

**Diseño visual:**
```text
┌─────────────────────────────────────────────────────────────┐
│  Estado de Servicios                    [🔄 Verificar Ahora]│
│  Última verificación: hace 2 minutos                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 🟢 6/6   │ │ 45ms     │ │ 99.9%    │                     │
│  │ Healthy  │ │ Avg Time │ │ Uptime   │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
├─────────────────────────────────────────────────────────────┤
│  Servicio              Estado    Tiempo    Último Check     │
│  ─────────────────────────────────────────────────────────  │
│  Lovable Cloud DB      🟢 OK     23ms      hace 2 min       │
│  External DB (n8n)     🟢 OK     45ms      hace 2 min       │
│  save-agent-settings   🟢 OK     120ms     hace 2 min       │
│  webhook-n8n-proxy     🟡 Slow   890ms     hace 2 min       │
│  n8n Webhook           🔴 Down   ---       hace 2 min       │
└─────────────────────────────────────────────────────────────┘
```

### 4. Actualizar Navegación Admin

Modificar `src/components/layout/AdminLayout.tsx`:

```typescript
import { Activity } from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/admin/onboarding', label: 'Onboarding', icon: UserPlus },
  { path: '/admin/clientes', label: 'Clientes', icon: Users },
  { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { path: '/admin/health', label: 'Health', icon: Activity }, // NUEVO
];
```

### 5. Agregar Ruta en App.tsx

```typescript
const AdminHealthCheck = lazy(() => import("./pages/admin/AdminHealthCheck"));

// En Routes:
<Route path="/admin/health" element={<AdminRoute><AdminHealthCheck /></AdminRoute>} />
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/admin/AdminHealthCheck.tsx` | **Crear** | Página principal de health check |
| `supabase/functions/health-check/index.ts` | **Crear** | Edge function para ejecutar pings |
| `supabase/config.toml` | **Modificar** | Registrar nueva edge function |
| `src/components/layout/AdminLayout.tsx` | **Modificar** | Agregar enlace "Health" en navegación |
| `src/App.tsx` | **Modificar** | Agregar ruta `/admin/health` |
| **Migración SQL** | **Crear** | Tabla `health_checks` para historial |

---

## Umbrales de Estado

| Estado | Condición | Color |
|--------|-----------|-------|
| Healthy | Respuesta OK y tiempo < 500ms | 🟢 Verde |
| Degraded | Respuesta OK pero tiempo ≥ 500ms | 🟡 Amarillo |
| Down | Error o timeout (>5s) | 🔴 Rojo |

---

## Sección Técnica

### Edge Function: health-check

```typescript
// Estructura de respuesta
interface HealthCheckResult {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'down';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    response_time_ms: number;
    error?: string;
  }>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    avg_response_time_ms: number;
  };
}
```

### Consulta de Historial (Últimas 24h)

```sql
SELECT 
  service_name,
  date_trunc('hour', checked_at) as hour,
  COUNT(*) as checks,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
  AVG(response_time_ms) as avg_response_time
FROM health_checks
WHERE checked_at > now() - interval '24 hours'
GROUP BY service_name, date_trunc('hour', checked_at)
ORDER BY hour DESC;
```

---

## Resultado Esperado

1. Nueva sección "Health" visible solo para admin en el sidebar
2. Vista en tiempo real del estado de todos los servicios críticos
3. Capacidad de ejecutar health checks manuales
4. Historial de 24h para análisis de patrones de degradación
5. Alertas visuales claras cuando un servicio esté caído o lento
