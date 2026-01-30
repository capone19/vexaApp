
# Plan: Integración YCloud para Marketing de WhatsApp

## Resumen Ejecutivo

Integrar la API de YCloud para que los clientes puedan gestionar sus plantillas de WhatsApp Business directamente desde VEXA, incluyendo:
- Listar y sincronizar plantillas existentes desde YCloud
- Crear nuevas plantillas y enviarlas a aprobación de Meta
- Ver estado de aprobación en tiempo real
- Enviar campañas usando plantillas aprobadas

---

## Estado Actual

### Lo que ya existe en la base de datos

**Tabla `whatsapp_templates`:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID interno de VEXA |
| `tenant_id` | UUID | FK a tenants |
| `name` | string | Nombre del template |
| `body_text` | string | Contenido del mensaje |
| `header_type` | string | TEXT, IMAGE, VIDEO, DOCUMENT |
| `header_content` | string | URL o texto del header |
| `footer_text` | string | Texto del footer |
| `buttons` | JSON | Configuración de botones |
| `variables` | JSON | Variables del template |
| `category` | enum | marketing, utility, authentication, service |
| `status` | enum | draft, pending, approved, rejected |
| `language` | string | Código de idioma (es, en, etc.) |
| `wa_template_id` | string | ID oficial de WhatsApp/YCloud |
| `wa_template_name` | string | Nombre en WhatsApp |
| `last_synced_at` | timestamp | Última sincronización |

**Tabla `campaigns`:**
- Ya relacionada con `whatsapp_templates` via `template_id`
- Métricas: sent_count, delivered_count, read_count, replied_count, failed_count
- Estados: draft, scheduled, running, paused, completed, cancelled

### Lo que falta

1. **Tabla para credenciales YCloud por tenant** (no existe)
2. **Edge Functions para comunicarse con YCloud API**
3. **Hooks y UI conectados a datos reales**

---

## Arquitectura de la Integración

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          VEXA Frontend                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ /marketing/     │  │ Dialog: Crear   │  │ Settings:       │     │
│  │ plantillas      │  │ Template        │  │ Integraciones   │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
└───────────┼─────────────────────┼───────────────────┼──────────────┘
            │                     │                   │
            ▼                     ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Edge Functions (Lovable Cloud)                 │
│  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────────┐ │
│  │ ycloud-templates│  │ ycloud-templates- │  │ ycloud-send-      │ │
│  │ -sync           │  │ create            │  │ message           │ │
│  └────────┬────────┘  └─────────┬─────────┘  └─────────┬─────────┘ │
└───────────┼─────────────────────┼───────────────────────┼──────────┘
            │                     │                       │
            ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           YCloud API v2                             │
│  - GET  /v2/whatsapp/templates?wabaId=xxx                          │
│  - POST /v2/whatsapp/templates                                      │
│  - POST /v2/whatsapp/messages/sendDirectly                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cambios Requeridos

### Fase 1: Base de Datos - Almacenar Credenciales YCloud

**Nueva tabla: `tenant_ycloud_config`**

```sql
CREATE TABLE IF NOT EXISTS public.tenant_ycloud_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,              -- API Key de YCloud
  waba_id TEXT NOT NULL,              -- WhatsApp Business Account ID
  phone_number_id TEXT,               -- ID del número de teléfono (opcional)
  phone_number TEXT,                  -- Número de teléfono display
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- RLS: Solo el tenant puede ver/editar su configuración
ALTER TABLE public.tenant_ycloud_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own ycloud config"
  ON public.tenant_ycloud_config
  FOR ALL
  USING (tenant_id = (SELECT get_user_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "Service role has full access to ycloud config"
  ON public.tenant_ycloud_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_tenant_ycloud_config
  BEFORE UPDATE ON public.tenant_ycloud_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Fase 2: Edge Functions

#### 2.1 `ycloud-templates-sync` - Sincronizar Plantillas desde YCloud

**Funcionalidad:**
- Obtener todas las plantillas del WABA del tenant desde YCloud
- Actualizar/insertar en tabla `whatsapp_templates`
- Mapear estados de YCloud a estados de VEXA

```typescript
// supabase/functions/ycloud-templates-sync/index.ts

// Mapeo de estados YCloud -> VEXA
const STATUS_MAP = {
  'PENDING': 'pending',
  'APPROVED': 'approved', 
  'REJECTED': 'rejected',
  'PAUSED': 'rejected',
  'DISABLED': 'rejected',
  'IN_APPEAL': 'pending',
  'DELETED': 'rejected',
};

// Mapeo de categorías YCloud -> VEXA  
const CATEGORY_MAP = {
  'MARKETING': 'marketing',
  'UTILITY': 'utility',
  'AUTHENTICATION': 'authentication',
};

// Endpoint YCloud: GET https://api.ycloud.com/v2/whatsapp/templates?wabaId={wabaId}
```

#### 2.2 `ycloud-templates-create` - Crear Nueva Plantilla

**Funcionalidad:**
- Recibir datos del template desde el frontend
- Enviar a YCloud API para aprobación de Meta
- Guardar en BD local con estado 'pending'

**Payload YCloud (según documentación):**
```typescript
{
  "wabaId": "tenant_waba_id",
  "name": "template_name_snake_case",
  "language": "es",
  "category": "MARKETING" | "UTILITY" | "AUTHENTICATION",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Hola {{1}}"
    },
    {
      "type": "BODY",
      "text": "Contenido del mensaje con {{1}} variables"
    },
    {
      "type": "FOOTER", 
      "text": "Responde STOP para cancelar"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Ver más",
          "url": "https://ejemplo.com/{{1}}"
        }
      ]
    }
  ]
}
```

#### 2.3 `ycloud-templates-delete` - Eliminar Plantilla

**Funcionalidad:**
- Eliminar template de YCloud (si existe)
- Eliminar de BD local

#### 2.4 `ycloud-send-message` - Enviar Mensaje con Template

**Funcionalidad:**
- Enviar mensaje individual usando plantilla aprobada
- Para campañas: procesar lista de destinatarios

**Payload YCloud:**
```typescript
// POST https://api.ycloud.com/v2/whatsapp/messages/sendDirectly
{
  "from": "phone_number_id",
  "to": "+521234567890",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": { "code": "es" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "text", "text": "Juan" }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "valor1" },
          { "type": "text", "text": "valor2" }
        ]
      }
    ]
  }
}
```

---

### Fase 3: Frontend - Conectar UI a Datos Reales

#### 3.1 Nuevo Hook: `useYCloudTemplates`

```typescript
// src/hooks/use-ycloud-templates.ts
export const useYCloudTemplates = () => {
  const { tenantId } = useEffectiveTenant();
  
  // Query para obtener templates de la BD (sincronizados desde YCloud)
  const templatesQuery = useQuery({
    queryKey: ['whatsapp-templates', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Mutación para sincronizar con YCloud
  const syncTemplates = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-sync');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
    },
  });

  // Mutación para crear template
  const createTemplate = useMutation({
    mutationFn: async (template: CreateTemplateInput) => {
      const { data, error } = await supabase.functions.invoke('ycloud-templates-create', {
        body: template,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-templates']);
    },
  });

  return { templatesQuery, syncTemplates, createTemplate };
};
```

#### 3.2 Nuevo Hook: `useYCloudConfig`

```typescript
// src/hooks/use-ycloud-config.ts
export const useYCloudConfig = () => {
  const { tenantId } = useEffectiveTenant();
  
  const configQuery = useQuery({
    queryKey: ['ycloud-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_ycloud_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const isConfigured = !!configQuery.data?.api_key;

  return { configQuery, isConfigured };
};
```

#### 3.3 Modificar `MarketingTemplates.tsx`

**Cambios principales:**
1. Reemplazar `mockWhatsAppTemplates` con datos de `useYCloudTemplates`
2. Agregar botón "Sincronizar con WhatsApp"
3. Mostrar banner si YCloud no está configurado
4. Conectar diálogo de creación con `createTemplate`

```typescript
// src/pages/MarketingTemplates.tsx
const MarketingTemplates = () => {
  const { templatesQuery, syncTemplates, createTemplate } = useYCloudTemplates();
  const { isConfigured } = useYCloudConfig();
  
  const templates = templatesQuery.data || [];
  const isLoading = templatesQuery.isLoading;
  const isSyncing = syncTemplates.isPending;
  
  // Si no está configurado, mostrar banner de configuración
  if (!isConfigured) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Plantillas" subtitle="..." />
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900">Configura tu cuenta de WhatsApp</p>
                <p className="text-sm text-amber-700">
                  Conecta tu cuenta de YCloud para gestionar plantillas de WhatsApp Business
                </p>
              </div>
              <Button onClick={() => navigate('/configuracion?tab=integraciones')}>
                Configurar
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plantillas"
          subtitle="Gestiona tus plantillas de WhatsApp Business"
          actions={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => syncTemplates.mutate()}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                Sincronizar
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear template
              </Button>
            </div>
          }
        />
        
        {/* Grid de templates - ahora con datos reales */}
        ...
      </div>
    </MainLayout>
  );
};
```

#### 3.4 Nueva Sección en Settings: Integraciones

**Nuevo componente:** `src/components/settings/YCloudIntegration.tsx`

```typescript
// Formulario para configurar YCloud:
// - API Key (campo password)
// - WABA ID (campo texto)
// - Teléfono (opcional)
// - Botón "Probar conexión" que llama a ycloud-templates-sync
// - Botón "Guardar"
```

**Modificar Settings.tsx** para agregar tab de "Integraciones"

---

### Fase 4: Diálogo de Creación de Template

**Nuevo componente:** `src/components/marketing/CreateTemplateDialog.tsx`

**Campos del formulario:**
1. **Nombre** - Solo letras minúsculas, números y guión bajo
2. **Categoría** - MARKETING, UTILITY, AUTHENTICATION
3. **Idioma** - es, en, pt, etc.
4. **Header** (opcional)
   - Tipo: Ninguno, Texto, Imagen, Video, Documento
   - Contenido según tipo
5. **Cuerpo** (requerido)
   - Textarea con soporte para variables {{1}}, {{2}}, etc.
   - Límite 1024 caracteres
6. **Footer** (opcional)
   - Texto, límite 60 caracteres
7. **Botones** (opcional)
   - Tipo: URL, Teléfono, Respuesta rápida
   - Hasta 3 botones

**Preview en tiempo real:**
- Mostrar cómo se verá el mensaje en WhatsApp
- Similar al diseño actual de las cards de template

---

## Mapeo de Datos YCloud <-> VEXA

### Categorías

| YCloud | VEXA (enum) |
|--------|-------------|
| MARKETING | marketing |
| UTILITY | utility |
| AUTHENTICATION | authentication |
| (default) | service |

### Estados

| YCloud | VEXA (enum) |
|--------|-------------|
| PENDING | pending |
| APPROVED | approved |
| REJECTED | rejected |
| PAUSED | rejected |
| DISABLED | rejected |
| IN_APPEAL | pending |
| DELETED | (eliminar de BD) |

### Componentes -> Campos

| YCloud Component | Campo VEXA |
|-----------------|------------|
| HEADER.text | header_content (header_type='TEXT') |
| HEADER.format IMAGE/VIDEO/DOC | header_type + header_content (URL) |
| BODY.text | body_text |
| FOOTER.text | footer_text |
| BUTTONS | buttons (JSON array) |

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Acción |
|------|---------|--------|
| Migration | `tenant_ycloud_config` table | Crear |
| Edge Function | `ycloud-templates-sync/index.ts` | Crear |
| Edge Function | `ycloud-templates-create/index.ts` | Crear |
| Edge Function | `ycloud-templates-delete/index.ts` | Crear |
| Edge Function | `ycloud-send-message/index.ts` | Crear |
| Config | `supabase/config.toml` | Agregar 4 nuevas funciones |
| Hook | `src/hooks/use-ycloud-templates.ts` | Crear |
| Hook | `src/hooks/use-ycloud-config.ts` | Crear |
| Component | `src/components/marketing/CreateTemplateDialog.tsx` | Crear |
| Component | `src/components/settings/YCloudIntegration.tsx` | Crear |
| Page | `src/pages/MarketingTemplates.tsx` | Modificar |
| Page | `src/pages/Settings.tsx` | Modificar (agregar tab) |

---

## Flujo de Usuario

### Configuración Inicial (una vez)
```text
1. Cliente va a Configuración → Integraciones
2. Ingresa API Key de YCloud y WABA ID
3. Sistema valida conexión llamando a YCloud API
4. Si es exitoso, guarda credenciales en BD
5. Sincroniza automáticamente las plantillas existentes
```

### Uso Diario
```text
1. Cliente va a Marketing → Plantillas
2. Ve lista de plantillas sincronizadas desde YCloud
3. Puede crear nueva plantilla:
   a. Completa formulario
   b. Envía a aprobación (botón)
   c. Plantilla aparece con estado "Pendiente"
4. Cuando Meta aprueba (24-48h), al sincronizar:
   a. Estado cambia a "Aprobada"
   b. Puede usar en campañas
5. Con plantilla aprobada:
   a. Puede crear campaña
   b. Seleccionar audiencia
   c. Programar o enviar inmediatamente
```

---

## Consideraciones de Seguridad

| Aspecto | Implementación |
|---------|----------------|
| API Key de YCloud | Almacenada en tabla con RLS |
| Acceso a credenciales | Solo vía Edge Functions (service_role) |
| RLS | Cada tenant solo ve su configuración y plantillas |
| Validación | JWT requerido en todas las Edge Functions |
| Rate limiting | YCloud tiene sus propios límites (respetar) |

---

## Tiempo Estimado

| Fase | Tiempo |
|------|--------|
| 1. Base de datos (tabla + RLS) | 30 min |
| 2. Edge Functions (4) | 4-5 horas |
| 3. Hooks frontend | 1 hora |
| 4. UI Settings (Integraciones) | 1.5 horas |
| 5. UI Templates (conectar) | 2 horas |
| 6. Diálogo crear template | 2 horas |
| 7. Testing E2E | 1.5 horas |
| **Total** | **~12-14 horas** |

---

## Requisitos Previos del Cliente

Para usar esta funcionalidad, cada cliente necesitará:

1. **Cuenta en YCloud** - https://www.ycloud.com
2. **WhatsApp Business Account (WABA)** conectada a YCloud
3. **Número de teléfono verificado** en Meta Business Suite
4. **API Key de YCloud** generada desde su dashboard
5. **Plan Pro de VEXA** - El módulo de Marketing requiere plan Pro

---

## Qué NO Cambia

| Componente | Estado |
|------------|--------|
| Tabla `whatsapp_templates` | Sin cambios (ya existe con estructura correcta) |
| Tabla `campaigns` | Sin cambios |
| Enums existentes | Sin cambios |
| n8n webhooks | Sin cambios |
| Otras Edge Functions | Sin cambios |
