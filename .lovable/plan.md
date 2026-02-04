
# Plan: Indicador "Bot desactivado" en la Lista de Chats

## Objetivo
Agregar un indicador visual discreto en cada item de la lista de chats cuando el bot esté desactivado para ese chat específico. Esto permitirá identificar rápidamente qué conversaciones están siendo atendidas solo por humanos.

## Análisis

### Estado Actual
- Cada sesión de chat ya tiene la propiedad `botEnabled: boolean` en la interfaz `N8nSession`
- Este valor se obtiene de `botStates[session_id]` (desde la base de datos)
- La lista de chats se renderiza en las líneas 647-710 de `Chats.tsx`
- Actualmente muestra: número de teléfono, hora, último mensaje, y badges de etiquetas

### Ubicación del Indicador
Propuesta: **A la izquierda del timestamp**, como un icono pequeño de Bot tachado o un texto minimalista "Bot off". Esta ubicación:
- Es visible pero no invasiva
- No rompe el layout existente
- Se alinea con la información temporal

## Diseño Visual

```text
┌─────────────────────────────────────────────┐
│ 👤 +56957024130           🤖❌ 18:38  ⊙   │
│    ¡Hola! 👋 Soy parte del equipo de Vexa... │
│    [Alta intención] [Etiqueta]              │
└─────────────────────────────────────────────┘
```

**Opciones de indicador (ordenadas por preferencia):**
1. Icono `Bot` con slash/tachado + tooltip explicativo
2. Badge pequeño "Bot off" en gris/muted
3. Icono `BotOff` de lucide (si existe)

**Colores:** Usaremos `text-muted-foreground` o `text-amber-500/70` para que sea visible pero no distraiga.

## Cambios Técnicos

### Archivo: `src/pages/Chats.tsx`

**1. Agregar icono al import (si no existe):**
Verificar que `Bot` ya está importado (línea 23). Podemos usar `Bot` con estilo de "deshabilitado" o `BotOff` si lucide lo tiene.

**2. Modificar el área del timestamp (líneas 665-671):**

```tsx
// Antes:
<div className="flex items-center justify-between mb-1">
  <span className="font-medium text-sm text-foreground truncate">
    {session.phoneNumber}
  </span>
  <span className="text-xs text-muted-foreground shrink-0 ml-2">
    {formatWhatsAppTimestamp(session.lastMessageAt)}
  </span>
</div>

// Después:
<div className="flex items-center justify-between mb-1">
  <span className="font-medium text-sm text-foreground truncate">
    {session.phoneNumber}
  </span>
  <div className="flex items-center gap-1.5 shrink-0 ml-2">
    {!session.botEnabled && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center text-amber-500/70">
              <Bot className="h-3 w-3" />
              <span className="text-[10px] relative -ml-0.5 -mt-1 font-bold">✕</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Bot desactivado</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
    <span className="text-xs text-muted-foreground">
      {formatWhatsAppTimestamp(session.lastMessageAt)}
    </span>
  </div>
</div>
```

## Alternativa Más Simple (sin tooltip)

Si preferimos algo más ligero:

```tsx
{!session.botEnabled && (
  <span className="text-[10px] text-amber-500/70 font-medium">
    Bot off
  </span>
)}
```

## Resultado Esperado
- Los chats con bot desactivado mostrarán un pequeño indicador visual a la izquierda del horario
- El indicador será discreto pero fácilmente identificable
- No afectará el layout en móvil ni desktop
- Proporciona contexto rápido sin necesidad de abrir cada chat

## Impacto
- **Bajo riesgo**: Solo se agrega un elemento condicional al JSX existente
- **Sin cambios de lógica**: La propiedad `botEnabled` ya existe y está calculada
- **Responsive**: El indicador se adaptará al tamaño de texto existente
