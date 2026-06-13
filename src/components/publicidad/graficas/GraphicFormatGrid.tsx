import { cn } from '@/lib/utils';
import { GRAPHIC_FORMATS, type GraphicFormatId } from '@/lib/publicidad/graficas/graphic-formats';

interface GraphicFormatGridProps {
  selectedId: GraphicFormatId;
  disabled?: boolean;
  onSelect: (id: GraphicFormatId) => void;
}

export function GraphicFormatGrid({ selectedId, disabled, onSelect }: GraphicFormatGridProps) {
  return (
    <div className="max-h-[min(50vh,420px)] overflow-y-auto scrollbar-thin -mx-1 px-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GRAPHIC_FORMATS.map(format => {
          const isSelected = selectedId === format.id;
          return (
            <button
              key={format.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(format.id as GraphicFormatId)}
              className={cn(
                'text-left rounded-lg border p-3 transition-all space-y-1.5',
                disabled && 'opacity-50 pointer-events-none',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/10 bg-secondary/30 hover:border-primary/30 hover:bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {format.nombre}
                </p>
                {format.badge && (
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                      format.badge === 'Recomendado'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-amber-500/20 text-amber-400',
                    )}
                  >
                    {format.badge}
                  </span>
                )}
              </div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground leading-snug">
                {format.tagline}
              </p>
              <p className="text-[9px] text-muted-foreground leading-snug line-clamp-4">
                {format.descripcion}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
