import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { Generation } from '@/lib/publicidad/graficas/types';

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  generation: Generation | null;
  imageIndex: number;
}

export function ImageModal({ open, onClose, generation, imageIndex }: ImageModalProps) {
  if (!generation) return null;

  const url = generation.resultUrls[imageIndex];
  if (!url) return null;

  const cfg = generation.config;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 bg-card border-violet-500/20 overflow-hidden">
        <div className="flex h-full">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center bg-black/40 p-4 relative">
            <button
              onClick={onClose}
              className="absolute top-3 left-3 rounded-full bg-black/50 p-1.5 hover:bg-black/70 transition-colors z-10"
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <img
              src={url}
              alt={generation.finalPrompt}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Metadata sidebar */}
          <div className="w-72 shrink-0 border-l border-border p-5 overflow-y-auto space-y-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Prompt
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {generation.finalPrompt}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Marca" value={cfg.brand} />
              <MetaItem label="Tipo" value={cfg.type} />
              <MetaItem label="Formato" value={cfg.format} />
              <MetaItem label="Modelo" value={cfg.advanced.model} />
            </div>

            {cfg.styles.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Estilos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cfg.styles.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-[11px]">
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
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 gap-2"
              onClick={() => window.open(url, '_blank')}
            >
              <Download className="h-4 w-4" />
              Descargar HD
            </Button>
          </div>
        </div>
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
      <p className="text-xs text-foreground capitalize">{value}</p>
    </div>
  );
}
