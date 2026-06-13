import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  GraduationCap, Film, Tag,
  Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type {
  GenerationConfig, CarouselType, StyleOption, CtaDestino, Objetivo,
} from '@/lib/publicidad/graficas/types';
import type { GraphicFormatId } from '@/lib/publicidad/graficas/graphic-formats';
import {
  CAROUSEL_TYPES, FORMATS, STYLE_OPTIONS, MODEL_OPTIONS,
  MAX_REFERENCE_IMAGE_BYTES, getVariationsRange, VISUAL_COMPONENT_OPTIONS,
} from '@/lib/publicidad/graficas/types';
import { GraphicFormatGrid } from './GraphicFormatGrid';

const CAROUSEL_TYPE_ICONS: Record<string, React.ElementType> = {
  GraduationCap, Tag, Film,
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const CTA_DESTINO_OPTIONS: { value: CtaDestino; label: string }[] = [
  { value: 'web', label: 'Web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'interaccion', label: 'Interacción' },
];

const OBJETIVO_OPTIONS: { value: Objetivo; label: string }[] = [
  { value: 'educativa', label: 'Educativa' },
  { value: 'venta', label: 'Venta' },
];

interface GenerationControlsProps {
  config: GenerationConfig;
  brands: string[];
  brandsLoading?: boolean;
  disabled?: boolean;
  onUpdate: <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) => void;
}

function Section({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-primary/10 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{sublabel}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function GenerationControls({
  config,
  brands,
  brandsLoading,
  disabled,
  onUpdate,
}: GenerationControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastVentaCtaRef = useRef<CtaDestino>(config.advanced.ctaDestino ?? 'web');

  const applyFile = useCallback((file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato no soportado. Usá JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      toast.error('La imagen supera el límite de 10 MB.');
      return;
    }
    if (config.referenceImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(config.referenceImagePreview);
    }
    onUpdate('referenceImage', file);
    onUpdate('referenceImagePreview', URL.createObjectURL(file));
  }, [config.referenceImagePreview, onUpdate]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyFile(file);
  }, [applyFile]);

  const clearImage = useCallback(() => {
    if (config.referenceImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(config.referenceImagePreview);
    }
    onUpdate('referenceImage', null);
    onUpdate('referenceImagePreview', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [config.referenceImagePreview, onUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }, [disabled, applyFile]);

  const selectStyle = useCallback((s: StyleOption) => {
    if (disabled) return;
    if (s === 'Libre') {
      onUpdate('styles', []);
      return;
    }
    const isActive = config.styles[0] === s;
    onUpdate('styles', isActive ? [] : [s]);
  }, [config.styles, disabled, onUpdate]);

  const isLibreSelected = config.styles.length === 0 || config.styles[0] === 'Libre';

  const handleCarouselModeChange = useCallback((enabled: boolean) => {
    onUpdate('carouselMode', enabled);
    const range = getVariationsRange(enabled);
    const current = config.variations;
    const outOfRange = current < range.min || current > range.max;
    if (outOfRange) {
      onUpdate('variations', range.default);
    }
  }, [config.variations, onUpdate]);

  const handleObjetivoChange = useCallback((objetivo: Objetivo) => {
    onUpdate('objetivo', objetivo);
    if (objetivo === 'educativa') {
      if (config.advanced.ctaDestino !== 'interaccion') {
        lastVentaCtaRef.current = config.advanced.ctaDestino ?? 'web';
      }
      onUpdate('advanced', { ...config.advanced, ctaDestino: 'interaccion' });
    } else {
      onUpdate('advanced', {
        ...config.advanced,
        ctaDestino: lastVentaCtaRef.current ?? 'web',
      });
    }
  }, [config.advanced, onUpdate]);

  const handleCtaDestinoChange = useCallback((ctaDestino: CtaDestino) => {
    if (config.objetivo === 'venta') {
      lastVentaCtaRef.current = ctaDestino;
    }
    onUpdate('advanced', { ...config.advanced, ctaDestino });
  }, [config.advanced, config.objetivo, onUpdate]);

  const variationsRange = getVariationsRange(config.carouselMode);
  const isEducativa = !config.carouselMode && config.objetivo === 'educativa';
  const showCtaWarning = isEducativa
    && (config.advanced.ctaDestino === 'web' || config.advanced.ctaDestino === 'whatsapp');

  const controlBtn = (active: boolean) => cn(
    'transition-all',
    disabled && 'opacity-50 pointer-events-none',
    active
      ? 'bg-primary/20 border-primary text-primary'
      : 'bg-secondary border-transparent text-muted-foreground hover:bg-primary/10',
  );

  return (
    <div className={cn(
      'w-80 shrink-0 overflow-y-auto border-r border-border p-4 space-y-4 scrollbar-thin hidden lg:block',
      disabled && 'opacity-60 pointer-events-none',
    )}>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Generador de gráficas publicitarias
        </p>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Una gráfica estática para Instagram/Meta. Puede ser educativa (contenido de feed para enseñar y ganar guardados) o de venta (anuncio para convertir). Para carruseles, activa Modo Carrusel.
        </p>
      </div>

      <Section label="Marca">
        {brandsLoading ? (
          <div className="flex gap-2">
            {[1, 2].map(i => (
              <div key={i} className="h-8 w-16 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No hay marcas. Créalas en Identidad de Marca.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brands.map(b => (
              <button
                key={b}
                type="button"
                disabled={disabled}
                onClick={() => onUpdate('brand', b)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                  controlBtn(config.brand === b),
                )}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </Section>

      {!config.carouselMode && (
        <Section
          label="Objetivo"
          sublabel="Define si la gráfica enseña (feed) o vende (anuncio)."
        >
          <div className="flex flex-wrap gap-2">
            {OBJETIVO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => handleObjetivoChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                  controlBtn(config.objetivo === opt.value),
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {config.carouselMode ? (
        <Section label="Tipo de carrusel">
          <div className="grid grid-cols-2 gap-2">
            {CAROUSEL_TYPES.map(t => {
              const Icon = CAROUSEL_TYPE_ICONS[t.icon] ?? GraduationCap;
              return (
                <button
                  key={t.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdate('carouselType', t.value as CarouselType)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border',
                    controlBtn(config.carouselType === t.value),
                    t.value === 'Storytelling' && 'col-span-2',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Section>
      ) : (
        <Section label="Tipo de gráfica">
          <GraphicFormatGrid
            selectedId={config.type}
            disabled={disabled}
            onSelect={(id: GraphicFormatId) => onUpdate('type', id)}
          />
        </Section>
      )}

      <Section label="Imagen de referencia">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
        />
        {config.referenceImagePreview ? (
          <div className="relative group">
            <img
              src={config.referenceImagePreview}
              alt="Referencia"
              className="w-full h-32 object-cover rounded-lg border border-primary/20"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={clearImage}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground transition-all',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-primary/30 hover:border-primary/50 hover:bg-primary/5',
            )}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Arrastrá una imagen o hacé click</span>
          </button>
        )}

        <div className={cn('flex items-start justify-between gap-3 pt-1', isEducativa && 'opacity-60')}>
          <div className="space-y-0.5">
            <Label
              htmlFor="use-product-colors"
              className="text-sm text-foreground font-medium cursor-pointer"
            >
              Usar colores del producto
            </Label>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {isEducativa
                ? 'En modo educativo se usa el color de marca.'
                : 'El acento se deriva de la foto en vez de la paleta de marca'}
            </p>
          </div>
          <Switch
            id="use-product-colors"
            checked={config.useProductColors}
            onCheckedChange={v => onUpdate('useProductColors', v)}
            disabled={disabled}
            className="data-[state=checked]:bg-primary shrink-0 mt-0.5"
          />
        </div>
      </Section>

      <Section label="Formato">
        <div className="flex gap-2">
          {FORMATS.map(f => {
            const scale = 28;
            const maxDim = Math.max(f.w, f.h);
            const w = (f.w / maxDim) * scale;
            const h = (f.h / maxDim) * scale;
            return (
              <button
                key={f.value}
                type="button"
                disabled={disabled}
                onClick={() => onUpdate('format', f.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border',
                  controlBtn(config.format === f.value),
                )}
              >
                <div
                  className={cn(
                    'rounded-sm border',
                    config.format === f.value ? 'border-primary bg-primary/30' : 'border-muted-foreground/30 bg-white/[0.05]',
                  )}
                  style={{ width: w, height: h }}
                />
                <span className="text-[10px] font-medium">{f.value}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Estilo (opcional)">
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map(s => {
            const isActive = s === 'Libre' ? isLibreSelected : config.styles[0] === s;
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => selectStyle(s)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border',
                  isActive
                    ? 'bg-primary/15 border-primary/50 text-primary'
                    : controlBtn(false),
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>

      {config.carouselMode && (
        <Section
          label="Componente visual"
          sublabel="Define el tipo de imágenes que acompañan la gráfica"
        >
          <div className="flex flex-wrap gap-2">
            {VISUAL_COMPONENT_OPTIONS.map(opt => (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUpdate('componenteVisual', opt.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border',
                      config.componenteVisual === opt.value
                        ? 'bg-primary/15 border-primary/50 text-primary'
                        : controlBtn(false),
                    )}
                  >
                    {opt.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {opt.description}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Section>
      )}

      <div className="rounded-xl bg-white/[0.02] border border-primary/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <Label
              htmlFor="carousel-mode"
              className="text-sm text-foreground font-medium cursor-pointer"
            >
              Modo Carrusel
            </Label>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Genera varios slides distintos que forman un carrusel
            </p>
          </div>
          <Switch
            id="carousel-mode"
            checked={config.carouselMode}
            onCheckedChange={handleCarouselModeChange}
            disabled={disabled}
            className="data-[state=checked]:bg-primary shrink-0 mt-0.5"
          />
        </div>
      </div>

      <Section label={variationsRange.label}>
        <div className="flex items-center gap-4">
          <Slider
            value={[config.variations]}
            onValueChange={([v]) => onUpdate('variations', v)}
            min={variationsRange.min}
            max={variationsRange.max}
            step={1}
            disabled={disabled}
            className="flex-1"
          />
          <span className="text-2xl font-bold text-primary w-8 text-center tabular-nums">
            {config.variations}
          </span>
        </div>
      </Section>

      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="rounded-xl bg-white/[0.02] border border-primary/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180">
            Avanzado
          </AccordionTrigger>
          <AccordionContent className="rounded-b-xl bg-white/[0.02] border border-t-0 border-primary/10 px-4 pb-4 pt-2 space-y-4">
            <div className={cn('space-y-1.5', isEducativa && 'opacity-50')}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Precio actual (opcional)
              </Label>
              <Input
                value={config.advanced.precioAhora ?? ''}
                onChange={e => onUpdate('advanced', {
                  ...config.advanced,
                  precioAhora: e.target.value || undefined,
                })}
                placeholder="Ej: $29.990"
                disabled={disabled || isEducativa}
                className="h-8 text-xs bg-secondary border-transparent focus:border-primary/50"
              />
              <p className="text-[10px] text-muted-foreground">
                {isEducativa
                  ? 'Las gráficas educativas no usan precio.'
                  : 'Se mostrará destacado en la gráfica si se usa el concepto Promo.'}
              </p>
            </div>

            <div className={cn('space-y-1.5', isEducativa && 'opacity-50')}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Precio anterior (opcional)
              </Label>
              <Input
                value={config.advanced.precioAntes ?? ''}
                onChange={e => onUpdate('advanced', {
                  ...config.advanced,
                  precioAntes: e.target.value || undefined,
                })}
                placeholder="Ej: $36.980"
                disabled={disabled || isEducativa}
                className="h-8 text-xs bg-secondary border-transparent focus:border-primary/50"
              />
              <p className="text-[10px] text-muted-foreground">
                {isEducativa
                  ? 'Las gráficas educativas no usan precio.'
                  : 'Se mostrará tachado al lado del precio actual.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Destino del CTA
              </Label>
              <div className="flex gap-2">
                {CTA_DESTINO_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleCtaDestinoChange(opt.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border',
                      controlBtn((config.advanced.ctaDestino ?? 'web') === opt.value),
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {showCtaWarning && (
                <p className="text-[10px] text-amber-400/80 leading-snug">
                  Las gráficas educativas suelen usar CTA de Interacción para engagement.
                </p>
              )}
              {config.advanced.ctaDestino === 'interaccion' && !isEducativa && (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  El slide final pedirá guardar, comentar o compartir el post — sin CTA de compra. Ideal para carruseles educativos.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Define el color y texto del botón de llamada a la acción.
              </p>
            </div>

            <div className="border-t border-primary/10 pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODEL_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onUpdate('advanced', { ...config.advanced, model: m.value })}
                      className={cn(
                        'py-2 px-2 rounded-lg text-[10px] leading-tight font-medium border text-center',
                        controlBtn(config.advanced.model === m.value),
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Seed (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Aleatorio"
                  value={config.advanced.seed ?? ''}
                  disabled={disabled}
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    onUpdate('advanced', { ...config.advanced, seed: val });
                  }}
                  className="h-8 text-xs bg-secondary border-transparent focus:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Guidance Scale: <span className="text-primary">{config.advanced.guidance}</span>
                </Label>
                <Slider
                  value={[config.advanced.guidance]}
                  onValueChange={([v]) => onUpdate('advanced', { ...config.advanced, guidance: v })}
                  min={1}
                  max={10}
                  step={0.5}
                  disabled={disabled}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
