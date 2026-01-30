

# Plan: Preparación para Producción Pública (Sin tocar n8n ni admin email)

## Resumen

Este plan corrige **8 vulnerabilidades críticas de seguridad** en las políticas RLS y **1 vulnerabilidad de rutas desprotegidas**, sin afectar ninguna funcionalidad de n8n ni la configuración del admin email.

---

## Problema Identificado

Las siguientes tablas tienen políticas "Service role has full access" pero están asignadas al rol `public` en lugar de `service_role`:

| Tabla | Riesgo Actual |
|-------|---------------|
| `subscriptions` | Cualquiera puede ver planes/precios de todos los clientes |
| `tenant_webhooks` | URLs de webhooks expuestas públicamente |
| `tickets` | Tickets de soporte visibles para cualquiera |
| `ticket_messages` | Conversaciones de soporte expuestas |
| `agent_settings_ui` | Prompts de IA y configuración visible |
| `health_checks` | Estado de servicios expuesto |
| `invoices` | Facturas de todos los clientes visibles |
| `tenant_addons` | Addons activos expuestos |

Adicionalmente, las rutas de **VEXA Ads** no tienen protección de autenticación.

---

## Cambios Requeridos

### 1. Migración SQL: Corregir 8 Políticas RLS

**Acción:** Eliminar las políticas incorrectas y recrearlas asignadas a `service_role`.

```sql
-- ============================================
-- CORREGIR POLÍTICAS RLS - RESTRINGIR A service_role
-- ============================================

-- 1. agent_settings_ui
DROP POLICY IF EXISTS "Service role has full access" ON public.agent_settings_ui;
CREATE POLICY "Service role has full access" 
  ON public.agent_settings_ui 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. health_checks
DROP POLICY IF EXISTS "Service role has full access to health_checks" ON public.health_checks;
CREATE POLICY "Service role has full access to health_checks" 
  ON public.health_checks 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. invoices
DROP POLICY IF EXISTS "Service role has full access to invoices" ON public.invoices;
CREATE POLICY "Service role has full access to invoices" 
  ON public.invoices 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 4. subscriptions
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Service role has full access to subscriptions" 
  ON public.subscriptions 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 5. tenant_addons
DROP POLICY IF EXISTS "Service role has full access to tenant_addons" ON public.tenant_addons;
CREATE POLICY "Service role has full access to tenant_addons" 
  ON public.tenant_addons 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 6. tenant_webhooks
DROP POLICY IF EXISTS "Service role has full access to tenant_webhooks" ON public.tenant_webhooks;
CREATE POLICY "Service role has full access to tenant_webhooks" 
  ON public.tenant_webhooks 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 7. ticket_messages
DROP POLICY IF EXISTS "Service role has full access to ticket_messages" ON public.ticket_messages;
CREATE POLICY "Service role has full access to ticket_messages" 
  ON public.ticket_messages 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 8. tickets
DROP POLICY IF EXISTS "Service role has full access to tickets" ON public.tickets;
CREATE POLICY "Service role has full access to tickets" 
  ON public.tickets 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);
```

**Impacto:**
- Las Edge Functions seguirán funcionando (usan `service_role`)
- Los usuarios normales solo verán datos de su tenant (políticas existentes como `user_belongs_to_tenant` no se tocan)
- Usuarios no autenticados no podrán acceder a ninguna de estas tablas

---

### 2. Proteger Rutas VEXA Ads

**Archivo:** `src/App.tsx`

**Cambio:** Envolver todas las rutas `/vexa-ads/*` con `<ProtectedRoute>` y opcionalmente `<PremiumRoute>`.

```typescript
// ANTES (líneas 110-121):
<Route path="/vexa-ads" element={<VexaAdsOverview />} />
<Route path="/vexa-ads/diagnostico" element={<VexaAdsDiagnostico />} />
// ... etc

// DESPUÉS:
<Route path="/vexa-ads" element={<ProtectedRoute><VexaAdsOverview /></ProtectedRoute>} />
<Route path="/vexa-ads/diagnostico" element={<ProtectedRoute><VexaAdsDiagnostico /></ProtectedRoute>} />
<Route path="/vexa-ads/estrategia" element={<ProtectedRoute><VexaAdsEstrategia /></ProtectedRoute>} />
<Route path="/vexa-ads/creativos" element={<ProtectedRoute><VexaAdsCreativos /></ProtectedRoute>} />
<Route path="/vexa-ads/campanas" element={<ProtectedRoute><VexaAdsCampanas /></ProtectedRoute>} />
<Route path="/vexa-ads/campanas/presupuesto" element={<ProtectedRoute><VexaAdsCampanas /></ProtectedRoute>} />
<Route path="/vexa-ads/analisis" element={<ProtectedRoute><VexaAdsAnalisis /></ProtectedRoute>} />
<Route path="/vexa-ads/recomendaciones" element={<ProtectedRoute><VexaAdsRecomendaciones /></ProtectedRoute>} />
<Route path="/vexa-ads/recomendaciones/video" element={<ProtectedRoute><VexaAdsVideoAsesor /></ProtectedRoute>} />
<Route path="/vexa-ads/configuracion" element={<ProtectedRoute><VexaAdsConfiguracion /></ProtectedRoute>} />
```

---

### 3. Habilitar Protección de Contraseñas Filtradas

**Acción:** Habilitar la verificación de contraseñas comprometidas en la configuración de autenticación.

Esta es una configuración de Lovable Cloud que se habilita desde el panel.

---

## Lo Que NO Se Toca

| Componente | Estado |
|------------|--------|
| URLs de webhooks n8n | Sin cambios |
| Edge Functions (human-message-proxy, webhook-n8n-proxy) | Sin cambios |
| Admin email hardcodeado | Sin cambios |
| Configuración de CORS | Sin cambios |
| Políticas RLS de usuarios (`user_belongs_to_tenant`) | Sin cambios |

---

## Resumen de Archivos

| Tipo | Archivo/Acción |
|------|----------------|
| SQL Migration | Nueva migración para corregir 8 políticas RLS |
| Frontend | `src/App.tsx` - Proteger rutas VEXA Ads |
| Config | Habilitar password protection (Lovable Cloud) |

---

## Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Migración SQL (8 políticas) | 10 min |
| Proteger rutas VEXA Ads | 5 min |
| Habilitar password protection | 2 min |
| **Total** | **~20 minutos** |

---

## Validación Post-Implementación

1. **Test RLS:** Intentar acceder a `/rest/v1/subscriptions` sin autenticación → debe retornar array vacío o error 401
2. **Test VEXA Ads:** Intentar navegar a `/vexa-ads` sin login → debe redirigir a `/auth`
3. **Test funcionamiento normal:** Verificar que el cliente existente sigue operando correctamente

---

## Estado Final de Seguridad

Después de estos cambios:

| Aspecto | Estado |
|---------|--------|
| RLS en tablas sensibles | Restringido a `service_role` + usuarios de tenant |
| Rutas protegidas | Todas requieren autenticación |
| Aislamiento multi-tenant | Funcionando (sin cambios) |
| Edge Functions | Funcionando (sin cambios) |
| n8n integración | Funcionando (sin cambios) |

La plataforma estará lista para recibir clientes públicos con un nivel de seguridad apropiado para producción.

