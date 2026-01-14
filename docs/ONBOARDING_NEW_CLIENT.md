# 🚀 VEXA - Onboarding de Nuevo Cliente

Este documento describe el proceso completo para configurar un nuevo cliente en la plataforma VEXA.

---

## 📋 Pre-requisitos

1. **Supabase Project** configurado con las migraciones aplicadas
2. **n8n Workflow** configurado para WhatsApp
3. **Meta WhatsApp Business** cuenta verificada (opcional, para producción)

---

## 🔧 Paso 1: Crear Tenant (Cliente/Empresa)

Ejecutar en Supabase SQL Editor:

```sql
-- ==============================================
-- VEXA - ONBOARDING NUEVO CLIENTE
-- ==============================================

-- 1. Crear el TENANT (empresa/negocio del cliente)
-- NOTA: Cambiar los valores según el cliente real

INSERT INTO public.tenants (
    id,
    name,
    slug,
    plan,
    timezone,
    is_active,
    whatsapp_business_id,
    whatsapp_phone_id
) VALUES (
    gen_random_uuid(),  -- Se genera automáticamente
    'Nombre del Negocio',  -- ← CAMBIAR
    'slug-negocio',        -- ← CAMBIAR (sin espacios, lowercase)
    'pro',                 -- 'basic' | 'pro' | 'enterprise'
    'America/La_Paz',      -- Timezone de Bolivia
    true,
    NULL,  -- Se configura después con WhatsApp
    NULL   -- Se configura después con WhatsApp
)
RETURNING id, name, slug;
```

**Guardar el `id` devuelto** - lo necesitarás para los siguientes pasos.

---

## 👤 Paso 2: Crear Usuario y Asignar Rol

Después de que el usuario se registre via Supabase Auth (email/password o magic link):

```sql
-- ==============================================
-- ASIGNAR ROL AL USUARIO
-- ==============================================
-- Reemplazar los UUIDs con los valores reales

-- Variables a reemplazar:
-- {USER_ID}   = ID del usuario de auth.users
-- {TENANT_ID} = ID del tenant creado en paso 1

-- 2a. Crear rol del usuario
INSERT INTO public.user_roles (
    user_id,
    tenant_id,
    role
) VALUES (
    '{USER_ID}',    -- ← ID de auth.users
    '{TENANT_ID}',  -- ← ID del tenant
    'owner'         -- 'owner' | 'admin' | 'agent' | 'viewer'
);

-- 2b. Crear perfil del usuario
INSERT INTO public.profiles (
    user_id,
    full_name
) VALUES (
    '{USER_ID}',           -- ← ID de auth.users
    'Nombre del Usuario'   -- ← Nombre del usuario
);
```

---

## 🤖 Paso 3: Crear Registro de Agent Prompts

```sql
-- ==============================================
-- CREAR REGISTRO INICIAL DE PROMPTS
-- ==============================================
-- Esto permite que la sección "Ajustes del Agente" funcione

INSERT INTO public.agent_prompts (
    tenant_id
) VALUES (
    '{TENANT_ID}'  -- ← ID del tenant
);
```

---

## ⚙️ Paso 4: Configurar Servicios Iniciales (Opcional)

```sql
-- ==============================================
-- CREAR SERVICIOS DE EJEMPLO
-- ==============================================
-- Opcional - el cliente puede configurarlos desde la UI

INSERT INTO public.services (
    tenant_id,
    name,
    description,
    duration_minutes,
    price,
    currency,
    is_active,
    display_order
) VALUES 
    ('{TENANT_ID}', 'Consulta General', 'Consulta de 30 minutos', 30, 100, 'BOB', true, 1),
    ('{TENANT_ID}', 'Servicio Premium', 'Servicio completo de 1 hora', 60, 200, 'BOB', true, 2);
```

---

## 📱 Paso 5: Configurar WhatsApp (Producción)

Una vez que el cliente tenga su WhatsApp Business configurado:

```sql
-- ==============================================
-- CONFIGURAR WHATSAPP BUSINESS
-- ==============================================

UPDATE public.tenants
SET 
    whatsapp_business_id = 'WA_BUSINESS_ACCOUNT_ID',  -- ← Desde Meta Business
    whatsapp_phone_id = 'WA_PHONE_NUMBER_ID'          -- ← Desde Meta Business
WHERE id = '{TENANT_ID}';
```

---

## 🔄 Paso 6: Configurar n8n Webhook

En el workflow de n8n, agregar el `tenant_id` como variable para que el bot sepa a qué cliente pertenece cada conversación.

### Nodo Supabase - Leer Prompts:
```javascript
// Query para obtener prompts del tenant
const tenantId = $node["Webhook"].json.tenant_id; // O extraer del número de WhatsApp

// SELECT all prompts WHERE tenant_id = tenantId
```

### Webhook URL para Ajustes del Agente:
El frontend enviará automáticamente las configuraciones a:
```
https://n8n-growthpartners-n8n.q7anmx.easypanel.host/webhook/76e801a3-1b3d-4753-be54-a81223b3c29f
```

---

## ✅ Verificación

### Checklist Post-Onboarding:

- [ ] Tenant creado en `tenants`
- [ ] Usuario registrado en Supabase Auth
- [ ] Rol asignado en `user_roles`
- [ ] Perfil creado en `profiles`
- [ ] Registro en `agent_prompts`
- [ ] El usuario puede hacer login
- [ ] Dashboard muestra "Sin datos" (correcto para cliente nuevo)
- [ ] Chats muestra "Sin conversaciones"
- [ ] Calendario muestra "Sin agendamientos"
- [ ] Ajustes del Agente permite guardar configuración

---

## 🔐 Variables de Entorno Requeridas

### Frontend (.env):
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

### Supabase Edge Functions:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### n8n:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci... (service_role)
OPENAI_API_KEY=sk-...
META_WHATSAPP_TOKEN=... (cuando se configure WhatsApp)
```

---

## 🆘 Troubleshooting

### Error: "User does not belong to this tenant"
- Verificar que el `user_id` en `user_roles` corresponde al usuario logueado
- Verificar que el `tenant_id` es correcto

### Dashboard vacío aunque hay datos
- Verificar que los datos en `metrics_daily` tienen el `tenant_id` correcto
- Verificar fechas de los datos (el dashboard filtra por defecto últimos 30 días)

### Chats no aparecen
- Verificar que `chat_sessions` tiene registros con el `tenant_id` correcto
- Revisar consola del navegador para errores de Supabase

### Ajustes no se guardan
- Verificar conexión a Supabase (consola)
- Verificar que el webhook de n8n responde (aunque sea con timeout, el guardado local debe funcionar)

---

## 📊 Script Completo de Onboarding

Para comodidad, aquí está el script completo para un cliente nuevo:

```sql
-- ==============================================
-- VEXA - SCRIPT COMPLETO DE ONBOARDING
-- ==============================================
-- Ejecutar en Supabase SQL Editor
-- Reemplazar los valores marcados con ← CAMBIAR

DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := 'USER_ID_AQUI';  -- ← CAMBIAR: ID del usuario de auth.users
BEGIN
    -- 1. Crear Tenant
    INSERT INTO public.tenants (name, slug, plan, timezone, is_active)
    VALUES (
        'Nombre del Negocio',  -- ← CAMBIAR
        'slug-negocio',        -- ← CAMBIAR
        'pro',
        'America/La_Paz',
        true
    )
    RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE 'Tenant creado: %', v_tenant_id;
    
    -- 2. Asignar Rol
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (v_user_id, v_tenant_id, 'owner');
    
    RAISE NOTICE 'Rol asignado a usuario: %', v_user_id;
    
    -- 3. Crear Perfil
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (v_user_id, 'Nombre Usuario')  -- ← CAMBIAR
    ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    RAISE NOTICE 'Perfil creado';
    
    -- 4. Crear registro de Agent Prompts
    INSERT INTO public.agent_prompts (tenant_id)
    VALUES (v_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
    
    RAISE NOTICE 'Agent prompts inicializado';
    
    -- 5. Crear Servicios de ejemplo (opcional)
    INSERT INTO public.services (tenant_id, name, duration_minutes, price, currency, is_active, display_order)
    VALUES 
        (v_tenant_id, 'Consulta General', 30, 100, 'BOB', true, 1),
        (v_tenant_id, 'Servicio Premium', 60, 200, 'BOB', true, 2);
    
    RAISE NOTICE 'Servicios de ejemplo creados';
    RAISE NOTICE '✅ Onboarding completado para tenant: %', v_tenant_id;
    
END $$;
```

---

## 📝 Notas Adicionales

1. **RLS (Row Level Security)**: Todas las tablas tienen RLS habilitado. El usuario solo puede ver/modificar datos de su propio tenant.

2. **Multi-tenancy**: Cada cliente está completamente aislado. No hay forma de acceder a datos de otro tenant.

3. **Realtime**: Los hooks de la UI (`useChatSessions`, `useBookings`) tienen realtime activado. Los cambios en la base de datos se reflejan automáticamente.

4. **Estados Vacíos**: La UI está diseñada para mostrar estados vacíos amigables cuando no hay datos. Esto es normal para un cliente nuevo.

