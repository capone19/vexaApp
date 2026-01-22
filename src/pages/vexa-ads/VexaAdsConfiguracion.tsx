// ============================================
// VEXA Ads - CONFIGURACIÓN - RESPONSIVE
// ============================================
// Configuración de marca y personalización
// Optimizado para móvil
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Palette,
  Image as ImageIcon,
  Type,
  MessageSquare,
  Sparkles,
  Upload,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Opciones de tono comunicacional
const toneOptions = [
  { 
    id: 'professional', 
    name: 'Profesional', 
    description: 'Formal, corporativo, confiable',
    example: '"Descubre cómo podemos ayudarte a alcanzar tus objetivos."'
  },
  { 
    id: 'friendly', 
    name: 'Cercano', 
    description: 'Amigable, cálido, personal',
    example: '"¡Hola! Te cuento cómo otros como tú lo lograron 😊"'
  },
  { 
    id: 'energetic', 
    name: 'Enérgico', 
    description: 'Dinámico, motivador, urgente',
    example: '"¡No esperes más! El momento es AHORA 🚀"'
  },
  { 
    id: 'casual', 
    name: 'Casual', 
    description: 'Relajado, conversacional, juvenil',
    example: '"Hey, ¿te cuento algo que te va a interesar?"'
  },
];

// Paletas de colores
const colorPalettes = [
  { 
    id: 'violet', 
    name: 'Violeta Premium', 
    primary: '#8B5CF6', 
    secondary: '#A78BFA',
    colors: ['#8B5CF6', '#A78BFA', '#C4B5FD']
  },
  { 
    id: 'blue', 
    name: 'Azul Confianza', 
    primary: '#3B82F6', 
    secondary: '#60A5FA',
    colors: ['#3B82F6', '#60A5FA', '#93C5FD']
  },
  { 
    id: 'emerald', 
    name: 'Verde Éxito', 
    primary: '#10B981', 
    secondary: '#34D399',
    colors: ['#10B981', '#34D399', '#6EE7B7']
  },
  { 
    id: 'amber', 
    name: 'Naranja Energía', 
    primary: '#F59E0B', 
    secondary: '#FBBF24',
    colors: ['#F59E0B', '#FBBF24', '#FCD34D']
  },
  { 
    id: 'rose', 
    name: 'Rosa Moderno', 
    primary: '#F43F5E', 
    secondary: '#FB7185',
    colors: ['#F43F5E', '#FB7185', '#FDA4AF']
  },
];

export default function VexaAdsConfiguracion() {
  const [brandName, setBrandName] = useState('Mi Negocio');
  const [slogan, setSlogan] = useState('Transformamos tu vida');
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [selectedPalette, setSelectedPalette] = useState('violet');
  const [logoUploaded, setLogoUploaded] = useState(false);

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
          Configuración
        </h1>
        <p className="text-white/50 text-xs md:text-sm">
          Personaliza cómo se ve y comunica tu marca
        </p>
      </div>

      <div className="max-w-3xl space-y-4 md:space-y-8">
        {/* Identidad de Marca */}
        <ConfigSection
          icon={Type}
          title="Identidad de Marca"
          description="Nombre y mensaje principal"
        >
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-xs md:text-sm text-white/50 mb-2 block">Nombre del negocio</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Ej: Mi Empresa"
              />
            </div>
            <div>
              <label className="text-xs md:text-sm text-white/50 mb-2 block">Slogan o propuesta de valor</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Ej: Soluciones que funcionan"
              />
              <p className="text-[10px] md:text-xs text-white/30 mt-2">Se usará en tus anuncios</p>
            </div>
          </div>
        </ConfigSection>

        {/* Logo */}
        <ConfigSection
          icon={ImageIcon}
          title="Logo"
          description="Tu imagen de marca"
        >
          <div 
            className={cn(
              "rounded-xl border-2 border-dashed p-6 md:p-8 text-center transition-all cursor-pointer",
              logoUploaded 
                ? "border-emerald-500/50 bg-emerald-500/5" 
                : "border-white/20 hover:border-violet-500/50 hover:bg-violet-500/5"
            )}
            onClick={() => setLogoUploaded(!logoUploaded)}
          >
            {logoUploaded ? (
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold text-white">{brandName.charAt(0)}</span>
                </div>
                <p className="text-xs md:text-sm text-emerald-400 font-medium mb-1">Logo cargado</p>
                <p className="text-[10px] md:text-xs text-white/40">Clic para cambiar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/5 flex items-center justify-center mb-3 md:mb-4">
                  <Upload className="h-5 w-5 md:h-6 md:w-6 text-white/40" />
                </div>
                <p className="text-xs md:text-sm text-white/70 mb-1">Arrastra tu logo aquí</p>
                <p className="text-[10px] md:text-xs text-white/40">PNG, JPG o SVG (máx. 2MB)</p>
              </div>
            )}
          </div>
        </ConfigSection>

        {/* Paleta de Colores */}
        <ConfigSection
          icon={Palette}
          title="Paleta de Colores"
          description="Los colores de tu marca"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {colorPalettes.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette.id)}
                className={cn(
                  "p-3 md:p-4 rounded-xl border text-left transition-all",
                  selectedPalette === palette.id
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <div className="flex gap-1 mb-2 md:mb-3">
                  {palette.colors.map((color, i) => (
                    <div 
                      key={i}
                      className="h-5 w-5 md:h-6 md:w-6 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-white font-medium truncate">{palette.name}</p>
                {selectedPalette === palette.id && (
                  <div className="flex items-center gap-1 mt-1.5 md:mt-2">
                    <Check className="h-3 w-3 text-violet-400" />
                    <span className="text-[10px] md:text-xs text-violet-400">Seleccionado</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </ConfigSection>

        {/* Tono Comunicacional */}
        <ConfigSection
          icon={MessageSquare}
          title="Tono Comunicacional"
          description="¿Cómo quieres que suene tu marca?"
        >
          <div className="space-y-2 md:space-y-3">
            {toneOptions.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                className={cn(
                  "w-full p-3 md:p-4 rounded-xl border text-left transition-all",
                  selectedTone === tone.id
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm md:text-base text-white font-medium">{tone.name}</h4>
                    <p className="text-[10px] md:text-xs text-white/50">{tone.description}</p>
                  </div>
                  {selectedTone === tone.id && (
                    <div className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="mt-2 md:mt-3 p-2.5 md:p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-[10px] md:text-xs text-white/40 mb-0.5 md:mb-1">Ejemplo:</p>
                  <p className="text-xs md:text-sm text-white/70 italic">{tone.example}</p>
                </div>
              </button>
            ))}
          </div>
        </ConfigSection>

        {/* Preview */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm md:text-base text-white font-medium">Vista previa</h3>
              <p className="text-[10px] md:text-xs text-white/40">Así se verá tu marca</p>
            </div>
          </div>
          
          <div className="p-4 md:p-6 rounded-xl bg-[#09090b] border border-white/10">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div 
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colorPalettes.find(p => p.id === selectedPalette)?.primary }}
              >
                <span className="text-base md:text-lg font-bold text-white">{brandName.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm md:text-base text-white font-semibold truncate">{brandName}</p>
                <p className="text-[10px] md:text-xs text-white/50 truncate">{slogan}</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-white/70 italic">
              {toneOptions.find(t => t.id === selectedTone)?.example}
            </p>
          </div>
        </div>

        {/* Demo badge */}
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-violet-400 text-base md:text-lg">✨</span>
            <div>
              <p className="text-violet-300 text-xs md:text-sm font-medium">Modo Demo activo</p>
              <p className="text-[10px] md:text-xs text-white/40">Los cambios no se guardan permanentemente</p>
            </div>
          </div>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de sección
function ConfigSection({ 
  icon: Icon, 
  title, 
  description, 
  children 
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-sm md:text-base text-white font-medium">{title}</h2>
          <p className="text-[10px] md:text-xs text-white/40">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
