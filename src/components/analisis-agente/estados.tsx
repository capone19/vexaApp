import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EstadoVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-base font-semibold text-foreground">{titulo}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

export function EstadoError({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  const mensaje = error instanceof Error ? error.message : 'Error desconocido';
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <h3 className="mb-1 text-base font-semibold text-foreground">No se pudieron cargar los datos</h3>
        <p className="mb-4 max-w-md break-words text-sm text-muted-foreground">{mensaje}</p>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}

export function EsqueletoTarjetas({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 6 }: { filas?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: filas }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
