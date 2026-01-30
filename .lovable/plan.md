
# Plan: Formato de Timestamps Estilo WhatsApp + Restricción de Ventana 24 Horas

## Resumen

Implementar dos mejoras en la página de Chats:

1. **Formato de timestamps estilo WhatsApp** en la lista de sesiones y dentro de los mensajes
2. **Bloqueo del input después de 23 horas** para cumplir con la ventana de 24 horas de Meta, mostrando un botón que lleva a plantillas

---

## Parte 1: Formato de Timestamps Estilo WhatsApp

### Lógica de Formateo

| Tiempo transcurrido | Formato a mostrar |
|---------------------|-------------------|
| Menos de 24 horas | Hora exacta: `HH:mm` (ej: "14:32") |
| Entre 24-48 horas (ayer) | `Ayer` |
| Más de 48 horas, menos de 7 días | Día de la semana: `Lunes`, `Martes`, etc. |
| Más de 7 días | Fecha corta: `YY-MM-DD` (ej: "25-01-30") |

### Implementación

**Crear función helper en `src/pages/Chats.tsx`:**

```typescript
import { 
  format, 
  isToday, 
  isYesterday, 
  differenceInDays 
} from "date-fns";
import { es } from "date-fns/locale";

// Formatear timestamp estilo WhatsApp
function formatWhatsAppTimestamp(date: Date): string {
  const now = new Date();
  
  // Hoy: mostrar hora
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: es });
  }
  
  // Ayer
  if (isYesterday(date)) {
    return "Ayer";
  }
  
  // Dentro de la última semana: día de la semana
  const daysDiff = differenceInDays(now, date);
  if (daysDiff < 7) {
    return format(date, "EEEE", { locale: es }); // Lunes, Martes, etc.
  }
  
  // Más de 7 días: formato YY-MM-DD
  return format(date, "yy-MM-dd");
}
```

### Archivos a Modificar

| Ubicación | Cambio |
|-----------|--------|
| **Lista de sesiones** (línea ~598) | Cambiar `format(session.lastMessageAt, "HH:mm")` por `formatWhatsAppTimestamp(session.lastMessageAt)` |
| **Mensajes individuales** (línea ~869) | Mantener `HH:mm` ya que está dentro del día actual de la conversación |

---

## Parte 2: Restricción de Ventana 24 Horas (23 horas)

### Lógica

Cuando han pasado **23 horas o más** desde el último mensaje del cliente (tipo `human`), el input de mensaje se deshabilita y se muestra un botón para ir a plantillas.

### Implementación

**1. Calcular si la ventana expiró:**

```typescript
import { differenceInHours } from "date-fns";

// Dentro del componente, calcular si pasaron 23+ horas
const lastClientMessageTime = useMemo(() => {
  if (!selectedSessionId) return null;
  
  // Buscar el último mensaje del cliente (type === 'human')
  const clientMessages = messages
    .filter(m => m.session_id === selectedSessionId && m.message?.type === 'human')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return clientMessages.length > 0 ? new Date(clientMessages[0].created_at) : null;
}, [messages, selectedSessionId]);

const isWindowExpired = useMemo(() => {
  if (!lastClientMessageTime) return true; // Sin mensajes del cliente = ventana cerrada
  return differenceInHours(new Date(), lastClientMessageTime) >= 23;
}, [lastClientMessageTime]);
```

**2. Modificar el área de input (líneas ~894-929):**

```typescript
{(() => {
  const isBotActive = botStates[selectedSessionId] ?? true;
  
  // Si pasaron 23+ horas, mostrar botón de plantillas
  if (isWindowExpired) {
    return (
      <div className="p-3 md:p-4 border-t border-border bg-background">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Han pasado más de 24 horas desde el último mensaje del cliente.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Para enviar un mensaje, usa una plantilla aprobada.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/marketing/plantillas')}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Ir a Plantillas
          </Button>
        </div>
      </div>
    );
  }
  
  // Input normal cuando la ventana está activa
  return (
    <div className="p-3 md:p-4 border-t border-border bg-background">
      {/* ... input existente ... */}
    </div>
  );
})()}
```

---

## Diagrama de Flujo

```text
┌─────────────────────────────────────────────────────────────┐
│                    Usuario Abre Chat                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  ¿Último mensaje del cliente < 23 hrs? │
         └────────────────────────────────────────┘
                    │                    │
                   SÍ                   NO
                    │                    │
                    ▼                    ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │   Mostrar Input       │   │  Mostrar mensaje de   │
    │   normal de mensaje   │   │  "ventana expirada"   │
    │   (según bot toggle)  │   │  + Botón "Ir a        │
    │                       │   │    Plantillas"        │
    └───────────────────────┘   └───────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/Chats.tsx` | • Agregar imports de `isToday`, `isYesterday`, `differenceInDays`, `differenceInHours`<br>• Agregar función `formatWhatsAppTimestamp`<br>• Agregar `useNavigate` hook<br>• Agregar cálculo de `lastClientMessageTime` y `isWindowExpired`<br>• Modificar timestamp en lista de sesiones<br>• Modificar área de input para manejar ventana expirada |

---

## Resumen de Imports a Agregar

```typescript
// Al inicio del archivo
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  isToday, 
  isYesterday, 
  differenceInDays,
  differenceInHours 
} from "date-fns";
```

---

## Resultado Esperado

**Lista de Sesiones:**
- Mensajes de hoy: `14:32`
- Mensajes de ayer: `Ayer`  
- Hace 3 días: `Lunes`
- Hace 2 semanas: `25-01-15`

**Input de Mensaje:**
- Si última respuesta del cliente < 23 hrs → Input habilitado (según estado del bot)
- Si última respuesta del cliente ≥ 23 hrs → Mensaje de advertencia + Botón "Ir a Plantillas"
