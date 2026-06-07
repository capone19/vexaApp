export type Brand = string;

export type GraphicType = 'producto' | 'lifestyle' | 'testimonio' | 'antes-despues' | 'detalle' | 'promo' | 'ugc';

export type CarouselType = 'Educativo' | 'Venta' | 'Storytelling';

export type Format = '1:1' | '4:5' | '9:16' | '16:9';

export type StyleOption = 'Minimalista' | 'Editorial' | 'Studio' | 'Outdoor' | 'Cinematográfico' | 'iPhone';

export type CtaDestino = 'web' | 'whatsapp';

export interface AdvancedConfig {
  model: ModelOption;
  seed?: number;
  guidance: number;
  precioAhora?: string;
  precioAntes?: string;
  ctaDestino: CtaDestino;
}

export interface GenerationConfig {
  brand: Brand;
  type: GraphicType;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  useProductColors: boolean;
  carouselMode: boolean;
  carouselType: CarouselType;
  format: Format;
  styles: StyleOption[];
  variations: number;
  advanced: AdvancedConfig;
  prompt: string;
}

export interface CarouselSlide {
  slideIndex: number;
  slideTotal: number;
  imageUrl: string;
  promptUsed?: string;
  contentType?: string;
  width?: number;
  height?: number;
}

export interface Generation {
  id: string;
  config: Omit<GenerationConfig, 'referenceImage'>;
  finalPrompt: string;
  status: 'pending' | 'completed' | 'failed';
  resultUrls: string[];
  createdAt: string;
  errorMessage?: string;
  promptUsed?: string;
  requestId?: string;
  mode?: 'normal' | 'carousel';
  slides?: CarouselSlide[];
  slideErrors?: string[];
}

export const CAROUSEL_TYPES: { value: CarouselType; label: string; icon: string }[] = [
  { value: 'Educativo', label: 'Educativo', icon: 'GraduationCap' },
  { value: 'Venta', label: 'Venta', icon: 'Tag' },
  { value: 'Storytelling', label: 'Storytelling', icon: 'Film' },
];

export const DEFAULT_CAROUSEL_TYPE: CarouselType = 'Educativo';

export const GRAPHIC_TYPES: { value: GraphicType; label: string; icon: string }[] = [
  { value: 'producto', label: 'Producto', icon: 'Package' },
  { value: 'lifestyle', label: 'Lifestyle', icon: 'Sun' },
  { value: 'testimonio', label: 'Testimonio', icon: 'Quote' },
  { value: 'antes-despues', label: 'Antes/Después', icon: 'ArrowLeftRight' },
  { value: 'detalle', label: 'Detalle', icon: 'ZoomIn' },
  { value: 'promo', label: 'Promo', icon: 'Tag' },
  { value: 'ugc', label: 'UGC', icon: 'Smartphone' },
];

export const FORMATS: { value: Format; w: number; h: number }[] = [
  { value: '1:1', w: 1, h: 1 },
  { value: '4:5', w: 4, h: 5 },
  { value: '9:16', w: 9, h: 16 },
  { value: '16:9', w: 16, h: 9 },
];

export const STYLE_OPTIONS: StyleOption[] = [
  'Minimalista', 'Editorial', 'Studio', 'Outdoor', 'Cinematográfico', 'iPhone',
];

export type ModelOption =
  | 'nano-banana-pro-edit'
  | 'flux'
  | 'kling'
  | 'higgsfield';

export interface ModelConfig {
  value: ModelOption;
  label: string;
  /** ID del modelo en fal.ai */
  falModelId: string;
}

export const MODEL_OPTIONS: ModelConfig[] = [
  {
    value: 'nano-banana-pro-edit',
    label: 'Nano Banana Pro Edit Image',
    falModelId: 'fal-ai/nano-banana-pro/edit',
  },
  { value: 'flux', label: 'Flux', falModelId: 'flux' },
  { value: 'kling', label: 'Kling', falModelId: 'kling' },
  { value: 'higgsfield', label: 'Higgsfield', falModelId: 'higgsfield' },
];

export const DEFAULT_MODEL: ModelOption = 'nano-banana-pro-edit';

export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export const VARIATIONS_MIN = 1;
export const VARIATIONS_MAX = 4;
export const CAROUSEL_SLIDES_MIN = 2;
export const CAROUSEL_SLIDES_MAX = 8;
export const DEFAULT_VARIATIONS = 2;
export const DEFAULT_CAROUSEL_SLIDES = 4;

export const DEFAULT_CONFIG: GenerationConfig = {
  brand: '',
  type: 'producto',
  referenceImage: null,
  referenceImagePreview: null,
  useProductColors: false,
  carouselMode: false,
  carouselType: DEFAULT_CAROUSEL_TYPE,
  format: '1:1',
  styles: [],
  variations: 2,
  advanced: { model: DEFAULT_MODEL, guidance: 7, ctaDestino: 'web' },
  prompt: '',
};

export function getGraphicTypeLabel(type: GraphicType): string {
  return GRAPHIC_TYPES.find(t => t.value === type)?.label ?? type;
}

export function getModelConfig(model: ModelOption | string): ModelConfig {
  return MODEL_OPTIONS.find(m => m.value === model) ?? MODEL_OPTIONS[0];
}

export function getModelLabel(model: ModelOption | string): string {
  return getModelConfig(model).label;
}

export function getVariationsRange(carouselMode: boolean) {
  return carouselMode
    ? {
        min: CAROUSEL_SLIDES_MIN,
        max: CAROUSEL_SLIDES_MAX,
        default: DEFAULT_CAROUSEL_SLIDES,
        label: 'Slides',
      }
    : {
        min: VARIATIONS_MIN,
        max: VARIATIONS_MAX,
        default: DEFAULT_VARIATIONS,
        label: 'Variaciones',
      };
}
