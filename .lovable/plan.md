
# Plan: Corregir Scroll de Chat en Móvil

## Problema Identificado
En la vista móvil de la sección de Chats, cuando se abre una conversación:
- El scroll afecta toda la pantalla en lugar de solo el área de mensajes
- El header (número de teléfono, toggle de bot, badges) y el footer (input de mensaje) se ocultan al hacer scroll
- La navegación inferior también puede quedar tapada

## Causa Técnica
El contenedor del chat usa `h-[calc(100dvh-8rem)]` que no calcula correctamente la altura disponible considerando:
- TopBar: 56px (h-14)
- MobileNav: 64px (h-16) + safe-area
- Padding del MainLayout: 16px (p-4)

Además, el panel de chat necesita una estructura flex correcta donde el header y footer sean `shrink-0` y el área de mensajes ocupe el espacio restante con scroll interno.

## Solución Propuesta

### Cambios en `src/pages/Chats.tsx`

1. **Ajustar altura del contenedor principal en móvil:**
   - Cambiar de `h-[calc(100dvh-8rem)]` a un cálculo más preciso que considere TopBar (56px) + MobileNav (80px con safe-area) + padding
   - Usar `h-[calc(100dvh-3.5rem-5rem)]` = 100dvh - 56px (TopBar) - 80px (MobileNav+safe)

2. **Corregir estructura del chatPanel para móvil:**
   - Asegurar que el contenedor use `flex flex-col h-full overflow-hidden`
   - Header: agregar `shrink-0` (ya lo tiene pero verificar)
   - Footer/Input: agregar `shrink-0` (ya lo tiene)
   - ScrollArea de mensajes: usar `flex-1 min-h-0 overflow-hidden`

3. **Eliminar scroll externo:**
   - El contenedor padre debe tener `overflow-hidden` en móvil
   - Solo el ScrollArea interno de mensajes debe tener scroll

### Cambios Específicos

```text
Línea 1108 (contenedor principal):
Antes:  "h-[calc(100dvh-8rem)] -m-4 md:m-0 max-h-[calc(100dvh-8rem)] overflow-hidden"
Después: "h-[calc(100dvh-3.5rem-5rem)] -m-4 md:m-0 overflow-hidden"
```

```text
Líneas 1003-1006 (chatPanel wrapper):
Agregar overflow-hidden explícito y altura fija en móvil
```

```text
Línea 867 (ScrollArea de mensajes):
Cambiar de "flex-1 bg-secondary/30 min-h-0" 
A: "flex-1 min-h-0 overflow-hidden bg-secondary/30"
```

## Beneficios
- Header con info del chat siempre visible
- Input de mensaje siempre visible en la parte inferior
- Navegación inferior siempre accesible
- Solo los mensajes hacen scroll, no toda la pantalla
- Vista de escritorio no se ve afectada (solo se modifican estilos móviles)
