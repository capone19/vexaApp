import { supabase } from '@/integrations/supabase/client';
import { normalizeBrandIdentity } from '@/lib/publicidad/brand-identity/types';
import type { GenerationConfig } from './types';
import { getGraphicTypeLabel, GRAPHIC_TYPES, MAX_REFERENCE_IMAGE_BYTES, getModelConfig } from './types';

const N8N_BASE_URL =
  import.meta.env.VITE_N8N_BASE_URL ?? 'https://n8ninnovatec-n8n.t0bgq1.easypanel.host';
const N8N_IMAGE_GENERATOR_PATH =
  import.meta.env.VITE_N8N_WEBHOOK_IMAGE_GENERATOR ?? '/webhook/vexa-image-generator';

const WEBHOOK_URL = `${N8N_BASE_URL}${N8N_IMAGE_GENERATOR_PATH}`;
const REQUEST_TIMEOUT_MS = 180_000;

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

export interface WebhookResponse {
  success: boolean;
  images?: WebhookImageResult[];
  image_urls?: string[];
  count?: number;
  prompt_used?: string;
  request_id?: string;
  error?: string;
}

export interface GenerationResult {
  resultUrls: string[];
  promptUsed: string;
  requestId?: string;
  referenceImageUrl: string;
}

export function validateGenerationConfig(
  config: GenerationConfig,
  brandNames: string[],
): ValidationResult {
  if (!config.brand || !brandNames.includes(config.brand)) {
    return { ok: false, message: 'Seleccioná una marca.' };
  }
  if (!config.type || !GRAPHIC_TYPES.some(t => t.value === config.type)) {
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
  if (config.variations < 1) {
    return { ok: false, message: 'Las variaciones deben ser al menos 1.' };
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
    tipo_grafica: getGraphicTypeLabel(config.type),
    imagen_referencia_url: publicUrl,
    formato: config.format,
    estilo: config.styles[0] ?? '',
    variaciones: config.variations,
    prompt: config.prompt.trim(),
    use_product_colors: config.useProductColors,
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

async function callWebhook(payload: Record<string, unknown>): Promise<WebhookResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        'La generación tardó demasiado. Reintenta o reduce el número de variaciones.',
      );
    }

    throw new GenerateImageError(
      'NETWORK',
      'No pudimos conectar con el servicio de generación. Verifica tu conexión.',
    );
  }
}

function extractResultUrls(result: WebhookResponse): string[] {
  if (result.images?.length) {
    return result.images.map(img => img.url).filter(Boolean);
  }
  if (result.image_urls?.length) {
    return result.image_urls.filter(Boolean);
  }
  return [];
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
  const result = await callWebhook(payload);

  const resultUrls = extractResultUrls(result);
  if (resultUrls.length === 0) {
    throw new GenerateImageError(
      'WEBHOOK_ERROR',
      'El servicio no devolvió imágenes. Reintenta.',
    );
  }

  return {
    resultUrls,
    promptUsed: result.prompt_used ?? config.prompt.trim(),
    requestId: result.request_id,
    referenceImageUrl: publicUrl,
  };
}

export function getGenerateErrorMessage(err: unknown): string {
  if (err instanceof GenerateImageError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado. Reintenta.';
}
