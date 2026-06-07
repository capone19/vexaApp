import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBrandIdentities } from '@/hooks/use-brand-identities';
import type { BrandIdentity } from '@/lib/publicidad/brand-identity/types';
import { isValidUrl, distributionSum } from '@/lib/publicidad/brand-identity/types';
import { BrandListSidebar } from '@/components/publicidad/brand-identity/BrandListSidebar';
import { BrandIdentityForm } from '@/components/publicidad/brand-identity/BrandIdentityForm';
import { NewBrandDialog } from '@/components/publicidad/brand-identity/NewBrandDialog';

function cloneIdentity(identity: BrandIdentity): BrandIdentity {
  return structuredClone(identity);
}

export default function PublicidadIdentidadMarca() {
  const {
    brands,
    isLoading,
    upsertBrand,
    isUpserting,
    deleteBrand,
    isDeleting,
    createBrand,
    isCreating,
    uploadLogo,
  } = useBrandIdentities();

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [formState, setFormState] = useState<BrandIdentity | null>(null);
  const [originalState, setOriginalState] = useState<BrandIdentity | null>(null);
  const [newBrandOpen, setNewBrandOpen] = useState(false);

  useEffect(() => {
    if (brands.length === 0) {
      setSelectedName(null);
      setFormState(null);
      setOriginalState(null);
      return;
    }
    if (!selectedName || !brands.some(b => b.name === selectedName)) {
      const first = brands[0];
      setSelectedName(first.name);
      setFormState(cloneIdentity(first));
      setOriginalState(cloneIdentity(first));
    }
  }, [brands, selectedName]);

  const isDirty = useMemo(() => {
    if (!formState || !originalState) return false;
    return JSON.stringify(formState) !== JSON.stringify(originalState);
  }, [formState, originalState]);

  const handleSelectBrand = useCallback(
    (name: string) => {
      if (name === selectedName) return;
      if (isDirty && !confirm('Tienes cambios sin guardar. ¿Descartar?')) return;

      const brand = brands.find(b => b.name === name);
      if (!brand) return;
      setSelectedName(name);
      setFormState(cloneIdentity(brand));
      setOriginalState(cloneIdentity(brand));
    },
    [selectedName, isDirty, brands],
  );

  const handleSave = async () => {
    if (!formState) return;

    if (formState.website_url && !isValidUrl(formState.website_url)) {
      toast.error('La URL del sitio web no es válida');
      return;
    }

    if (distributionSum(formState.colors.distribution) !== 100) {
      toast.error('La distribución de colores debe sumar 100%');
      return;
    }

    try {
      const saved = await upsertBrand(formState);
      setFormState(cloneIdentity(saved));
      setOriginalState(cloneIdentity(saved));
      setSelectedName(saved.name);
      toast.success('Identidad de marca guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!formState) return;
    try {
      await deleteBrand(formState.name);
      toast.success(`Marca "${formState.name}" eliminada`);
      setSelectedName(null);
      setFormState(null);
      setOriginalState(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleCreateBrand = async (name: string) => {
    try {
      const created = await createBrand(name);
      setSelectedName(created.name);
      setFormState(cloneIdentity(created));
      setOriginalState(cloneIdentity(created));
      toast.success(`Marca "${created.name}" creada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear marca');
    }
  };

  const handleUpload = async (file: File, variant: 'primary' | 'alt') => {
    if (!formState) throw new Error('No hay marca seleccionada');
    return uploadLogo(formState.name, file, variant);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Identidad de Marca</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura la identidad visual de cada marca para la generación de gráficas.
        </p>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        <BrandListSidebar
          brands={brands}
          selectedName={selectedName}
          onSelect={handleSelectBrand}
          onNewBrand={() => setNewBrandOpen(true)}
        />

        <div className="flex-1 min-w-0">
          {formState ? (
            <div className="space-y-6">
              <BrandIdentityForm
                identity={formState}
                onChange={setFormState}
                onUpload={handleUpload}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || isUpserting}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-500/20"
                >
                  {isUpserting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      Eliminar marca
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar marca?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará permanentemente la identidad de &quot;{formState.display_name}&quot;.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl bg-white/[0.02] border border-violet-500/10">
              <p className="text-muted-foreground mb-4">Selecciona una marca o crea una nueva.</p>
              <Button
                onClick={() => setNewBrandOpen(true)}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600"
              >
                + Nueva marca
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewBrandDialog
        open={newBrandOpen}
        onOpenChange={setNewBrandOpen}
        onCreate={handleCreateBrand}
        isCreating={isCreating}
      />
    </div>
  );
}
