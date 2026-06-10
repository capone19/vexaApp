import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { BrandIdentity } from '@/lib/publicidad/brand-identity/types';
import type { LogoVariant } from '@/hooks/use-brand-identities';
import { GeneralSection } from './GeneralSection';
import { LogoSection } from './LogoSection';
import { ColorPaletteSection } from './ColorPaletteSection';
import { TypographySection } from './TypographySection';
import { RestrictionsSection } from './RestrictionsSection';

interface BrandIdentityFormProps {
  identity: BrandIdentity;
  onChange: (identity: BrandIdentity) => void;
  onUpload: (file: File, variant: LogoVariant) => Promise<string>;
}

export function BrandIdentityForm({ identity, onChange, onUpload }: BrandIdentityFormProps) {
  const update = (updates: Partial<BrandIdentity>) => {
    onChange({ ...identity, ...updates });
  };

  return (
    <Accordion type="multiple" defaultValue={['general', 'logo', 'colors', 'typography', 'restrictions']} className="space-y-2">
      <AccordionItem value="general" className="rounded-xl bg-white/[0.02] border border-primary/10 px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          Información general
        </AccordionTrigger>
        <AccordionContent>
          <GeneralSection identity={identity} onChange={update} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="logo" className="rounded-xl bg-white/[0.02] border border-primary/10 px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          Logo
        </AccordionTrigger>
        <AccordionContent>
          <LogoSection identity={identity} onChange={update} onUpload={onUpload} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="colors" className="rounded-xl bg-white/[0.02] border border-primary/10 px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          Paleta de colores
        </AccordionTrigger>
        <AccordionContent>
          <ColorPaletteSection
            colors={identity.colors}
            onChange={colors => update({ colors })}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="typography" className="rounded-xl bg-white/[0.02] border border-primary/10 px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          Tipografía
        </AccordionTrigger>
        <AccordionContent>
          <TypographySection
            typography={identity.typography}
            onChange={typography => update({ typography })}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="restrictions" className="rounded-xl bg-white/[0.02] border border-primary/10 px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          Restricciones
        </AccordionTrigger>
        <AccordionContent>
          <RestrictionsSection
            restrictions={identity.restrictions}
            onChange={restrictions => update({ restrictions })}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
