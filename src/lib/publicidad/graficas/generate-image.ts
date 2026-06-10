import { supabase } from '@/integrations/supabase/client';
import { normalizeBrandIdentity } from '@/lib/publicidad/brand-identity/types';
import type { CarouselSlide, GenerationConfig } from './types';
import {
  getGraphicTypeLabel,
  GRAPHIC_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
  getModelConfig,
  VARIATIONS_MIN,
  VARIATIONS_MAX,
  CAROUSEL_SLIDES_MIN,
  CAROUSEL_SLIDES_MAX,
  CAROUSEL_TYPES,
} from './types';

const N8N_BASE_URL =
  import.meta.env.VITE_N8N_BASE_URL ?? 'https://n8ninnovatec-n8n.t0bgq1.easypanel.host';
const N8N_IMAGE_GENERATOR_PATH =
  import.meta.env.VITE_N8N_WEBHOOK_IMAGE_GENERATOR ?? '/webhook/vexa-image-generator';

const WEBHOOK_URL = `${N8N_BASE_URL}${N8N_IMAGE_GENERATOR_PATH}`;
const DEFAULT_TIMEOUT_MS = 180_000;

export type GenerateErrorCode =
  | 'UPLOAD_FAILED'
  | 'BRAND_NOT_FOUND'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'WEBHOOK_ERROR'
  | 'HTTP_5XX'
  | 'HTTP_4XX';

export class GenerateImageError extends Error {
  code: GenerateErrorCode;

  constructor(code: GenerateErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GenerateImageError';
  }
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export interface WebhookImageResult {
  url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

export interface WebhookCarouselSlide {
  slide_index: number;
  slide_total: number;
  image_url: string;
  content_type?: string;
  width?: number;
  height?: number;
  prompt_used?: string;
}

export interface WebhookResponse {
  success: boolean;
  mode?: string;
  images?: WebhookImageResult[];
  slides?: WebhookCarouselSlide[];
  image_urls?: string[];
  count?: number;
  total_requested?: number;
  prompt_used?: string;
  request_id?: string;
  error?: string;
  errors?: string[];
}

export interface GenerationResult {
  mode: 'normal' | 'carousel';
  resultUrls: string[];
  promptUsed: string;
  requestId?: string;
  referenceImageUrl: string;
  slides?: CarouselSlide[];
  slideErrors?: string[];
}

export function getRequestTimeoutMs(config: GenerationConfig): number {
  if (!config.carouselMode) return DEFAULT_TIMEOUT_MS;
  return Math.max(DEFAULT_TIMEOUT_MS, config.variations * 90_000 + 60_000);
}

export function validateGenerationConfig(
  config: GenerationConfig,
  brandNames: string[],
): ValidationResult {
  if (!config.brand || !brandNames.includes(config.brand)) {
    return { ok: false, message: 'Seleccioná una marca.' };
  }
  if (config.carouselMode) {
    if (!config.carouselType || !CAROUSEL_TYPES.some(t => t.value === config.carouselType)) {
      return { ok: false, message: 'Seleccioná un tipo de carrusel.' };
    }
  } else if (!config.type || !GRAPHIC_TYPES.some(t => t.value === config.type)) {
    return { ok: false, message: 'Seleccioná un tipo de gráfica.' };
  }
  if (!config.referenceImage) {
    return { ok: false, message: 'Falta subir una imagen de referencia.' };
  }
  if (config.referenceImage.size > MAX_REFERENCE_IMAGE_BYTES) {
    return { ok: false, message: 'La imagen supera el límite de 10 MB.' };
  }
  if (!config.format) {
    return { ok: false, message: 'Seleccioná un formato.' };
  }
  if (config.carouselMode) {
    if (config.variations < CAROUSEL_SLIDES_MIN || config.variations > CAROUSEL_SLIDES_MAX) {
      return { ok: false, message: 'Los slides del carrusel deben ser entre 2 y 8.' };
    }
  } else if (config.variations < VARIATIONS_MIN || config.variations > VARIATIONS_MAX) {
    return { ok: false, message: 'Las variaciones deben ser entre 1 y 4.' };
  }
  if (!config.prompt.trim()) {
    return { ok: false, message: 'Escribí un prompt para generar la gráfica.' };
  }
  return { ok: true };
}

async function uploadReferenceImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

  const { error } = await supabase.storage
    .from('ad-references')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new GenerateImageError(
      'UPLOAD_FAILED',
      'No pudimos subir la imagen de referencia. Reintenta.',
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from('ad-references')
    .getPublicUrl(filename);

  return publicUrl;
}

async function fetchBrandIdentity(marca: string) {
  const { data, error } = await supabase
    .from('brand_identities')
    .select('*')
    .eq('name', marca)
    .single();

  if (error || !data) {
    throw new GenerateImageError(
      'BRAND_NOT_FOUND',
      `La identidad de la marca ${marca} no existe en la base de datos.`,
    );
  }

  return normalizeBrandIdentity(data as Record<string, unknown>);
}

function buildPayload(
  config: GenerationConfig,
  publicUrl: string,
  brandIdentity: ReturnType<typeof normalizeBrandIdentity>,
) {
  const { advanced } = config;
  const modelConfig = getModelConfig(advanced.model);

  const payload: Record<string, unknown> = {
    marca: config.brand,
    tipo_grafica: config.carouselMode ? 'Carrusel' : getGraphicTypeLabel(config.type),
    imagen_referencia_url: publicUrl,
    formato: config.format,
    estilo: config.styles[0] ?? '',
    componente_visual: config.componenteVisual,
    variaciones: config.variations,
    prompt: config.prompt.trim(),
    use_product_colors: config.useProductColors,
    carousel_mode: config.carouselMode,
    modelo: modelConfig.label,
    model_id: modelConfig.falModelId,
    provider: 'fal.ai',
    brand_identity: {
      name: brandIdentity.name,
      display_name: brandIdentity.display_name,
      tagline: brandIdentity.tagline,
      tone: brandIdentity.tone,
      website_url: brandIdentity.website_url,
      logo_url: brandIdentity.logo_url,
      logo_alt_url: brandIdentity.logo_alt_url,
      colors: brandIdentity.colors,
      typography: brandIdentity.typography,
      restrictions: brandIdentity.restrictions,
    },
  };

  if (config.carouselMode) {
    payload.carousel_slides = config.variations;
    payload.carousel_type = config.carouselType;
  }

  if (advanced.precioAhora?.trim()) {
    payload.precio_ahora = advanced.precioAhora.trim();
  }
  if (advanced.precioAntes?.trim()) {
    payload.precio_antes = advanced.precioAntes.trim();
  }
  if (advanced.ctaDestino) {
    payload.cta_destino = advanced.ctaDestino;
  } else {
    payload.cta_destino = 'web';
  }

  return payload;
}

async function callWebhook(
  payload: Record<string, unknown>,
  timeoutMs: number,
  isCarousel: boolean,
): Promise<WebhookResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let result: WebhookResponse;
    try {
      result = await response.json();
    } catch {
      if (response.status >= 500) {
        throw new GenerateImageError(
          'HTTP_5XX',
          `Error del servidor (código ${response.status}). Reintenta en un momento.`,
        );
      }
      throw new GenerateImageError(
        'HTTP_4XX',
        `Error en la solicitud (código ${response.status}).`,
      );
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new GenerateImageError(
          'HTTP_5XX',
          `Error del servidor (código ${response.status}). Reintenta en un momento.`,
        );
      }
      throw new GenerateImageError(
        'HTTP_4XX',
        `Error en la solicitud (código ${response.status}): ${result.error ?? response.statusText}`,
      );
    }

    if (!result.success) {
      throw new GenerateImageError(
        'WEBHOOK_ERROR',
        result.error || 'Error desconocido del webhook',
      );
    }

    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof GenerateImageError) throw err;

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new GenerateImageError(
        'TIMEOUT',
        isCarousel
          ? 'La generación del carrusel tardó demasiado. Reintenta o reduce la cantidad de slides.'
          : 'La generación tardó demasiado. Reintenta o reduce el número de variaciones.',
      );
    }

    throw new GenerateImageError(
      'NETWORK',
      'No pudimos conectar con el servicio de generación. Verifica tu conexión.',
    );
  }
}

function extractNormalResultUrls(result: WebhookResponse): string[] {
  if (result.images?.length) {
    return result.images.map(img => img.url).filter(Boolean);
  }
  if (result.image_urls?.length) {
    return result.image_urls.filter(Boolean);
  }
  return [];
}

function parseCarouselSlides(result: WebhookResponse): CarouselSlide[] {
  if (result.slides?.length) {
    return [...result.slides]
      .sort((a, b) => a.slide_index - b.slide_index)
      .map(s => ({
        slideIndex: s.slide_index,
        slideTotal: s.slide_total,
        imageUrl: s.image_url,
        promptUsed: s.prompt_used,
        contentType: s.content_type,
        width: s.width,
        height: s.height,
      }));
  }
  if (result.image_urls?.length) {
    return result.image_urls.map((url, i) => ({
      slideIndex: i + 1,
      slideTotal: result.image_urls!.length,
      imageUrl: url,
    }));
  }
  return [];
}

function isCarouselResponse(result: WebhookResponse): boolean {
  return result.mode === 'carousel' || (result.slides?.length ?? 0) > 0;
}

function parseGenerationResult(
  config: GenerationConfig,
  result: WebhookResponse,
  referenceImageUrl: string,
): GenerationResult {
  if (isCarouselResponse(result)) {
    const slides = parseCarouselSlides(result);
    const resultUrls = slides.map(s => s.imageUrl).filter(Boolean);
    const slideErrors = result.errors?.filter(Boolean);

    if (resultUrls.length === 0) {
      throw new GenerateImageError(
        'WEBHOOK_ERROR',
        slideErrors?.[0] ?? 'El servicio no devolvió slides del carrusel. Reintenta.',
      );
    }

    return {
      mode: 'carousel',
      resultUrls,
      promptUsed: slides[0]?.promptUsed ?? config.prompt.trim(),
      requestId: result.request_id,
      referenceImageUrl,
      slides,
      slideErrors,
    };
  }

  const resultUrls = extractNormalResultUrls(result);
  if (resultUrls.length === 0) {
    throw new GenerateImageError(
      'WEBHOOK_ERROR',
      'El servicio no devolvió imágenes. Reintenta.',
    );
  }

  return {
    mode: 'normal',
    resultUrls,
    promptUsed: result.prompt_used ?? config.prompt.trim(),
    requestId: result.request_id,
    referenceImageUrl,
  };
}

export async function generateAdImage(
  config: GenerationConfig,
  brandNames: string[],
): Promise<GenerationResult> {
  const validation = validateGenerationConfig(config, brandNames);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const file = config.referenceImage!;
  const publicUrl = await uploadReferenceImage(file);
  const brandIdentity = await fetchBrandIdentity(config.brand);
  const payload = buildPayload(config, publicUrl, brandIdentity);
  const timeoutMs = getRequestTimeoutMs(config);
  const result = await callWebhook(payload, timeoutMs, config.carouselMode);

  return parseGenerationResult(config, result, publicUrl);
}

export function getGenerateErrorMessage(err: unknown): string {
  if (err instanceof GenerateImageError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado. Reintenta.';
}
