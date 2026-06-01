import { cn } from '@/lib/utils';
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Generation } from '@/lib/publicidad/graficas/types';

interface GenerationCanvasProps {
  currentGeneration: Generation | null;
  onImageClick: (gen: Generation, index: number) => void;
  onUseAsReference: (url: string) => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-violet-500/30 flex items-center justify-center bg-violet-500/5">
          <ImageIcon className="h-10 w-10 text-violet-500/40" />
        </div>
        <div className="absolute -top-2 -right-2 rounded-full bg-violet-500/20 p-1.5">
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Tu estudio creativo</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Configurá los parámetros y describí la gráfica que querés crear
      </p>
    </div>
  );
}

function LoadingState({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      <div className={cn(
        'grid gap-3',
        count <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'
      )}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-violet-500/10 animate-pulse"
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Generando... ~15 seg
      </p>
    </div>
  );
}

function ResultGrid({ generation, onImageClick, onUseAsReference }: {
  generation: Generation;
  onImageClick: (gen: Generation, index: number) => void;
  onUseAsReference: (url: string) => void;
}) {
  const count = generation.resultUrls.length;

  return (
    <div className={cn(
      'grid gap-3',
      count <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'
    )}>
      {generation.resultUrls.map((url, i) => (
        <div
          key={i}
          className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-violet-500/10 hover:border-violet-500/30 transition-all"
          onClick={() => onImageClick(generation, i)}
        >
          <img
            src={url}
            alt={`Resultado ${i + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                className="rounded-lg bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors"
                title="Descargar"
              >
                <Download className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="rounded-lg bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors"
                title="Regenerar"
              >
                <RefreshCw className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUseAsReference(url); }}
                className="rounded-lg bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors"
                title="Usar como referencia"
              >
                <ImageIcon className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(generation.finalPrompt);
                }}
                className="rounded-lg bg-white/10 backdrop-blur-sm p-2 hover:bg-white/20 transition-colors"
                title="Copiar prompt"
              >
                <Copy className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenerationCanvas({ currentGeneration, onImageClick, onUseAsReference }: GenerationCanvasProps) {
  if (!currentGeneration) {
    return <EmptyState />;
  }

  if (currentGeneration.status === 'pending') {
    return <LoadingState count={currentGeneration.config.variations} />;
  }

  return (
    <ResultGrid
      generation={currentGeneration}
      onImageClick={onImageClick}
      onUseAsReference={onUseAsReference}
    />
  );
}
