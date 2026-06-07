import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { BrandTypography, TypographySpec } from '@/lib/publicidad/brand-identity/types';
import { NUMERIC_FONT_WEIGHTS } from '@/lib/publicidad/brand-identity/types';

interface TypographySectionProps {
  typography: BrandTypography;
  onChange: (typography: BrandTypography) => void;
}

function FallbackEditor({
  fallbacks,
  onUpdate,
}: {
  fallbacks: string[];
  onUpdate: (fallbacks: string[]) => void;
}) {
  const [newFallback, setNewFallback] = useState('');

  const add = () => {
    const trimmed = newFallback.trim();
    if (!trimmed || fallbacks.includes(trimmed)) return;
    onUpdate([...fallbacks, trimmed]);
    setNewFallback('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fallbacks</Label>
      <div className="flex flex-wrap gap-2">
        {fallbacks.map((fb, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs"
          >
            {fb}
            <button
              type="button"
              onClick={() => onUpdate(fallbacks.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newFallback}
          onChange={e => setNewFallback(e.target.value)}
          placeholder="Ej. Helvetica Neue"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PrimaryTypographyEditor({
  spec,
  onUpdate,
}: {
  spec: TypographySpec;
  onUpdate: (spec: TypographySpec) => void;
}) {
  const numericWeights = spec.weights.filter((w): w is number => typeof w === 'number');

  const toggleWeight = (weight: number) => {
    const has = numericWeights.includes(weight);
    const next = has
      ? numericWeights.filter(w => w !== weight)
      : [...numericWeights, weight].sort((a, b) => a - b);
    onUpdate({ ...spec, weights: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Familia</Label>
        <Input
          value={spec.family}
          onChange={e => onUpdate({ ...spec, family: e.target.value })}
          placeholder="Neue Haas Grotesk"
        />
      </div>
      <FallbackEditor
        fallbacks={spec.fallbacks}
        onUpdate={fallbacks => onUpdate({ ...spec, fallbacks })}
      />
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pesos</Label>
        <div className="grid grid-cols-3 gap-2">
          {NUMERIC_FONT_WEIGHTS.map(w => (
            <label key={w} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={numericWeights.includes(w)}
                onCheckedChange={() => toggleWeight(w)}
              />
              {w}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecondaryTypographyEditor({
  spec,
  onUpdate,
}: {
  spec: TypographySpec;
  onUpdate: (spec: TypographySpec) => void;
}) {
  const stringWeights = spec.weights.map(String);
  const [newWeight, setNewWeight] = useState('');

  const addWeight = () => {
    const trimmed = newWeight.trim();
    if (!trimmed || stringWeights.includes(trimmed)) return;
    onUpdate({ ...spec, weights: [...spec.weights, trimmed] });
    setNewWeight('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Familia</Label>
        <Input
          value={spec.family}
          onChange={e => onUpdate({ ...spec, family: e.target.value })}
          placeholder="Cormorant Garamond Italic"
        />
      </div>
      <FallbackEditor
        fallbacks={spec.fallbacks}
        onUpdate={fallbacks => onUpdate({ ...spec, fallbacks })}
      />
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pesos / estilos</Label>
        <div className="flex flex-wrap gap-2">
          {stringWeights.map((w, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs"
            >
              {w}
              <button
                type="button"
                onClick={() =>
                  onUpdate({ ...spec, weights: spec.weights.filter((_, idx) => idx !== i) })
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="Ej. Regular Italic"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWeight())}
          />
          <Button type="button" variant="outline" size="sm" onClick={addWeight}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TypographySection({ typography, onChange }: TypographySectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium mb-4">Tipografía principal</p>
        <PrimaryTypographyEditor
          spec={typography.primary}
          onUpdate={primary => onChange({ ...typography, primary })}
        />
      </div>
      <div className="border-t border-violet-500/10 pt-6">
        <p className="text-sm font-medium mb-4">Tipografía secundaria</p>
        <SecondaryTypographyEditor
          spec={typography.secondary}
          onUpdate={secondary => onChange({ ...typography, secondary })}
        />
      </div>
    </div>
  );
}
