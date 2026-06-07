export interface BrandColor {
  name: string;
  hex: string;
}

export interface ColorDistribution {
  primary_pct: number;
  white_pct: number;
  accent_pct: number;
  soft_accent_pct: number;
}

export interface BrandColors {
  primary: BrandColor[];
  accent: BrandColor[];
  secondary: BrandColor[];
  distribution: ColorDistribution;
}

export interface TypographySpec {
  family: string;
  fallbacks: string[];
  weights: (number | string)[];
}

export interface BrandTypography {
  primary: TypographySpec;
  secondary: TypographySpec;
}

export interface BrandIdentity {
  id?: string;
  name: string;
  display_name: string;
  tagline: string | null;
  tone: string | null;
  website_url: string | null;
  logo_url: string | null;
  logo_alt_url: string | null;
  colors: BrandColors;
  typography: BrandTypography;
  restrictions: string | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_COLORS: BrandColors = {
  primary: [{ name: '', hex: '#000000' }],
  accent: [{ name: '', hex: '#A855F7' }],
  secondary: [],
  distribution: {
    primary_pct: 85,
    white_pct: 12,
    accent_pct: 2,
    soft_accent_pct: 1,
  },
};

export const DEFAULT_TYPOGRAPHY: BrandTypography = {
  primary: {
    family: 'Inter',
    fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    weights: [400, 500, 600, 700],
  },
  secondary: {
    family: '',
    fallbacks: [],
    weights: [],
  },
};

export function createEmptyBrandIdentity(name: string): BrandIdentity {
  return {
    name: name.trim().toUpperCase(),
    display_name: name.trim().toUpperCase(),
    tagline: null,
    tone: null,
    website_url: null,
    logo_url: null,
    logo_alt_url: null,
    colors: structuredClone(DEFAULT_COLORS),
    typography: structuredClone(DEFAULT_TYPOGRAPHY),
    restrictions: null,
  };
}

export function normalizeBrandIdentity(row: Record<string, unknown>): BrandIdentity {
  const colors = (row.colors as BrandColors) ?? DEFAULT_COLORS;
  const typography = (row.typography as BrandTypography) ?? DEFAULT_TYPOGRAPHY;

  return {
    id: row.id as string | undefined,
    name: row.name as string,
    display_name: row.display_name as string,
    tagline: (row.tagline as string | null) ?? null,
    tone: (row.tone as string | null) ?? null,
    website_url: (row.website_url as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    logo_alt_url: (row.logo_alt_url as string | null) ?? null,
    colors: {
      primary: colors.primary ?? [],
      accent: colors.accent ?? [],
      secondary: colors.secondary ?? [],
      distribution: colors.distribution ?? DEFAULT_COLORS.distribution,
    },
    typography: {
      primary: typography.primary ?? DEFAULT_TYPOGRAPHY.primary,
      secondary: typography.secondary ?? DEFAULT_TYPOGRAPHY.secondary,
    },
    restrictions: (row.restrictions as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export function brandIdentityToRow(identity: BrandIdentity): Record<string, unknown> {
  return {
    name: identity.name,
    display_name: identity.display_name,
    tagline: identity.tagline || null,
    tone: identity.tone || null,
    website_url: identity.website_url || null,
    logo_url: identity.logo_url || null,
    logo_alt_url: identity.logo_alt_url || null,
    colors: identity.colors,
    typography: identity.typography,
    restrictions: identity.restrictions || null,
  };
}

export const NUMERIC_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function distributionSum(d: ColorDistribution): number {
  return d.primary_pct + d.white_pct + d.accent_pct + d.soft_accent_pct;
}
