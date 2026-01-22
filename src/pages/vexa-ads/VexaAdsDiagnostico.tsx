// ============================================
// VEXA Ads - DIAGNÓSTICO (Insights) - RESPONSIVE
// ============================================
// Qué dicen los clientes y por qué compran o no
// Solo conclusiones claras, no data cruda
// Optimizado para móvil
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  TrendingDown,
  Lightbulb,
  Quote,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Resumen principal
const mainSummary = {
  headline: "Tus clientes tienen prisa y les preocupa el precio",
  subheadline: "Basado en el análisis de 1,847 conversaciones",
  keyInsight: "La mayoría abandona cuando presentas el precio. No es que sea caro, es que no ven el valor antes de ver el número.",
  opportunity: "Los testimonios de otros clientes similares podrían ayudar a mostrar el valor antes de hablar de precio.",
};

// Mock data - Puntos de dolor
const painPoints = [
  { 
    quote: '"No tengo tiempo para esto ahora"',
    meaning: 'Están interesados pero abrumados. Necesitan ver que tu solución AHORRA tiempo, no que lo consume.',
    frequency: '45% de las conversaciones',
    emoji: '⏰'
  },
  { 
    quote: '"Es muy caro" / "No tengo presupuesto"',
    meaning: 'No han visto suficiente valor aún. Cuando dicen "caro" realmente dicen "no entiendo por qué vale eso".',
    frequency: '28% de las conversaciones',
    emoji: '💰'
  },
  { 
    quote: '"Ya probé algo parecido y no funcionó"',
    meaning: 'Tienen miedo de perder dinero otra vez. Necesitan garantías y casos de éxito específicos.',
    frequency: '15% de las conversaciones',
    emoji: '😔'
  },
  { 
    quote: '"Lo pienso y te aviso"',
    meaning: 'Quieren tiempo para buscar alternativas o consultar con alguien. Seguimiento es clave.',
    frequency: '12% de las conversaciones',
    emoji: '🤔'
  },
];

// Mock data - Qué SÍ funciona
const whatWorks = [
  { text: 'Mostrar resultados rápidos', detail: 'Cuando mencionas "resultados en X días", la conversación avanza' },
  { text: 'Historias de otros clientes', detail: 'Los testimonios generan confianza inmediata' },
  { text: 'Respuestas rápidas', detail: 'Responder en menos de 5 minutos duplica la conversión' },
];

// Mock data - Dónde se pierde la gente
const dropPoints = [
  { stage: 'Primer contacto', dropRate: 12, insight: 'Normal. No todos los que escriben están listos.' },
  { stage: 'Presentar precio', dropRate: 34, insight: '¡Aquí está el problema! Están viendo el número antes del valor.' },
  { stage: 'Agendar cita', dropRate: 18, insight: 'Fricción de agenda. ¿Puedes simplificar el proceso?' },
  { stage: 'Cerrar venta', dropRate: 8, insight: 'Bien. Los que llegan aquí casi siempre compran.' },
];

export default function VexaAdsDiagnostico() {
  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
          Diagnóstico
        </h1>
        <p className="text-white/50 text-xs md:text-sm">
          Lo que tus conversaciones revelan sobre tus clientes
        </p>
      </div>

      {/* Resumen principal */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/30 p-4 md:p-8 mb-6 md:mb-8">
        <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-semibold text-white mb-1 md:mb-2">{mainSummary.headline}</h2>
            <p className="text-xs md:text-sm text-white/50">{mainSummary.subheadline}</p>
          </div>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5 md:mb-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-xs md:text-sm font-medium text-amber-300">Insight clave</span>
            </div>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed">{mainSummary.keyInsight}</p>
          </div>
          
          <div className="p-3 md:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1.5 md:mb-2">
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs md:text-sm font-medium text-emerald-300">Oportunidad</span>
            </div>
            <p className="text-xs md:text-sm text-white/80">{mainSummary.opportunity}</p>
          </div>
        </div>
      </div>

      {/* Grid de insights - Stack en móvil */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Qué dicen los clientes */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Quote className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm md:text-base text-white font-medium">Lo que dicen tus clientes</h3>
              <p className="text-[10px] md:text-xs text-white/40">Y qué significa realmente</p>
            </div>
          </div>
          
          <div className="space-y-3 md:space-y-4">
            {painPoints.map((point, index) => (
              <div key={index} className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start gap-2 md:gap-3 mb-2">
                  <span className="text-lg md:text-xl">{point.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-white font-medium">{point.quote}</p>
                    <p className="text-[10px] md:text-xs text-violet-300 mt-0.5">{point.frequency}</p>
                  </div>
                </div>
                <p className="text-[10px] md:text-sm text-white/60 mt-2 md:mt-3 pl-7 md:pl-9 border-l-2 border-white/10">
                  {point.meaning}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Qué sí funciona */}
        <div className="space-y-4 md:space-y-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ThumbsUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm md:text-base text-white font-medium">Qué sí funciona</h3>
                <p className="text-[10px] md:text-xs text-white/40">Sigue haciendo esto</p>
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              {whatWorks.map((item, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-[10px] md:text-xs">✓</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-white font-medium">{item.text}</p>
                    <p className="text-[10px] md:text-xs text-white/50 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 md:p-4 text-center">
            <p className="text-[10px] md:text-xs text-white/40">
              📊 Este diagnóstico se actualiza automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* Dónde se pierde la gente - Responsive grid */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm md:text-base text-white font-medium">Dónde se pierde la gente</h3>
            <p className="text-[10px] md:text-xs text-white/40">El embudo de conversación</p>
          </div>
        </div>

        {/* Grid: 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          {dropPoints.map((point, index) => {
            const isHighest = point.dropRate === Math.max(...dropPoints.map(p => p.dropRate));
            return (
              <div 
                key={index} 
                className={cn(
                  "p-3 md:p-4 rounded-xl border",
                  isHighest ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                )}
              >
                <div className="text-center mb-2 md:mb-3">
                  <div className={cn(
                    "text-xl md:text-2xl font-bold",
                    isHighest ? 'text-red-400' : 'text-white'
                  )}>
                    {point.dropRate}%
                  </div>
                  <div className="text-[10px] md:text-xs text-white/40">abandona aquí</div>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-white font-medium mb-0.5 md:mb-1">{point.stage}</p>
                  <p className="text-[10px] md:text-xs text-white/50 line-clamp-2">{point.insight}</p>
                </div>
                {isHighest && (
                  <div className="mt-2 md:mt-3 p-1.5 md:p-2 rounded-lg bg-red-500/20 text-center">
                    <span className="text-[10px] md:text-xs text-red-300 font-medium">⚠️ Crítico</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-6 md:mt-10 text-center">
        <span className="text-[10px] md:text-xs text-white/30">
          ✨ Análisis basado en conversaciones de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}
