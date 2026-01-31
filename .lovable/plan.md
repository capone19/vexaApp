

# Plan: Sistema de Reportes por Plan + Gestión Admin

## Resumen

Implementar un sistema de reportes que:
1. Active automáticamente reportes según el plan del cliente
2. Permita a cualquier cliente agregar reportes adicionales por $9/mes
3. Agregue columna en Admin para gestionar reportes manualmente
4. Redirija a pasarela de pago (placeholder para Mercado Pago)

---

## Reglas de Negocio - Reportes por Plan

| ID del Reporte | Basic | Pro | Enterprise | Addon |
|----------------|-------|-----|------------|-------|
| `agent-performance` | Si | Si | Si | $9 |
| `conversational-metrics` | - | Si | Si | $9 |
| `unconverted-leads` | - | - | Si | $9 |
| `converted-sales` | - | - | - | $9 |
| `meta-ads` | - | - | - | $9 |
| `ad-advisor` | - | - | - | $29 |

---

## Parte 1: Modificar la Definición de Reportes

**Archivo**: `src/pages/Reports.tsx`

Corregir el array `reportTypes` para reflejar las reglas correctas:

```typescript
const reportTypes: ReportType[] = [
  {
    id: 'agent-performance',
    title: 'Análisis de rendimiento del agente',
    includedIn: ['basic', 'pro', 'enterprise'], // Incluido en TODOS
    price: 9,  // Precio como addon
    isPremiumAddon: false,
  },
  {
    id: 'conversational-metrics',
    title: 'Analítica de métricas conversacionales',
    includedIn: ['pro', 'enterprise'], // Solo Pro y Enterprise
    price: 9,
    isPremiumAddon: true,
  },
  {
    id: 'unconverted-leads',
    title: 'Clientes potenciales no convertidos',
    includedIn: ['enterprise'], // Solo Enterprise
    price: 9,
    isPremiumAddon: true,
  },
  // Los demás solo addon...
];
```

---

## Parte 2: Cargar Plan y Addons Reales del Tenant

El componente actual usa `getCurrentPlan()` de localStorage, pero necesitamos el plan real del tenant desde Supabase.

### Nuevo Hook: `src/hooks/use-tenant-reports.ts`

```typescript
interface TenantReportsAccess {
  plan: PlanId;
  purchasedAddons: string[]; // IDs de reportes comprados
  isLoading: boolean;
}

export function useTenantReports(): TenantReportsAccess {
  // 1. Obtener plan desde useSubscription
  // 2. Obtener addons comprados desde tenant_addons table
  // 3. Devolver lista de reportes habilitados
}
```

Este hook:
- Usa `useSubscription()` para obtener el plan real
- Consulta `tenant_addons` para ver qué reportes están comprados
- Soporta impersonación (admin ve los datos del cliente)

---

## Parte 3: Pasarela de Pago (Placeholder)

Crear una página simple para el flujo de compra que después se conectará a Mercado Pago:

### Nueva Página: `src/pages/ReportCheckout.tsx`

```typescript
// Página de checkout para comprar un reporte
// Recibe el report_id como parámetro de URL
// Muestra resumen y botón de pagar (placeholder)

const ReportCheckout = () => {
  const { reportId } = useParams();
  
  // Mostrar detalles del reporte
  // Mostrar precio ($9/mes)
  // Botón "Pagar con Mercado Pago" (placeholder)
  // Al completar: insertar en tenant_addons
};
```

### Flujo de Compra

```text
Usuario hace clic en "Agregar" en Reports
         │
         ▼
Navegar a /reportes/checkout/{report-id}
         │
         ▼
Página muestra resumen del reporte
         │
         ▼
Botón "Pagar $9/mes" (placeholder)
         │
         ▼
[Futuro: Integración Mercado Pago]
         │
         ▼
Insertar registro en tenant_addons
         │
         ▼
Redirigir a /reportes con toast de éxito
```

---

## Parte 4: Panel Admin - Columna Reportes

**Archivo**: `src/pages/admin/AdminClients.tsx`

Agregar una columna al final de la tabla para gestionar los reportes de cada cliente.

### Nueva Columna "Reportes"

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ... otras columnas ...  │ VEXA Ads │ Reportes                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                         │ [Switch] │ 1/3 incluidos                          │
│                         │          │ [Ver/Editar]                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

Al hacer clic en "Ver/Editar" se abre un Dialog con:

```text
┌────────────────────────────────────────────────────────────────┐
│  Reportes de "Growth Partners" (Plan Pro)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [x] Rendimiento del agente          (incluido en plan)        │
│  [x] Métricas conversacionales       (incluido en plan)        │
│  [ ] Clientes potenciales no conv.   [Activar manualmente]     │
│  [ ] Clientes convertidos            [Activar manualmente]     │
│  [ ] Marketing / Meta Ads            [Activar manualmente]     │
│  [ ] Asesor publicitario             [Activar manualmente]     │
│                                                                │
│  [Guardar cambios]                                             │
└────────────────────────────────────────────────────────────────┘
```

### Nuevas Funciones Necesarias

1. **Edge Function**: `admin-manage-tenant-addons`
   - Permite al admin agregar/quitar addons de un tenant
   - Inserta/elimina registros en `tenant_addons`

2. **Modificar**: `admin-list-tenants`
   - Incluir los addons de cada tenant en la respuesta

---

## Parte 5: Actualizar tabla Comparativa

En Reports.tsx, actualizar la tabla de comparación para mostrar correctamente qué está incluido:

```text
Reporte                    │ Básico │ Pro │ Enterprise │ Addon
─────────────────────────────────────────────────────────────────
Rendimiento del agente     │   ✓    │  ✓  │     ✓      │ +$9
Métricas conversacionales  │   ✗    │  ✓  │     ✓      │ +$9
Clientes no convertidos    │   ✗    │  ✗  │     ✓      │ +$9
Clientes convertidos       │   ✗    │  ✗  │     ✗      │ +$9
Marketing / Meta Ads       │   ✗    │  ✗  │     ✗      │ +$9
Asesor publicitario        │   ✗    │  ✗  │     ✗      │ +$29
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/Reports.tsx` | **Modificar** | Corregir reglas de inclusión, usar plan real, redirigir a checkout |
| `src/hooks/use-tenant-reports.ts` | **Crear** | Hook para obtener plan real y addons comprados |
| `src/pages/ReportCheckout.tsx` | **Crear** | Página de checkout (placeholder Mercado Pago) |
| `src/App.tsx` | **Modificar** | Agregar ruta `/reportes/checkout/:reportId` |
| `src/pages/admin/AdminClients.tsx` | **Modificar** | Agregar columna Reportes con Dialog |
| `supabase/functions/admin-list-tenants/index.ts` | **Modificar** | Incluir addons del tenant |
| `supabase/functions/admin-manage-tenant-addons/index.ts` | **Crear** | Edge function para gestionar addons |

---

## Detalles Técnicos

### Estructura de tenant_addons

Ya existe la tabla `tenant_addons` con campos:
- `tenant_id` - UUID del tenant
- `addon_id` - ID del reporte (ej: "agent-performance")
- `price_usd` - Precio mensual
- `status` - 'active' | 'cancelled'

### Consulta para verificar acceso a un reporte

```typescript
function hasReportAccess(report: ReportType, plan: PlanId, addons: string[]): boolean {
  // 1. Incluido en el plan
  if (report.includedIn.includes(plan)) return true;
  
  // 2. Comprado como addon
  if (addons.includes(report.id)) return true;
  
  return false;
}
```

### Logica en Admin para mostrar estado

```typescript
function getReportStatusForTenant(tenant: Tenant): string {
  const planReports = getIncludedReportsForPlan(tenant.plan);
  const addonReports = tenant.addons?.filter(a => a.status === 'active').length || 0;
  
  return `${planReports}/${TOTAL_REPORTS} + ${addonReports} addons`;
}
```

