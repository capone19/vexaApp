-- =============================================================================
-- Brand identities for Vexa Ads
-- =============================================================================

-- Tabla principal de identidades de marca
CREATE TABLE IF NOT EXISTS public.brand_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  tagline text,
  tone text,
  website_url text,
  logo_url text,
  logo_alt_url text,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  restrictions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_identities_updated_at ON public.brand_identities;
CREATE TRIGGER trg_brand_identities_updated_at
  BEFORE UPDATE ON public.brand_identities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (uso interno permisivo)
ALTER TABLE public.brand_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_brand_identities" ON public.brand_identities;
CREATE POLICY "allow_all_brand_identities" ON public.brand_identities
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- Storage buckets
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-references',
  'ad-references',
  true,
  16777216, -- 16 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- brand-assets policies
DROP POLICY IF EXISTS "Public read brand assets" ON storage.objects;
CREATE POLICY "Public read brand assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Public upload brand assets" ON storage.objects;
CREATE POLICY "Public upload brand assets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Public update brand assets" ON storage.objects;
CREATE POLICY "Public update brand assets"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Public delete brand assets" ON storage.objects;
CREATE POLICY "Public delete brand assets"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'brand-assets');

-- ad-references policies
DROP POLICY IF EXISTS "Public read ad references" ON storage.objects;
CREATE POLICY "Public read ad references"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-references');

DROP POLICY IF EXISTS "Public upload ad references" ON storage.objects;
CREATE POLICY "Public upload ad references"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ad-references');

DROP POLICY IF EXISTS "Public update ad references" ON storage.objects;
CREATE POLICY "Public update ad references"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'ad-references');

DROP POLICY IF EXISTS "Public delete ad references" ON storage.objects;
CREATE POLICY "Public delete ad references"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'ad-references');

-- =============================================================================
-- Seed WELL-V
-- =============================================================================

INSERT INTO public.brand_identities (name, display_name, tagline, tone, website_url, colors, typography, restrictions)
VALUES (
  'WELL-V',
  'WELL-V',
  'Supplementation for all',
  'Premium dark-tech obsidiana. Editorial. Alto contraste. Negativo amplio. Composición editorial. Baja densidad visual.',
  'https://well-v.cl',
  '{
    "primary":   [{"name":"Obsidian Black","hex":"#070709"},{"name":"Pure White","hex":"#F5F5F5"}],
    "accent":    [{"name":"Well-V Blue","hex":"#4A7DFF"},{"name":"Soft Blue","hex":"#7E9FFF"}],
    "secondary": [{"name":"Neutral Gray","hex":"#BDBDBD"}],
    "distribution": {"primary_pct": 85, "white_pct": 12, "accent_pct": 4, "soft_accent_pct": 2}
  }'::jsonb,
  '{
    "primary":   {"family":"Neue Haas Grotesk","fallbacks":["Inter","Helvetica Neue","SF Pro Display"],"weights":[400,500,600,700]},
    "secondary": {"family":"Cormorant Garamond Italic","fallbacks":["PP Editorial New Italic","Canela Italic"],"weights":["Regular Italic","Medium Italic"]}
  }'::jsonb,
  'Máximo 4 colores visibles por pieza. No usar gradientes multicolor. No fluorescentes. No saturados fuera de paleta. Máximo dos familias tipográficas por pieza. Máximo cuatro pesos por composición. Alineación izquierda o centrada (nunca justificada). Espacio negativo 70-85%. Máximo 5 bloques por composición. Densidad visual baja. Fondos permitidos en fotografía: negro sólido, gris oscuro, transparente. Iconografía monoline 1-2 px en Pure White o Well-V Blue.'
)
ON CONFLICT (name) DO UPDATE SET
  tagline = EXCLUDED.tagline,
  tone = EXCLUDED.tone,
  website_url = EXCLUDED.website_url,
  colors = EXCLUDED.colors,
  typography = EXCLUDED.typography,
  restrictions = EXCLUDED.restrictions;
