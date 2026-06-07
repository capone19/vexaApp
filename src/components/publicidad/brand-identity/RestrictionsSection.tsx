import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RestrictionsSectionProps {
  restrictions: string | null;
  onChange: (restrictions: string | null) => void;
}

export function RestrictionsSection({ restrictions, onChange }: RestrictionsSectionProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        Restricciones visuales
      </Label>
      <Textarea
        value={restrictions ?? ''}
        onChange={e => onChange(e.target.value || null)}
        rows={8}
        placeholder="Máximo 4 colores visibles por pieza. No usar gradientes multicolor..."
        className="resize-y min-h-[160px]"
      />
    </div>
  );
}
