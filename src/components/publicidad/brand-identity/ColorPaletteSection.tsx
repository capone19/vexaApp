import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { BrandColor, BrandColors } from '@/lib/publicidad/brand-identity/types';
import { distributionSum } from '@/lib/publicidad/brand-identity/types';

interface ColorPaletteSectionProps {
  colors: BrandColors;
  onChange: (colors: BrandColors) => void;
}

const MAX_COLORS = 4;

function ColorListEditor({
  label,
  colors,
  onUpdate,
}: {
  label: string;
  colors: BrandColor[];
  onUpdate: (colors: BrandColor[]) => void;
}) {
  const updateColor = (index: number, field: keyof BrandColor, value: string) => {
    const next = [...colors];
    next[index] = { ...next[index], [field]: value };
    onUpdate(next);
  };

  const addColor = () => {
    if (colors.length >= MAX_COLORS) return;
    onUpdate([...colors, { name: '', hex: '#000000' }]);
  };

  const removeColor = (index: number) => {
    onUpdate(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={colors.length >= MAX_COLORS}
          onClick={addColor}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>
      <div className="space-y-2">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={color.hex.startsWith('#') ? color.hex : `#${color.hex}`}
              onChange={e => updateColor(i, 'hex', e.target.value.toUpperCase())}
              className="h-9 w-9 shrink-0 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
            />
            <Input
              value={color.hex}
              onChange={e => updateColor(i, 'hex', e.target.value.toUpperCase())}
              placeholder="#000000"
              className="w-24 font-mono text-xs"
            />
            <Input
              value={color.name}
              onChange={e => updateColor(i, 'name', e.target.value)}
              placeholder="Nombre del color"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => removeColor(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {colors.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin colores. Agrega uno.</p>
        )}
      </div>
    </div>
  );
}

const DIST_KEYS = [
  { key: 'primary_pct' as const, label: 'Primario %' },
  { key: 'white_pct' as const, label: 'Blanco %' },
  { key: 'accent_pct' as const, label: 'Acento %' },
  { key: 'soft_accent_pct' as const, label: 'Soft accent %' },
];

export function ColorPaletteSection({ colors, onChange }: ColorPaletteSectionProps) {
  const sum = distributionSum(colors.distribution);
  const isValidSum = sum === 100;

  const updateDistribution = (key: keyof typeof colors.distribution, value: number) => {
    onChange({
      ...colors,
      distribution: { ...colors.distribution, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <ColorListEditor
        label="Colores primarios"
        colors={colors.primary}
        onUpdate={primary => onChange({ ...colors, primary })}
      />
      <ColorListEditor
        label="Colores acento"
        colors={colors.accent}
        onUpdate={accent => onChange({ ...colors, accent })}
      />
      <ColorListEditor
        label="Colores secundarios"
        colors={colors.secondary}
        onUpdate={secondary => onChange({ ...colors, secondary })}
      />

      <div className="space-y-4 pt-2 border-t border-violet-500/10">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Distribución porcentual
          </Label>
          <span
            className={cn(
              'text-xs font-mono',
              isValidSum ? 'text-green-400' : 'text-destructive',
            )}
          >
            Total: {sum}% {isValidSum ? '✓' : '(debe sumar 100%)'}
          </span>
        </div>
        {DIST_KEYS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{label}</span>
              <span>{colors.distribution[key]}%</span>
            </div>
            <Slider
              value={[colors.distribution[key]]}
              onValueChange={([v]) => updateDistribution(key, v)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
