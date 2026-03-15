# 🚀 Guía de Configuración para Nuevo Dominio y Hosting

Esta guía te ayudará a configurar el proyecto VEXA para un nuevo dominio y hosting.

## 📋 Prerrequisitos

1. **Nuevo proyecto Supabase** (o usar uno existente)
2. **Instancia de n8n** configurada (o usar la existente)
3. **Plataforma de hosting** para el frontend (Vercel, Netlify, etc.)

## 🔧 Paso 1: Configurar Variables de Entorno

### Frontend (Variables con prefijo `VITE_`)

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase - Configuración Principal
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_anon_aqui
VITE_SUPABASE_PROJECT_ID=tu_project_id_aqui

# Supabase - Cliente Externo (si usas uno diferente)
VITE_EXTERNAL_SUPABASE_URL=https://tu-proyecto-externo.supabase.co
VITE_EXTERNAL_SUPABASE_ANON_KEY=tu_clave_anon_externa_aqui

# n8n Webhooks
VITE_N8N_BASE_URL=https://tu-instancia-n8n.com
VITE_N8N_WEBHOOK_AGENT=/webhook/agente
VITE_N8N_WEBHOOK_SETTINGS=/webhook/tu-webhook-id-settings
VITE_N8N_WEBHOOK_HUMAN_MESSAGE=/webhook/tu-webhook-id-human
```

### Supabase Edge Functions

En el dashboard de Supabase, ve a **Settings > Edge Functions > Secrets** y configura:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_ANON_KEY=tu_anon_key
N8N_BASE_URL=https://tu-instancia-n8n.com
N8N_WEBHOOK_SETTINGS=/webhook/tu-webhook-id-settings
N8N_WEBHOOK_DEFAULT=/webhook/tu-webhook-default
```

## 🔄 Paso 2: Actualizar Configuración de Supabase

### Actualizar `supabase/config.toml`

Si estás usando un nuevo proyecto de Supabase, actualiza el `project_id` en `supabase/config.toml`:

```toml
project_id = "tu-nuevo-project-id"
```

### Migrar Base de Datos

Si necesitas migrar la base de datos al nuevo proyecto:

```bash
# 1. Conectar al nuevo proyecto
supabase link --project-ref tu-nuevo-project-ref

# 2. Aplicar migraciones
supabase db push
```

## 🌐 Paso 3: Configurar Hosting

### Opción A: Vercel

1. Conecta tu repositorio a Vercel
2. En **Settings > Environment Variables**, agrega todas las variables `VITE_*`
3. Configura el dominio personalizado en **Settings > Domains**

### Opción B: Netlify

1. Conecta tu repositorio a Netlify
2. En **Site settings > Environment variables**, agrega todas las variables `VITE_*`
3. Configura el dominio personalizado en **Domain settings**

### Opción C: Otro Hosting

Asegúrate de:
- Configurar las variables de entorno `VITE_*` en tu plataforma
- Configurar el dominio personalizado
- Configurar SSL/HTTPS

## 🔗 Paso 4: Actualizar URLs en n8n

Si estás usando una nueva instancia de n8n:

1. Actualiza los webhooks en n8n con las nuevas URLs
2. Actualiza las variables de entorno en n8n:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_KEY=tu_service_role_key
   ```

## ✅ Paso 5: Verificación

### Checklist de Verificación

- [ ] Variables de entorno configuradas en el frontend
- [ ] Variables de entorno configuradas en Supabase Edge Functions
- [ ] `project_id` actualizado en `supabase/config.toml` (si aplica)
- [ ] Base de datos migrada (si aplica)
- [ ] Dominio personalizado configurado
- [ ] SSL/HTTPS activado
- [ ] Webhooks de n8n actualizados
- [ ] Aplicación accesible desde el nuevo dominio

### Probar la Aplicación

1. **Autenticación**: Verifica que puedes iniciar sesión
2. **Dashboard**: Verifica que carga correctamente
3. **Ajustes del Agente**: Verifica que se guardan correctamente
4. **Webhooks**: Verifica que los webhooks se envían correctamente

## 🆘 Troubleshooting

### Error: "Invalid API key"
- Verifica que `VITE_SUPABASE_PUBLISHABLE_KEY` sea la clave **anon** (no service_role)
- Verifica que la URL de Supabase sea correcta

### Error: "CORS error"
- Verifica que el dominio esté agregado en Supabase Dashboard > Settings > API > CORS
- Agrega tu dominio a la lista de orígenes permitidos

### Webhooks no funcionan
- Verifica que las URLs de n8n sean correctas
- Verifica que los webhooks estén activos en n8n
- Revisa los logs de Supabase Edge Functions

### Variables de entorno no se cargan
- En Vite, las variables deben empezar con `VITE_`
- Reinicia el servidor de desarrollo después de cambiar `.env`
- En producción, verifica que las variables estén configuradas en tu plataforma de hosting

## 📝 Notas Importantes

1. **NUNCA** commitees el archivo `.env` real (debe estar en `.gitignore`)
2. Las variables que empiezan con `VITE_` son accesibles en el frontend
3. Para Supabase Edge Functions, usa variables sin el prefijo `VITE_`
4. Mantén las claves de servicio (`service_role`) seguras y nunca las expongas en el frontend

## 🔐 Seguridad

- Usa siempre HTTPS en producción
- No expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend
- Configura CORS correctamente en Supabase
- Usa variables de entorno para todas las configuraciones sensibles
