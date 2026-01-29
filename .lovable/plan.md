

# Plan: Actualizar Límites del Funnel de Conversaciones

## Cambio Solicitado

Modificar los umbrales de clasificación de sesiones en el funnel:

| Nivel | Antes | Después |
|-------|-------|---------|
| **TOFU** (Leads fríos) | 1-6 mensajes | 1-2 mensajes |
| **MOFU** (Leads tibios) | 7-10 mensajes | 3-8 mensajes |
| **Hot Leads** (Alta intención) | 11+ mensajes | 9+ mensajes |

---

## Archivo a Modificar

**`src/lib/api/conversation-counter.ts`**

### Código Actual (líneas 36-40)
```typescript
export function classifySession(messageCount: number): 'tofu' | 'mofu' | 'hot' {
  if (messageCount >= 11) return 'hot';
  if (messageCount >= 7) return 'mofu';
  return 'tofu';
}
```

### Código Nuevo
```typescript
export function classifySession(messageCount: number): 'tofu' | 'mofu' | 'hot' {
  if (messageCount >= 9) return 'hot';   // 9+ mensajes
  if (messageCount >= 3) return 'mofu';  // 3-8 mensajes
  return 'tofu';                          // 1-2 mensajes
}
```

---

## Impacto

- **Dashboard Principal**: El resumen del funnel de ventas usará los nuevos límites
- **Resultados → Métricas**: El "Funnel de Conversaciones" mostrará la nueva distribución
- **Facturación**: Sin impacto (usa conteo total, no clasificación)

---

## Consideraciones

Con los nuevos límites más estrictos:
- **TOFU será más pequeño**: Solo sesiones de 1-2 mensajes (probablemente abandonos rápidos)
- **MOFU será más grande**: Captura más sesiones intermedias (3-8 mensajes)
- **Hot Leads será más accesible**: Ahora con 9+ mensajes en vez de 11+

Esto puede resultar en una redistribución significativa de las conversaciones existentes.

