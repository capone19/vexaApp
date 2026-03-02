

# Plan: Bloquear visualización/impersonación de NOMAD CHILE

## Cambio

En la tabla de clientes del panel admin, ocultar el botón de "Ver como cliente" (ícono Eye) exclusivamente para el tenant NOMAD CHILE (`557bd366-37e7-4155-82f8-b10d4c31ac72`), de modo que el admin no pueda entrar a su perfil ni ver que está bloqueado.

## Archivo a modificar

`src/pages/admin/AdminClients.tsx` (lineas 527-547)

## Cambio técnico

Dentro del `TableCell` de "Acción", envolver el botón de impersonación en una condición que verifique si el tenant NO es el ID bloqueado. Si es NOMAD CHILE, mostrar una celda vacía (sin botón).

```tsx
<TableCell>
  {tenant.id !== '557bd366-37e7-4155-82f8-b10d4c31ac72' ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleImpersonate(tenant)}
          disabled={!!impersonatingId}
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
        >
          {isCurrentlyImpersonating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Ver como cliente</p>
      </TooltipContent>
    </Tooltip>
  ) : null}
</TableCell>
```

- Solo afecta al tenant con ID `557bd366-37e7-4155-82f8-b10d4c31ac72` (NOMAD CHILE)
- Todos los demás clientes mantienen el botón Eye sin cambios
- No se modifica ningún otro componente ni lógica
