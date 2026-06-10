import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type BrandIdentity,
  normalizeBrandIdentity,
  brandIdentityToRow,
  createEmptyBrandIdentity,
} from '@/lib/publicidad/brand-identity/types';

export const BRAND_IDENTITIES_QUERY_KEY = ['brand-identities'] as const;

export async function fetchBrandIdentities(): Promise<BrandIdentity[]> {
  const { data, error } = await supabase
    .from('brand_identities')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []).map(normalizeBrandIdentity);
}

export async function upsertBrandIdentity(identity: BrandIdentity): Promise<BrandIdentity> {
  const row = brandIdentityToRow(identity);

  if (identity.id) {
    const { data, error } = await supabase
      .from('brand_identities')
      .update(row)
      .eq('id', identity.id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe una marca con ese nombre (key).');
      }
      throw error;
    }
    return normalizeBrandIdentity(data);
  }

  const { data, error } = await supabase
    .from('brand_identities')
    .upsert(row, { onConflict: 'name' })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe una marca con ese nombre (key).');
    }
    throw error;
  }
  return normalizeBrandIdentity(data);
}

export async function deleteBrandIdentity(name: string): Promise<void> {
  const { error } = await supabase
    .from('brand_identities')
    .delete()
    .eq('name', name);

  if (error) throw error;
}

export type LogoVariant = 'primary' | 'alt';

export async function uploadBrandLogo(
  name: string,
  file: File,
  variant: LogoVariant,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = variant === 'primary' ? 'logo-primary' : 'logo-alt';
  const filePath = `${name}/${fileName}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
}

export function useBrandIdentities() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BRAND_IDENTITIES_QUERY_KEY,
    queryFn: fetchBrandIdentities,
  });

  const upsertMutation = useMutation({
    mutationFn: upsertBrandIdentity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRAND_IDENTITIES_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrandIdentity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRAND_IDENTITIES_QUERY_KEY });
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => upsertBrandIdentity(createEmptyBrandIdentity(name)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRAND_IDENTITIES_QUERY_KEY });
    },
  });

  return {
    brands: query.data ?? [],
    brandNames: (query.data ?? []).map(b => b.name),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsertBrand: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    deleteBrand: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    createBrand: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    uploadLogo: uploadBrandLogo,
  };
}
