import { Settings } from 'lucide-react';

export default function PublicidadAjustes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuración del módulo de Publicidad
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-24 px-8">
        <div className="rounded-2xl bg-primary/10 p-4 mb-4">
          <Settings className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Próximamente</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Aquí podrás configurar integraciones, cuentas publicitarias y preferencias del módulo de Publicidad.
        </p>
      </div>
    </div>
  );
}
