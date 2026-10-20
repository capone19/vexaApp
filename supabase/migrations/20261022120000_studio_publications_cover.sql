-- =============================================================================
-- Content Studio: portada propia de los Reels (la miniatura generada en la Fábrica de Shorts)
-- =============================================================================
-- Igual que el video: "Instagram: subir video" deja el JPG en R2 (vexa-studio/ig-temp/) y llena cover_*;
-- "Instagram: publicar Reel" la manda como cover_url y la borra al publicar. El reloj diario borra las huérfanas.
-- Sin portada se usa settings.thumb_offset_ms (un fotograma del video), como antes.

ALTER TABLE public.studio_publications ADD COLUMN IF NOT EXISTS cover_key text;
ALTER TABLE public.studio_publications ADD COLUMN IF NOT EXISTS cover_url text;
