export type Brand = 'ALIVIA+' | 'NOMAD' | 'WELL-V';

export type GraphicType = 'producto' | 'lifestyle' | 'testimonio' | 'antes-despues' | 'detalle' | 'promo';

export type Format = '1:1' | '4:5' | '9:16' | '16:9';

export type StyleOption = 'Minimalista' | 'Editorial' | 'Studio' | 'Outdoor' | 'Cinematográfico';

export interface AdvancedConfig {
  model: string;
  seed?: number;
  guidance: number;
}

export interface GenerationConfig {
  brand: Brand;
  type: GraphicType;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  format: Format;
  styles: StyleOption[];
  variations: number;
  advanced: AdvancedConfig;
  prompt: string;
}

export interface Generation {
  id: string;
  config: Omit<GenerationConfig, 'referenceImage'>;
  finalPrompt: string;
  status: 'pending' | 'completed' | 'failed';
  resultUrls: string[];
  createdAt: string;
}

export const BRANDS: Brand[] = ['ALIVIA+', 'NOMAD', 'WELL-V'];

export const GRAPHIC_TYPES: { value: GraphicType; label: string; icon: string }[] = [
  { value: 'producto', label: 'Producto', icon: 'Package' },
  { value: 'lifestyle', label: 'Lifestyle', icon: 'Sun' },
  { value: 'testimonio', label: 'Testimonio', icon: 'Quote' },
  { value: 'antes-despues', label: 'Antes/Después', icon: 'ArrowLeftRight' },
  { value: 'detalle', label: 'Detalle', icon: 'ZoomIn' },
  { value: 'promo', label: 'Promo', icon: 'Tag' },
];

export const FORMATS: { value: Format; w: number; h: number }[] = [
  { value: '1:1', w: 1, h: 1 },
  { value: '4:5', w: 4, h: 5 },
  { value: '9:16', w: 9, h: 16 },
  { value: '16:9', w: 16, h: 9 },
];

export const STYLE_OPTIONS: StyleOption[] = [
  'Minimalista', 'Editorial', 'Studio', 'Outdoor', 'Cinematográfico',
];

export const MODEL_OPTIONS = ['Flux', 'Kling', 'Higgsfield'] as const;

export const DEFAULT_CONFIG: GenerationConfig = {
  brand: 'ALIVIA+',
  type: 'producto',
  referenceImage: null,
  referenceImagePreview: null,
  format: '1:1',
  styles: [],
  variations: 2,
  advanced: { model: 'Flux', guidance: 7 },
  prompt: '',
};
