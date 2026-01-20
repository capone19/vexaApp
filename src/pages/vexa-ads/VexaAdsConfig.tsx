// ============================================
// VEXA Ads - Configuración del Negocio (Demo)
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Settings, 
  Palette, 
  Volume2, 
  Shield,
  Sliders,
  Eye,
  Target,
  Brain,
  Upload,
  Check,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos mock
const mockBrandConfig = {
  logo: '🏢',
  colors: ['#8B5CF6', '#A855F7', '#C084FC', '#E9D5FF'],
  voice: 'Profesional pero cercano',
  tones: ['Empático', 'Confiable', 'Experto', 'Motivacional'],
  limits: ['Sin lenguaje agresivo', 'Sin promesas exageradas', 'Sin comparaciones directas'],
};

const mockAudienceInsights = {
  detected: 'Mujeres 28-45, interesadas en cuidado personal y bienestar',
  painPoints: ['Falta de tiempo', 'Desconfianza en resultados', 'Precio percibido alto'],
  objections: ['¿Cuántas sesiones necesito?', '¿Hay garantía de resultados?', '¿Formas de pago?'],
  interests: ['Skincare', 'Wellness', 'Autocuidado', 'Belleza natural'],
};

export default function VexaAdsConfig() {
  const [automationLevel, setAutomationLevel] = useState(70);
  const [safeMode, setSafeMode] = useState(true);

  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración del Negocio</h1>
          <p className="text-white/50 mt-1">Define la identidad de tu marca para la generación de creativos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Editable */}
          <div className="space-y-6">
            {/* Logo & Colors */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-violet-500/20">
                  <Palette className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Identidad Visual</h2>
                  <p className="text-xs text-white/40">Logo y paleta de colores de tu marca</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Logo */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-4xl">
                      {mockBrandConfig.logo}
                    </div>
                    <button className="px-4 py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Cambiar logo
                    </button>
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Paleta de colores</label>
                  <div className="flex items-center gap-3">
                    {mockBrandConfig.colors.map((color, idx) => (
                      <div 
                        key={idx}
                        className="w-12 h-12 rounded-xl cursor-pointer hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-white/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button className="w-12 h-12 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white/60 transition-colors">
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice & Tone */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-violet-500/20">
                  <Volume2 className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Voz de Marca</h2>
                  <p className="text-xs text-white/40">Cómo debe comunicarse tu marca</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Descripción de voz</label>
                  <input 
                    type="text"
                    defaultValue={mockBrandConfig.voice}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Tonos permitidos</label>
                  <div className="flex flex-wrap gap-2">
                    {mockBrandConfig.tones.map((tone, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300 text-sm border border-violet-500/30 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        {tone}
                      </span>
                    ))}
                    <button className="px-3 py-1.5 rounded-full border border-dashed border-white/20 text-white/40 text-sm hover:border-white/40 hover:text-white/60 transition-colors">
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-rose-500/20">
                  <Shield className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Límites Creativos</h2>
                  <p className="text-xs text-white/40">Qué NO debe hacer la IA</p>
                </div>
              </div>

              <div className="space-y-3">
                {mockBrandConfig.limits.map((limit, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10"
                  >
                    <Shield className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="text-sm text-white/70">{limit}</span>
                  </div>
                ))}
                <button className="w-full p-3 rounded-xl border border-dashed border-white/20 text-white/40 text-sm hover:border-white/40 hover:text-white/60 transition-colors">
                  + Agregar límite
                </button>
              </div>
            </div>

            {/* Automation Level */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20">
                    <Sliders className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Nivel de Automatización</h2>
                    <p className="text-xs text-white/40">Cuánto control delegas a la IA</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{automationLevel}%</span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={automationLevel}
                onChange={(e) => setAutomationLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-r
                  [&::-webkit-slider-thumb]:from-violet-500
                  [&::-webkit-slider-thumb]:to-purple-500
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>Manual</span>
                <span>Semi-auto</span>
                <span>Full auto</span>
              </div>

              {/* Safe Mode Toggle */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">Modo Seguro</p>
                  <p className="text-xs text-white/40">Requiere aprobación antes de publicar</p>
                </div>
                <button
                  onClick={() => setSafeMode(!safeMode)}
                  className={cn(
                    "relative w-14 h-8 rounded-full transition-colors",
                    safeMode ? "bg-green-500" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white transition-transform",
                    safeMode ? "translate-x-7" : "translate-x-1"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Read Only (AI Generated) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-violet-500/20">
                  <Brain className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Insights Detectados por IA</h2>
                  <p className="text-xs text-white/40">Generado automáticamente desde conversaciones</p>
                </div>
                <Lock className="h-4 w-4 text-white/30 ml-auto" />
              </div>

              <div className="space-y-6">
                {/* Detected Audience */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-violet-400" />
                    <label className="text-sm font-medium text-white">Audiencia detectada</label>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/70">{mockAudienceInsights.detected}</p>
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-rose-400" />
                    <label className="text-sm font-medium text-white">Dolores principales</label>
                  </div>
                  <div className="space-y-2">
                    {mockAudienceInsights.painPoints.map((pain, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-sm text-white/70">
                        {pain}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objections */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-amber-400" />
                    <label className="text-sm font-medium text-white">Objeciones frecuentes</label>
                  </div>
                  <div className="space-y-2">
                    {mockAudienceInsights.objections.map((obj, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-white/70">
                        {obj}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-green-400" />
                    <label className="text-sm font-medium text-white">Intereses detectados</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mockAudienceInsights.interests.map((interest, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm border border-green-500/20">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-violet-300 text-center">
                  ℹ️ Esta información se actualiza automáticamente al analizar nuevas conversaciones
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Configuración demostrativa. Los cambios no se guardan en esta versión demo.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

