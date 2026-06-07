import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Download, Eye, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { Generation } from '@/lib/publicidad/graficas/types';
import { downloadAllImages, downloadImage } from '@/lib/publicidad/graficas/download-utils';
import { GenerationDetails } from './GenerationDetails';

interface CarouselResultViewProps {
  generation: Generation;
  onImageClick: (gen: Generation, index: number) => void;
}

export function CarouselResultView({ generation, onImageClick }: CarouselResultViewProps) {
  const slides = generation.slides ?? [];
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const cfg = generation.config;
  const timestamp = new Date(generation.createdAt).getTime();

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  const activeSlide = slides[currentIndex];
  const activeUrl = activeSlide?.imageUrl ?? generation.resultUrls[currentIndex];

  const handleDownloadActive = () => {
    if (!activeSlide || !activeUrl) return;
    const filename = `${cfg.brand}-carrusel-slide-${activeSlide.slideIndex}-${timestamp}.jpg`;
    downloadImage(activeUrl, filename);
  };

  const handleDownloadAll = async () => {
    const items = slides.map(s => ({
      url: s.imageUrl,
      filename: `${cfg.brand}-carrusel-slide-${s.slideIndex}-${timestamp}.jpg`,
    }));
    await downloadAllImages(items);
    toast.success(`${items.length} slides descargados`);
  };

  return (
    <div className="space-y-4">
      {generation.slideErrors && generation.slideErrors.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">Algunos slides no se generaron</p>
            <ul className="text-xs text-amber-200/80 space-y-0.5">
              {generation.slideErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="relative px-12">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {slides.map((slide, i) => (
              <CarouselItem key={slide.slideIndex}>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-violet-300">
                    Slide {slide.slideIndex} de {slide.slideTotal}
                  </p>
                  <div className="w-full max-h-[60vh] flex items-center justify-center rounded-xl overflow-hidden border border-violet-500/20 bg-black/20">
                    <img
                      src={slide.imageUrl}
                      alt={`Slide ${slide.slideIndex}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[60vh] max-w-full object-contain cursor-pointer"
                      onClick={() => onImageClick(generation, i)}
                    />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 border-violet-500/30 bg-background/80 hover:bg-violet-500/20" />
          <CarouselNext className="right-0 border-violet-500/30 bg-background/80 hover:bg-violet-500/20" />
        </Carousel>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-1">
        {slides.map((slide, i) => (
          <button
            key={slide.slideIndex}
            type="button"
            onClick={() => scrollTo(i)}
            className={cn(
              'shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
              currentIndex === i
                ? 'border-violet-500 ring-2 ring-violet-500/30'
                : 'border-violet-500/20 opacity-70 hover:opacity-100',
            )}
          >
            <img
              src={slide.imageUrl}
              alt={`Thumb ${slide.slideIndex}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-violet-500/20 gap-2"
          onClick={handleDownloadActive}
        >
          <Download className="h-4 w-4" />
          Descargar slide
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-violet-500/20 gap-2"
          onClick={() => onImageClick(generation, currentIndex)}
        >
          <Eye className="h-4 w-4" />
          Ver en grande
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-violet-500/20 gap-2"
          onClick={() => {
            if (activeUrl) {
              navigator.clipboard.writeText(activeUrl);
              toast.success('URL copiada al portapapeles');
            }
          }}
        >
          <Copy className="h-4 w-4" />
          Copiar URL
        </Button>
        <Button
          size="sm"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 gap-2 ml-auto"
          onClick={handleDownloadAll}
        >
          <Download className="h-4 w-4" />
          Descargar todos
        </Button>
      </div>

      <GenerationDetails generation={generation} />
    </div>
  );
}
