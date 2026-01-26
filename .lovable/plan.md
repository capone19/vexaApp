
# Plan: Agregar Switch para Activar/Desactivar Clientes

## Resumen Ejecutivo

Implementar un componente Switch en la columna "Estado" del panel Admin > Clientes que permita activar o desactivar clientes de forma instantánea. El switch reemplazará el Badge estático actual.

---

## Contexto Técnico

### Tabla y Campo Afectado
- **Tabla:** `public.tenants`
- **Campo:** `is_active` (BOOLEAN, default: `true`)
- **Valores:** `true` = Activo, `false` = Inactivo

### Estado Actual del Campo
El campo `is_active` actualmente es **informativo**:
- Se usa para estadísticas en Admin Dashboard (clientes totales vs activos)
- Se muestra como Badge visual en la lista de clientes
- **NO bloquea** login, webhooks, ni procesamiento de mensajes

### Políticas RLS
Los usuarios normales **no pueden** hacer UPDATE en la tabla `tenants`. Solo el service role tiene acceso completo, por lo que se requiere una edge function para realizar la actualización de forma segura.

---

## Implementación

### 1. Crear Edge Function: `admin-toggle-tenant-status`

Nueva función en `supabase/functions/admin-toggle-tenant-status/index.ts`:

```typescript
// Endpoint: POST /admin-toggle-tenant-status
// Body: { tenantId: string, isActive: boolean }

// 1. Verificar que el usuario sea admin (email = contacto@vexalatam.com)
// 2. Validar parámetros de entrada
// 3. Actualizar is_active en tabla tenants usando service role
// 4. Registrar acción en audit_logs para trazabilidad
// 5. Retornar estado actualizado
```

**Características:**
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Valida que solo admins puedan ejecutar
- Registra en `audit_logs` quién hizo el cambio
- Retorna el nuevo estado para actualización optimista de UI

### 2. Modificar Vista de Clientes

En `src/pages/admin/AdminClients.tsx`:

**A. Importar Switch:**
```typescript
import { Switch } from '@/components/ui/switch';
```

**B. Agregar estado de loading por tenant:**
```typescript
const [togglingId, setTogglingId] = useState<string | null>(null);
```

**C. Handler para toggle:**
```typescript
const handleToggleStatus = async (tenantId: string, newStatus: boolean) => {
  setTogglingId(tenantId);
  try {
    const { data, error } = await supabase.functions.invoke('admin-toggle-tenant-status', {
      body: { tenantId, isActive: newStatus }
    });
    
    if (error) throw error;
    
    // Actualizar estado local
    setTenants(prev => prev.map(t => 
      t.id === tenantId ? { ...t, is_active: newStatus } : t
    ));
    
    toast.success(newStatus ? 'Cliente activado' : 'Cliente desactivado');
  } catch (err) {
    toast.error('Error al cambiar estado');
  } finally {
    setTogglingId(null);
  }
};
```

**D. Reemplazar Badge por Switch:**
```typescript
// Antes (líneas 333-340):
<Badge>Activo/Inactivo</Badge>

// Después:
<div className="flex items-center gap-2">
  <Switch
    checked={tenant.is_active !== false}
    onCheckedChange={(checked) => handleToggleStatus(tenant.id, checked)}
    disabled={togglingId === tenant.id}
  />
  <span className={tenant.is_active !== false ? 'text-green-600' : 'text-destructive'}>
    {tenant.is_active !== false ? 'Activo' : 'Inactivo'}
  </span>
</div>
```

---

## Flujo de Usuario

```text
Admin en Panel Clientes
         ↓
Ve Switch en columna "Estado" (ON = verde)
         ↓
Hace clic en Switch para desactivar
         ↓
Switch muestra loading (disabled)
         ↓
Edge function valida admin + actualiza BD
         ↓
Switch cambia a OFF + texto "Inactivo" (rojo)
         ↓
Toast: "Cliente desactivado"
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/functions/admin-toggle-tenant-status/index.ts` | **Crear** | Edge function para toggle seguro |
| `src/pages/admin/AdminClients.tsx` | **Modificar** | Agregar Switch y handler |

---

## Consideraciones de Seguridad

1. **Validación de Admin:** Solo el email `contacto@vexalatam.com` puede ejecutar
2. **Audit Trail:** Cada cambio se registra en `audit_logs` con:
   - `admin_user_id`
   - `action: 'tenant_status_toggle'`
   - `old_values: { is_active: true }`
   - `new_values: { is_active: false }`
3. **No auto-desactivación:** Agregar validación para que el admin no pueda desactivar su propio tenant (si aplicable)

---

## Extensiones Futuras (No Incluidas en Este Plan)

Actualmente `is_active = false` es solo informativo. Para hacerlo funcional se podría:

| Funcionalidad | Impacto |
|---------------|---------|
| Bloquear login | Usuarios del tenant no pueden entrar |
| Pausar WhatsApp | Mensajes entrantes no se procesan |
| Banner de suspensión | Cliente ve aviso al entrar |
| Suspender facturación | No se cobran extras |

Estas extensiones requerirían modificaciones adicionales en `ProtectedRoute`, `webhook-n8n-proxy`, etc.

---

## Resultado Esperado

El admin podrá:
1. Ver el estado actual de cada cliente como un Switch interactivo
2. Activar/desactivar clientes con un solo clic
3. Ver feedback visual inmediato (loading + toast)
4. Tener registro de auditoría de todos los cambios
