import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BrandIdentity } from '@/lib/publicidad/brand-identity/types';
import { isValidUrl } from '@/lib/publicidad/brand-identity/types';

interface GeneralSectionProps {
  identity: BrandIdentity;
  onChange: (updates: Partial<BrandIdentity>) => void;
}

export function GeneralSection({ identity, onChange }: GeneralSectionProps) {
  const urlInvalid = identity.website_url ? !isValidUrl(identity.website_url) : false;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Nombre (key)
        </Label>
        <Input
          value={identity.name}
          onChange={e => onChange({ name: e.target.value.toUpperCase() })}
          placeholder="WELL-V"
        />
        <p className="text-[10px] text-muted-foreground">
          Identificador único usado en Gráficas y generación de imágenes.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Nombre para mostrar
        </Label>
        <Input
          value={identity.display_name}
          onChange={e => onChange({ display_name: e.target.value })}
          placeholder="WELL-V"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Tagline
        </Label>
        <Input
          value={identity.tagline ?? ''}
          onChange={e => onChange({ tagline: e.target.value || null })}
          placeholder="Supplementation for all"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Sitio web
        </Label>
        <Input
          value={identity.website_url ?? ''}
          onChange={e => onChange({ website_url: e.target.value || null })}
          placeholder="https://well-v.cl"
          className={urlInvalid ? 'border-destructive' : ''}
        />
        {urlInvalid && (
          <p className="text-xs text-destructive">URL inválida. Usa http:// o https://</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Tono de marca
        </Label>
        <Textarea
          value={identity.tone ?? ''}
          onChange={e => onChange({ tone: e.target.value || null })}
          rows={4}
          placeholder="Premium dark-tech obsidiana. Editorial. Alto contraste..."
        />
      </div>
    </div>
  );
}
