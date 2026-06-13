import {
  DEFAULT_GRAPHIC_FORMAT_ID,
  type GraphicFormatId,
} from './graphic-formats';

export type { GraphicFormatId } from './graphic-formats';
export {
  GRAPHIC_FORMATS,
  getGraphicFormatById,
  getGraphicFormatAgentLabel,
  getGraphicFormatDisplayName,
  isValidGraphicFormatId,
  DEFAULT_GRAPHIC_FORMAT_ID,
} from './graphic-formats';

export type Brand = string;

export type Objetivo = 'educativa' | 'venta';

export type CarouselType = 'Educativo' | 'Venta' | 'Storytelling';

export type Format = '1:1' | '4:5' | '9:16' | '16:9';

export type StyleOption =
  | 'Editorial'
  | 'Minimalista'
  | 'Studio'
  | 'Outdoor'
  | 'Cinematográfico'
  | 'iPhone (UGC)'
  | 'Libre';

export type VisualComponentOption =
  | 'Iconografía wireframe'
  | 'Editorial tipográfico'
  | 'Foto producto'
  | 'Esencia del producto'
  | 'Datos / comparativa'
  | 'Ilustración orgánica';

export type CtaDestino = 'web' | 'whatsapp' | 'interaccion';

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
  type: GraphicFormatId;
  objetivo: Objetivo;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  useProductColors: boolean;
  carouselMode: boolean;
  carouselType: CarouselType;
  format: Format;
  styles: StyleOption[];
  componenteVisual: VisualComponentOption;
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

export const DEFAULT_OBJETIVO: Objetivo = 'venta';

export const FORMATS: { value: Format; w: number; h: number }[] = [
  { value: '1:1', w: 1, h: 1 },
  { value: '4:5', w: 4, h: 5 },
  { value: '9:16', w: 9, h: 16 },
  { value: '16:9', w: 16, h: 9 },
];

export const STYLE_OPTIONS: StyleOption[] = [
  'Editorial',
  'Minimalista',
  'Studio',
  'Outdoor',
  'Cinematográfico',
  'iPhone (UGC)',
  'Libre',
];

export const DEFAULT_VISUAL_COMPONENT: VisualComponentOption = 'Iconografía wireframe';

export const VISUAL_COMPONENT_OPTIONS: {
  value: VisualComponentOption;
  label: string;
  description: string;
}[] = [
  {
    value: 'Iconografía wireframe',
    label: 'Iconografía wireframe',
    description: 'Íconos y diagramas monoline geométricos, estética dark-tech.',
  },
  {
    value: 'Editorial tipográfico',
    label: 'Editorial tipográfico',
    description: 'Solo tipografía y espacio negativo, sin imágenes.',
  },
  {
    value: 'Foto producto',
    label: 'Foto producto',
    description: 'Fotografía real del producto en escena.',
  },
  {
    value: 'Esencia del producto',
    label: 'Esencia del producto',
    description:
      'Fotografía real de la materia prima o esencia del producto (planta, raíz, mineral, fruto). Puede incluir personas u objetos en escena, siempre ligados al ingrediente, nunca a la marca.',
  },
  {
    value: 'Datos / comparativa',
    label: 'Datos / comparativa',
    description: 'Visualización limpia de un dato o comparación.',
  },
  {
    value: 'Ilustración orgánica',
    label: 'Ilustración orgánica',
    description: 'Ilustración cálida de formas suaves, anti-wireframe.',
  },
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
  type: DEFAULT_GRAPHIC_FORMAT_ID,
  objetivo: DEFAULT_OBJETIVO,
  referenceImage: null,
  referenceImagePreview: null,
  useProductColors: false,
  carouselMode: false,
  carouselType: DEFAULT_CAROUSEL_TYPE,
  format: '1:1',
  styles: [],
  componenteVisual: DEFAULT_VISUAL_COMPONENT,
  variations: 2,
  advanced: { model: DEFAULT_MODEL, guidance: 7, ctaDestino: 'web' },
  prompt: '',
};

export function getModelConfig(model: ModelOption | string): ModelConfig {
  return MODEL_OPTIONS.find(m => m.value === model) ?? MODEL_OPTIONS[0];
}

export function getModelLabel(model: ModelOption | string): string {
  return getModelConfig(model).label;
}

export function getStylePayloadValue(styles: StyleOption[]): string {
  const selected = styles[0];
  if (!selected || selected === 'Libre') return 'libre';
  return selected;
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
