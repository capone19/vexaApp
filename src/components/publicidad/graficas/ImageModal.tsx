import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Generation } from '@/lib/publicidad/graficas/types';
import { getGraphicTypeLabel, getModelLabel } from '@/lib/publicidad/graficas/types';

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  generation: Generation | null;
  imageIndex: number;
}

export function ImageModal({ open, onClose, generation, imageIndex }: ImageModalProps) {
  const url = generation?.resultUrls[imageIndex];
  const cfg = generation?.config;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden p-0 gap-0 bg-card border-primary/20 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Vista ampliada de gráfica</DialogTitle>

        {generation && url && cfg ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Imagen */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/40 p-4">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 left-3 z-10 rounded-full bg-black/50 p-1.5 hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <img
                src={url}
                alt={generation.finalPrompt}
                referrerPolicy="no-referrer"
                className="max-h-[calc(90vh-2rem)] max-w-full object-contain rounded-lg"
              />
            </div>

            {/* Metadata sidebar */}
            <div className="w-72 shrink-0 overflow-y-auto border-l border-border p-5 space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Prompt
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {generation.promptUsed ?? generation.finalPrompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetaItem label="Marca" value={cfg.brand} />
                <MetaItem label="Tipo" value={getGraphicTypeLabel(cfg.type)} />
                <MetaItem label="Formato" value={cfg.format} />
                <MetaItem label="Modelo" value={getModelLabel(cfg.advanced.model)} />
              </div>

              {cfg.styles.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Estilos
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.styles.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <MetaItem
                label="Fecha"
                value={format(new Date(generation.createdAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}
              />

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white border-0 gap-2"
                onClick={() => window.open(url, '_blank')}
              >
                <Download className="h-4 w-4" />
                Descargar HD
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  );
}
