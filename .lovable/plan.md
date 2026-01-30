
# Plan: Sistema de Envío de Plantillas + Compra de Créditos

## Resumen

Implementar dos funcionalidades faltantes:

1. **Envío de mensajes con plantillas aprobadas** - Agregar un diálogo/modal para enviar mensajes desde plantillas aprobadas, ya sea individual o masivo
2. **Página de compra de créditos** - Redireccionar los botones "¿Cómo agregar créditos?" a una página de compra con Mercado Pago (preparada para cuando proporciones la API)

---

## Parte 1: Funcionalidad de Envío de Plantillas

### Estado Actual
- Las plantillas se muestran en cards pero no hay opción de "Enviar"
- La Edge Function `ycloud-send-message` ya está lista y soporta:
  - Envío individual (un destinatario)
  - Envío masivo (múltiples destinatarios)
  - Verificación de saldo
  - Descuento automático de créditos

### Cambios Requeridos

**Nuevo componente: `src/components/marketing/SendTemplateDialog.tsx`**

Diálogo para enviar mensajes con las siguientes secciones:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Enviar Plantilla: {nombre}                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📋 Modo de envío:                                                  │
│  ○ Envío individual (un número)                                     │
│  ○ Envío masivo (múltiples números)                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  [Si individual]                                                    │
│  Número de WhatsApp:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ +56 9 1234 5678                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Si masivo]                                                        │
│  Ingresa los números (uno por línea o separados por coma):         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ +56912345678                                                  │   │
│  │ +56998765432                                                  │   │
│  │ +56911111111                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Destinatarios detectados: 3                                        │
│                                                                     │
│  [Si plantilla tiene variables {{1}}, {{2}}, etc.]                 │
│  Variables del mensaje:                                             │
│  Variable 1: [_____________________]                                │
│  Variable 2: [_____________________]                                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💰 Resumen de costo:                                               │
│  • 3 mensajes × $0.15 (Marketing) = $0.45 USD                       │
│  • Tu saldo actual: $125.50 USD                                     │
│  • Saldo después del envío: $125.05 USD                             │
│                                                                     │
│  ⚠️ [Si saldo insuficiente]                                        │
│  No tienes saldo suficiente. [Agregar créditos]                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                       [Cancelar]  [Enviar Mensajes] │
└─────────────────────────────────────────────────────────────────────┘
```

**Modificar: `src/pages/MarketingTemplates.tsx`**

Agregar botón de envío en cada card de plantilla aprobada:

```typescript
// En cada card, agregar botón "Enviar" solo si status === 'approved'
{template.status === 'approved' && (
  <Button 
    size="sm" 
    onClick={() => openSendDialog(template)}
    className="gap-2"
  >
    <Send className="h-4 w-4" />
    Enviar
  </Button>
)}
```

**Nuevo hook: `src/hooks/use-send-template.ts`**

```typescript
export const useSendTemplate = () => {
  const sendMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      to, 
      bodyParameters 
    }: SendInput) => {
      const { data, error } = await supabase.functions.invoke('ycloud-send-message', {
        body: { templateId, to, bodyParameters },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Mensaje enviado correctamente');
      queryClient.invalidateQueries(['messaging-credits']);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar mensaje');
    },
  });

  return { sendMutation };
};
```

---

## Parte 2: Página de Compra de Créditos

### Cambios Requeridos

**Nueva página: `src/pages/MarketingBuyCredits.tsx`**

Página de compra de créditos preparada para Mercado Pago:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Marketing > Comprar Créditos                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tu saldo actual: $15.00 USD                                        │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💳 Selecciona el monto a recargar:                                 │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │    $20 USD     │  │    $50 USD     │  │   $100 USD     │        │
│  │ ~133 mensajes  │  │ ~333 mensajes  │  │ ~666 mensajes  │        │
│  │  Marketing     │  │  Marketing     │  │  Marketing     │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐                            │
│  │   $200 USD     │  │  Otro monto    │                            │
│  │ ~1333 mensajes │  │   [_______]    │                            │
│  │   +10% bonus   │  │                │                            │
│  └────────────────┘  └────────────────┘                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📊 Tabla de precios por mensaje:                                   │
│  • Marketing: $0.15 USD                                             │
│  • Utilidad: $0.04 USD                                              │
│  • Autenticación: $0.04 USD                                         │
│  • Servicio: Gratis                                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Monto seleccionado: $50 USD                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔒 Pagar con Mercado Pago                                   │   │
│  │                                                              │   │
│  │  [  Pagar $50 USD  ]                                         │   │
│  │                                                              │   │
│  │  Serás redirigido a Mercado Pago para completar el pago      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  💡 Los créditos se acreditan automáticamente al confirmar el pago  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Modificar: `src/pages/MarketingCredits.tsx`**

Cambiar los botones "¿Cómo agregar créditos?" y "Ir a Soporte" para que naveguen a la nueva página:

```typescript
// Antes:
<Button onClick={() => window.location.href = '/soporte'}>
  Ir a Soporte
</Button>

// Después:
<Button onClick={() => navigate('/marketing/comprar-creditos')}>
  Comprar Créditos
</Button>
```

**Modificar: `src/App.tsx`**

Agregar nueva ruta:

```typescript
<Route 
  path="/marketing/comprar-creditos" 
  element={
    <ProtectedRoute>
      <PremiumRoute feature="Compra de créditos">
        <MarketingBuyCredits />
      </PremiumRoute>
    </ProtectedRoute>
  } 
/>
```

---

## Estructura de Mercado Pago (Preparación)

La página de compra quedará preparada para integrar Mercado Pago cuando proporciones la API. El flujo será:

```text
1. Usuario selecciona monto ($20, $50, $100, $200, personalizado)
2. Click en "Pagar"
3. [FUTURO] Llamar Edge Function que crea preferencia de pago en MP
4. [FUTURO] Redirigir a checkout de Mercado Pago
5. [FUTURO] Webhook de MP notifica pago exitoso
6. [FUTURO] Edge Function acredita créditos al tenant
```

**Por ahora el botón mostrará:**
- Un mensaje indicando que el pago se procesará manualmente
- Instrucciones para contactar a VEXA
- El monto seleccionado se guarda para referencia

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/marketing/SendTemplateDialog.tsx` | Diálogo para enviar mensajes |
| `src/pages/MarketingBuyCredits.tsx` | Página de compra de créditos |
| `src/hooks/use-send-template.ts` | Hook para envío de mensajes |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/MarketingTemplates.tsx` | Agregar botón "Enviar" en cards aprobadas |
| `src/pages/MarketingCredits.tsx` | Cambiar botones a redirigir a compra |
| `src/App.tsx` | Agregar ruta `/marketing/comprar-creditos` |
| `src/components/layout/Sidebar.tsx` | Agregar enlace "Comprar" opcional |

---

## Flujo Completo del Usuario

### Enviar un Mensaje
```text
1. Usuario va a Marketing → Plantillas
2. Ve plantilla con estado "Aprobado"
3. Click en botón "Enviar"
4. Se abre diálogo con:
   - Campo para número(s) de WhatsApp
   - Variables si la plantilla las tiene
   - Resumen de costo
5. Confirma envío
6. Sistema verifica saldo → envía via YCloud → descuenta créditos
7. Toast de éxito/error
```

### Comprar Créditos
```text
1. Usuario va a Marketing → Créditos
2. Ve su saldo actual
3. Click en "¿Cómo agregar créditos?" o "Comprar Créditos"
4. Va a página de compra
5. Selecciona monto ($20, $50, $100, $200, o personalizado)
6. [FUTURO] Paga con Mercado Pago
7. [AHORA] Ve instrucciones para pago manual/contacto
```

---

## Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| SendTemplateDialog | 2 horas |
| Hook de envío | 30 min |
| Modificar MarketingTemplates | 30 min |
| MarketingBuyCredits | 1.5 horas |
| Modificar MarketingCredits | 15 min |
| Rutas y navegación | 15 min |
| **Total** | **~5 horas** |
