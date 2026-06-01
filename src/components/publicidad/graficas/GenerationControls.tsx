import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Package, Sun, Quote, ArrowLeftRight, ZoomIn, Tag,
  Upload, X, ChevronDown,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type {
  GenerationConfig, Brand, GraphicType, Format, StyleOption,
} from '@/lib/publicidad/graficas/types';
import {
  BRANDS, GRAPHIC_TYPES, FORMATS, STYLE_OPTIONS, MODEL_OPTIONS,
} from '@/lib/publicidad/graficas/types';

const TYPE_ICONS: Record<string, React.ElementType> = {
  Package, Sun, Quote, ArrowLeftRight, ZoomIn, Tag,
};

interface GenerationControlsProps {
  config: GenerationConfig;
  onUpdate: <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-violet-500/10 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function GenerationControls({ config, onUpdate }: GenerationControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdate('referenceImage', file);
    const url = URL.createObjectURL(file);
    onUpdate('referenceImagePreview', url);
  }, [onUpdate]);

  const clearImage = useCallback(() => {
    if (config.referenceImagePreview) URL.revokeObjectURL(config.referenceImagePreview);
    onUpdate('referenceImage', null);
    onUpdate('referenceImagePreview', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [config.referenceImagePreview, onUpdate]);

  const toggleStyle = useCallback((s: StyleOption) => {
    const next = config.styles.includes(s)
      ? config.styles.filter(x => x !== s)
      : [...config.styles, s];
    onUpdate('styles', next);
  }, [config.styles, onUpdate]);

  return (
    <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-4 space-y-4 scrollbar-thin hidden lg:block">
      {/* Marca */}
      <Section label="Marca">
        <div className="flex flex-wrap gap-2">
          {BRANDS.map(b => (
            <button
              key={b}
              onClick={() => onUpdate('brand', b)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                config.brand === b
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </Section>

      {/* Tipo */}
      <Section label="Tipo de gráfica">
        <div className="grid grid-cols-2 gap-2">
          {GRAPHIC_TYPES.map(t => {
            const Icon = TYPE_ICONS[t.icon] ?? Package;
            return (
              <button
                key={t.value}
                onClick={() => onUpdate('type', t.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                  config.type === t.value
                    ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                    : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Imagen de referencia */}
      <Section label="Imagen de referencia">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
        {config.referenceImagePreview ? (
          <div className="relative group">
            <img
              src={config.referenceImagePreview}
              alt="Referencia"
              className="w-full h-32 object-cover rounded-lg border border-violet-500/20"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 rounded-lg border-2 border-dashed border-violet-500/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Arrastrá una imagen o hacé click</span>
          </button>
        )}
      </Section>

      {/* Formato */}
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
                onClick={() => onUpdate('format', f.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition-all',
                  config.format === f.value
                    ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                    : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
                )}
              >
                <div
                  className={cn(
                    'rounded-sm border',
                    config.format === f.value ? 'border-violet-400 bg-violet-500/30' : 'border-muted-foreground/30 bg-white/[0.05]'
                  )}
                  style={{ width: w, height: h }}
                />
                <span className="text-[10px] font-medium">{f.value}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Estilos */}
      <Section label="Estilo (opcional)">
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleStyle(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                config.styles.includes(s)
                  ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
                  : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Variaciones */}
      <Section label="Variaciones">
        <div className="flex items-center gap-4">
          <Slider
            value={[config.variations]}
            onValueChange={([v]) => onUpdate('variations', v)}
            min={1}
            max={4}
            step={1}
            className="flex-1"
          />
          <span className="text-2xl font-bold text-violet-300 w-8 text-center tabular-nums">
            {config.variations}
          </span>
        </div>
      </Section>

      {/* Avanzado */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="rounded-xl bg-white/[0.02] border border-violet-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180">
            Avanzado
          </AccordionTrigger>
          <AccordionContent className="rounded-b-xl bg-white/[0.02] border border-t-0 border-violet-500/10 px-4 pb-4 pt-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Modelo</Label>
              <div className="flex gap-2">
                {MODEL_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => onUpdate('advanced', { ...config.advanced, model: m })}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all text-center',
                      config.advanced.model === m
                        ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                        : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
                    )}
                  >
                    {m}
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
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  onUpdate('advanced', { ...config.advanced, seed: val });
                }}
                className="h-8 text-xs bg-secondary border-transparent focus:border-violet-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Guidance Scale: <span className="text-violet-300">{config.advanced.guidance}</span>
              </Label>
              <Slider
                value={[config.advanced.guidance]}
                onValueChange={([v]) => onUpdate('advanced', { ...config.advanced, guidance: v })}
                min={1}
                max={10}
                step={0.5}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
