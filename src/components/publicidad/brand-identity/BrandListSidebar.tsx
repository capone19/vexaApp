import { cn } from '@/lib/utils';
import { Plus, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrandIdentity } from '@/lib/publicidad/brand-identity/types';

interface BrandListSidebarProps {
  brands: BrandIdentity[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onNewBrand: () => void;
  isLoading?: boolean;
}

export function BrandListSidebar({
  brands,
  selectedName,
  onSelect,
  onNewBrand,
  isLoading,
}: BrandListSidebarProps) {
  if (isLoading) {
    return (
      <div className="w-[280px] shrink-0 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-primary/10 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Marcas
      </p>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No hay marcas aún.</p>
        ) : (
          brands.map(brand => (
            <button
              key={brand.name}
              type="button"
              onClick={() => onSelect(brand.name)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                selectedName === brand.name
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-white/[0.02] border-primary/10 text-foreground hover:bg-primary/10 hover:border-primary/20',
              )}
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.display_name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{brand.display_name}</p>
                {brand.tagline && (
                  <p className="text-xs text-muted-foreground truncate">{brand.tagline}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <Button
        variant="outline"
        className="w-full border-primary/20 hover:bg-primary/10 hover:border-primary/40"
        onClick={onNewBrand}
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva marca
      </Button>
    </div>
  );
}
