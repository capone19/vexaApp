
# Plan: Funnel Cards en grilla 2x2 en mobile

## Cambio

Reemplazar el scroll horizontal de los 4 cards del funnel (TOFU, MOFU, HOT LEADS, BOFU) por una grilla 2x2 en la vista mobile.

## Archivo a modificar

`src/pages/Dashboard.tsx` (lineas 254-279)

## Cambio tecnico

Reemplazar el bloque mobile actual (ScrollArea con flex horizontal) por un `div` con grid 2x2:

```tsx
// Antes: ScrollArea con flex horizontal y scroll
// Despues:
<div className="grid grid-cols-2 gap-3 mb-4">
  {funnelStages.map((stage) => (
    <div key={stage.label} className={`rounded-xl border p-3 ${stage.bgColor}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`rounded-md p-1 ${stage.iconBg}`}>
          <stage.icon className={`h-3 w-3 ${stage.iconColor}`} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {stage.label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground mb-0.5">
        {typeof stage.value === 'number' ? stage.value.toLocaleString() : stage.value}
      </p>
      <p className="text-[10px] text-muted-foreground">{stage.sublabel}</p>
    </div>
  ))}
</div>
```

### Diferencias clave vs. el actual:
- **Grid 2x2** (`grid grid-cols-2`) en vez de `flex` horizontal con scroll
- **Sin ScrollArea** ni ScrollBar
- **Sin flechas** entre cards (no caben en 2x2 y no aportan en esta disposicion)
- **Padding reducido** (`p-3` en vez de `p-4`) para que los 4 cards quepan bien
- **Texto ligeramente mas compacto** (`text-xl` en vez de `text-2xl`) para evitar desborde
- **Iconos un poco mas pequenos** (`h-3 w-3` y `p-1`)

### Sin cambios en:
- Vista desktop (el bloque `else` de lineas 280-302 queda intacto)
- Colores, datos, metricas, rates, ni ningun otro componente
