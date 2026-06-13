import { useState } from 'react';
import { Copy, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Generation } from '@/lib/publicidad/graficas/types';
import { getGraphicFormatDisplayName } from '@/lib/publicidad/graficas/types';

interface GenerationDetailsProps {
  generation: Generation;
}

export function GenerationDetails({ generation }: GenerationDetailsProps) {
  const [open, setOpen] = useState(false);
  const cfg = generation.config;
  const isCarousel = generation.mode === 'carousel' && generation.slides?.length;

  const copyRequestId = () => {
    if (!generation.requestId) return;
    navigator.clipboard.writeText(generation.requestId);
    toast.success('Request ID copiado');
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-6">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-muted-foreground hover:text-foreground border border-primary/10 rounded-xl px-4"
        >
          <span className="text-sm">Detalles de la generación</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 rounded-xl border border-primary/10 bg-white/[0.02] p-4">
        {isCarousel ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prompts por slide
            </p>
            <Accordion type="multiple" className="space-y-1">
              {generation.slides!.map(slide => (
                <AccordionItem
                  key={slide.slideIndex}
                  value={`slide-${slide.slideIndex}`}
                  className="rounded-lg border border-primary/10 px-3"
                >
                  <AccordionTrigger className="text-xs py-2 hover:no-underline">
                    Slide {slide.slideIndex} de {slide.slideTotal}
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="max-h-32 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                      {slide.promptUsed ?? '(sin prompt)'}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : generation.promptUsed ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt usado
            </p>
            <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
              {generation.promptUsed}
            </pre>
          </div>
        ) : null}

        {generation.requestId && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Request ID
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 truncate">
                {generation.requestId}
              </code>
              <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" onClick={copyRequestId}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          <span className="text-foreground">Marca:</span> {cfg.brand}
          {' · '}
          <span className="text-foreground">
            {isCarousel ? 'Tipo de carrusel' : 'Tipo'}:
          </span>{' '}
          {isCarousel ? cfg.carouselType : getGraphicFormatDisplayName(cfg.type)}
          {cfg.objetivo && !isCarousel && (
            <>
              {' · '}
              <span className="text-foreground">Objetivo:</span>{' '}
              {cfg.objetivo === 'educativa' ? 'Educativa' : 'Venta'}
            </>
          )}
          {' · '}
          <span className="text-foreground">Formato:</span> {cfg.format}
          {' · '}
          <span className="text-foreground">{isCarousel ? 'Slides' : 'Variaciones'}:</span>{' '}
          {generation.resultUrls.length}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
