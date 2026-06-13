import { cn } from '@/lib/utils';
import { Sparkles, Download, Eye, Copy, Image as ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Generation } from '@/lib/publicidad/graficas/types';
import { getGraphicFormatDisplayName } from '@/lib/publicidad/graficas/types';
import { downloadImage } from '@/lib/publicidad/graficas/download-utils';
import { GenerationDetails } from './GenerationDetails';
import { CarouselResultView } from './CarouselResultView';

interface GenerationCanvasProps {
  currentGeneration: Generation | null;
  onImageClick: (gen: Generation, index: number) => void;
  onRetry: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-primary/5">
          <ImageIcon className="h-10 w-10 text-primary/40" />
        </div>
        <div className="absolute -top-2 -right-2 rounded-full bg-primary/20 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Tu estudio creativo</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Configurá los parámetros y describí la gráfica que querés crear
      </p>
    </div>
  );
}

function LoadingState({ count, carouselMode }: { count: number; carouselMode: boolean }) {
  return (
    <div className="flex flex-col items-center py-12 px-4 space-y-8">
      <div className={cn(
        'gap-4 w-full max-w-3xl',
        carouselMode
          ? 'flex overflow-x-auto pb-2'
          : cn('grid', count === 1 ? 'grid-cols-1' : 'grid-cols-2'),
      )}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl bg-primary/10 animate-pulse border border-primary/20 shrink-0',
              carouselMode
                ? 'w-40 h-52'
                : count === 1 ? 'aspect-[4/5] max-h-[50vh]' : 'aspect-square',
            )}
          />
        ))}
      </div>

      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">
          {carouselMode
            ? `Generando carrusel de ${count} slides...`
            : 'Generando tu gráfica...'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {carouselMode
            ? 'Esto puede tardar varios minutos. Cada slide se genera por separado.'
            : 'Esto puede tomar entre 30 segundos y 2 minutos. Estamos construyendo el prompt y renderizando la imagen.'}
        </p>
        <div className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-full rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 space-y-4">
      <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">No se pudo generar</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      <Button
        onClick={onRetry}
        className="bg-primary gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}

function ResultGrid({
  generation,
  onImageClick,
}: {
  generation: Generation;
  onImageClick: (gen: Generation, index: number) => void;
}) {
  const count = generation.resultUrls.length;
  const cfg = generation.config;
  const tipoSlug = getGraphicFormatDisplayName(cfg.type).toLowerCase().replace(/\s+/g, '-');
  const timestamp = new Date(generation.createdAt).getTime();

  const gridClass = cn(
    'grid gap-4 w-full',
    count === 1 && 'grid-cols-1 max-w-xl mx-auto',
    count === 2 && 'grid-cols-2',
    count >= 3 && 'grid-cols-2',
  );

  return (
    <div>
      <div className={gridClass}>
        {generation.resultUrls.map((url, i) => (
          <div
            key={i}
            className={cn(
              'group relative rounded-xl overflow-hidden border border-primary/10 hover:border-primary/30 transition-all shadow-lg shadow-black/20',
              count === 1 ? 'max-h-[70vh]' : 'aspect-square',
            )}
          >
            <img
              src={url}
              alt={`Resultado ${i + 1}`}
              referrerPolicy="no-referrer"
              className={cn(
                'w-full cursor-pointer transition-transform group-hover:scale-[1.02]',
                count === 1 ? 'max-h-[70vh] object-contain bg-black/20' : 'h-full object-cover',
              )}
              loading="lazy"
              onClick={() => onImageClick(generation, i)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const filename = `${cfg.brand}-${tipoSlug}-${timestamp}-${i + 1}.jpg`;
                    downloadImage(url, filename);
                  }}
                  className="rounded-lg bg-white/10 backdrop-blur-sm p-2.5 hover:bg-white/20 transition-colors"
                  title="Descargar"
                >
                  <Download className="h-4 w-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick(generation, i);
                  }}
                  className="rounded-lg bg-white/10 backdrop-blur-sm p-2.5 hover:bg-white/20 transition-colors"
                  title="Ver en grande"
                >
                  <Eye className="h-4 w-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(url);
                    toast.success('URL copiada al portapapeles');
                  }}
                  className="rounded-lg bg-white/10 backdrop-blur-sm p-2.5 hover:bg-white/20 transition-colors"
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <GenerationDetails generation={generation} />
    </div>
  );
}

export function GenerationCanvas({ currentGeneration, onImageClick, onRetry }: GenerationCanvasProps) {
  if (!currentGeneration) {
    return <EmptyState />;
  }

  if (currentGeneration.status === 'pending') {
    return (
      <LoadingState
        count={currentGeneration.config.variations}
        carouselMode={currentGeneration.config.carouselMode}
      />
    );
  }

  if (currentGeneration.status === 'failed') {
    return (
      <ErrorState
        message={currentGeneration.errorMessage ?? 'Ocurrió un error inesperado.'}
        onRetry={onRetry}
      />
    );
  }

  if (currentGeneration.mode === 'carousel' && currentGeneration.slides?.length) {
    return (
      <CarouselResultView
        generation={currentGeneration}
        onImageClick={onImageClick}
      />
    );
  }

  return (
    <ResultGrid
      generation={currentGeneration}
      onImageClick={onImageClick}
    />
  );
}
