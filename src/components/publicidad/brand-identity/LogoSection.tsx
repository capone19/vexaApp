import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { BrandIdentity } from '@/lib/publicidad/brand-identity/types';
import type { LogoVariant } from '@/hooks/use-brand-identities';

interface LogoSectionProps {
  identity: BrandIdentity;
  onChange: (updates: Partial<BrandIdentity>) => void;
  onUpload: (file: File, variant: LogoVariant) => Promise<string>;
}

function LogoUploadField({
  label,
  url,
  variant,
  brandName,
  onUpload,
  onClear,
}: {
  label: string;
  url: string | null;
  variant: LogoVariant;
  brandName: string;
  onUpload: (file: File, variant: LogoVariant) => Promise<string>;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    setUploading(true);
    try {
      await onUpload(file, variant);
      toast.success(`${label} subido correctamente`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir logo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-contain p-2" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || !brandName}
            onClick={() => inputRef.current?.click()}
            className="border-primary/20"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Subir logo
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onClear}
            >
              <X className="h-4 w-4 mr-2" />
              Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogoSection({ identity, onChange, onUpload }: LogoSectionProps) {
  const handleUpload = async (file: File, variant: LogoVariant) => {
    const publicUrl = await onUpload(file, variant);
    if (variant === 'primary') {
      onChange({ logo_url: publicUrl });
    } else {
      onChange({ logo_alt_url: publicUrl });
    }
  };

  return (
    <div className="space-y-6">
      <LogoUploadField
        label="Logo principal"
        url={identity.logo_url}
        variant="primary"
        brandName={identity.name}
        onUpload={handleUpload}
        onClear={() => onChange({ logo_url: null })}
      />
      <LogoUploadField
        label="Logo alternativo (opcional)"
        url={identity.logo_alt_url}
        variant="alt"
        brandName={identity.name}
        onUpload={handleUpload}
        onClear={() => onChange({ logo_alt_url: null })}
      />
    </div>
  );
}
