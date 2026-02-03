
## Objetivo (solo móvil)
- Eliminar el “auto scroll” del **body** al abrir un chat.
- Mantener **header superior** y **footer/input** siempre visibles.
- Hacer que el **único scroll (manual y automático al último mensaje)** ocurra dentro de la ventana interna de mensajes (ScrollArea), no en la página.

---

## Diagnóstico (qué está pasando ahora)
En `src/pages/Chats.tsx` hay este efecto:

- `messagesEndRef.current.scrollIntoView({ behavior: "smooth" })`

`scrollIntoView()` busca el contenedor scrolleable más cercano. En algunos casos (especialmente en móvil con layout y alturas calculadas), termina usando el **scroll del documento/body** o del contenedor externo, lo que provoca:
- “me entra scrolleado a la fuerza el body”
- y, a la vez, el mensaje final no queda correctamente scrolleado dentro del panel.

Además, el efecto depende de `messages` (toda la lista global), así que se dispara en muchos momentos, no solo cuando cambian los mensajes de la sesión activa.

---

## Enfoque de solución
### Cambiar el auto-scroll para que apunte explícitamente al viewport real del ScrollArea
En vez de `scrollIntoView`, vamos a:
1. Poner un `ref` al `<ScrollArea ...>` del panel de mensajes (Root).
2. Dentro del `useEffect`, localizar el viewport interno real de Radix:
   - selector: `[data-radix-scroll-area-viewport]`
3. Hacer `viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })`

Esto fuerza el scroll dentro del panel, sin tocar el body.

### Reducir cuándo se dispara el auto-scroll
Cambiar dependencias del effect para que use:
- `selectedSessionId`
- `selectedMessages.length` (o similar)
en lugar de `messages` completo.

Y aplicar un “micro delay” para asegurar que el DOM ya renderizó antes de scrollear:
- `requestAnimationFrame` (1-2 frames) o `setTimeout(0)`

---

## Cambios concretos (archivo)
### 1) `src/pages/Chats.tsx`
**A. Agregar ref del ScrollArea**
- `const messagesScrollAreaRef = useRef<HTMLDivElement>(null);`

**B. En el JSX del ScrollArea de mensajes**
- Pasar `ref={messagesScrollAreaRef}` al `<ScrollArea ...>`

**C. Reemplazar el auto-scroll actual**
- Reemplazar:
  - `messagesEndRef.current.scrollIntoView(...)`
- Por:
  - `const viewport = messagesScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;`
  - `viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })`

**D. Ajustar dependencias**
- Cambiar el effect a depender de:
  - `selectedSessionId`
  - `selectedMessages.length` (o un timestamp/lastMessageId si existe)
- Evitar depender de `messages` completo.

**E. (Opcional pero recomendado) Auto-scroll solo si estás “cerca del final”**
Para que si el usuario está leyendo mensajes viejos, no lo “arrastre” al final cada vez que llega algo:
- detectar si `viewport.scrollTop` está cerca de `viewport.scrollHeight - viewport.clientHeight`
- si está cerca, auto-scrollear; si no, no.

---

## Validación (qué probar en la UI)
1. En móvil, entrar a `/chats` y abrir una conversación:
   - el **body no debe moverse** solo (sin salto de scroll).
2. Confirmar:
   - header superior del chat siempre visible
   - footer/input siempre visible
   - el scroll manual solo mueve la lista de mensajes
3. Al abrir un chat, debe llevarte al último mensaje dentro del panel.
4. Cuando llegan mensajes nuevos:
   - si estás abajo, que siga bajando solo
   - si estás leyendo arriba, que no te fuerce a bajar (si implementamos la lógica opcional)

---

## Riesgo / Impacto en desktop
- Nulo: el cambio afecta únicamente al comportamiento de auto-scroll y al contenedor interno de mensajes; el layout desktop no se toca.

---

## Resultado esperado
- Scroll 100% aislado dentro del panel de mensajes.
- Header/footer fijos siempre visibles.
- Auto-scroll al último mensaje consistente, sin “secuestrar” el scroll del body.
