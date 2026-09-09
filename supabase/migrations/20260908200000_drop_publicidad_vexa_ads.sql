-- =============================================================================
-- Remove Publicidad / Vexa Ads module artifacts
-- =============================================================================

-- Flag on tenants
ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS vexa_ads_enabled;

-- Brand identities table (cascade drops trigger + RLS policies)
DROP TABLE IF EXISTS public.brand_identities CASCADE;

-- Storage policies for Publicidad buckets
DROP POLICY IF EXISTS "Public read brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Public upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Public update brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Public delete brand assets" ON storage.objects;

DROP POLICY IF EXISTS "Public read ad references" ON storage.objects;
DROP POLICY IF EXISTS "Public upload ad references" ON storage.objects;
DROP POLICY IF EXISTS "Public update ad references" ON storage.objects;
DROP POLICY IF EXISTS "Public delete ad references" ON storage.objects;

-- Remove objects then buckets
DELETE FROM storage.objects WHERE bucket_id IN ('brand-assets', 'ad-references');
DELETE FROM storage.buckets WHERE id IN ('brand-assets', 'ad-references');

-- Function only used by brand_identities trigger
DROP FUNCTION IF EXISTS public.set_updated_at();
