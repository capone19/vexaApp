

# Plan: Corregir Atribución usando Session ID

## Problema Identificado

El hook `use-marketing-performance.ts` actualmente intenta hacer match usando `contact_phone`, pero según la estructura de la base de datos:

| Campo | Ejemplo | Descripción |
|-------|---------|-------------|
| `session_id` | `5695961350@s.whatsapp.net` | Número sin `+`, con sufijo de plataforma |
| `contact_phone` | Puede estar vacío o incompleto | No siempre disponible |

Los **recipients** guardados en `messaging_transactions` tienen formato con `+` (ej: `+5695961350`).

## Solución

Modificar la función de normalización para:
1. Extraer el número de teléfono del `session_id` (antes del `@` o `.`)
2. Comparar con los recipients normalizados (solo dígitos)

---

## Cambios en `src/hooks/use-marketing-performance.ts`

### 1. Nueva función para extraer teléfono del session_id

```typescript
/**
 * Extrae el número de teléfono del session_id
 * Formatos soportados:
 * - 5695961350@s.whatsapp.net -> 5695961350
 * - 6630543458467.shopify -> 6630543458467
 * - 6612090519715.Whatsapp -> 6612090519715
 */
function extractPhoneFromSessionId(sessionId: string | null): string {
  if (!sessionId) return '';
  
  // Remover sufijos de plataforma (@s.whatsapp.net, .shopify, .Whatsapp, etc.)
  // Buscar el primer separador (@ o .)
  const atIndex = sessionId.indexOf('@');
  const dotIndex = sessionId.indexOf('.');
  
  let phone = sessionId;
  
  if (atIndex > 0) {
    phone = sessionId.substring(0, atIndex);
  } else if (dotIndex > 0) {
    phone = sessionId.substring(0, dotIndex);
  }
  
  // Solo dejar dígitos
  return phone.replace(/\D/g, '');
}
```

### 2. Actualizar normalizePhone para comparación

```typescript
/**
 * Normaliza un número de teléfono para comparación
 * Devuelve solo dígitos (sin +)
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  // Remover todo excepto números
  return phone.replace(/\D/g, '');
}
```

### 3. Modificar la lógica de atribución

En vez de usar `booking.contact_phone`, usar `booking.session_id`:

```typescript
bookings.forEach(booking => {
  // Extraer teléfono del session_id
  const bookingPhone = extractPhoneFromSessionId(booking.session_id);
  if (!bookingPhone) return;
  
  // Buscar en el mapa de envíos
  const sends = sendsByPhone.get(bookingPhone);
  // ... resto de la lógica igual
});
```

---

## Resumen de Cambios

| Ubicación | Cambio |
|-----------|--------|
| Línea 69-82 | Reemplazar `normalizePhone` para devolver solo dígitos |
| Después de línea 82 | Agregar nueva función `extractPhoneFromSessionId` |
| Línea 198-200 | Usar `normalizePhone` sin el `+` |
| Línea 221 | Cambiar de `booking.contact_phone` a `booking.session_id` usando `extractPhoneFromSessionId` |

---

## Ejemplo de Matching

| Template enviado a | Booking session_id | Match? |
|--------------------|-------------------|--------|
| `+5695961350` | `5695961350@s.whatsapp.net` | Si (ambos = `5695961350`) |
| `+56912345678` | `56912345678.shopify` | Si |
| `+56998877665` | `56998877665.Whatsapp` | Si |

