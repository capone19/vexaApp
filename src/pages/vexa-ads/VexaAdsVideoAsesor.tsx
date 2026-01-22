// ============================================
// VEXA Ads - ASESOR DE VIDEO IA - RESPONSIVE
// ============================================
// Flujo de asesoría guiada para crear videos
// Optimizado para móvil
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Video,
  ArrowLeft,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Lightbulb,
  Play,
  Edit3,
  X,
  ChevronRight,
  Smartphone,
  Users,
  RefreshCw,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const videoRecommendation = {
  pilar: 'Falta de tiempo',
  priority: 'Alta',
  reason: 'Detectamos que el 67% de tus clientes mencionan falta de tiempo como su principal objeción. Los videos cortos explicativos están convirtiendo 45% mejor este tipo de objeción en tu industria.',
  metrics: {
    ctrEstimado: '+45%',
    engagement: 'Alto',
    audiencia: 'Fría / Tibia',
  },
};

const suggestedThemes = [
  { id: '1', text: 'Un día típico sin tiempo vs con tu servicio', selected: false },
  { id: '2', text: 'Antes / después usando el servicio', selected: false },
  { id: '3', text: 'Lo que nadie te cuenta sobre ahorrar tiempo', selected: false },
  { id: '4', text: 'Errores comunes que te hacen perder tiempo', selected: false },
];

const suggestedScripts = [
  {
    id: '1',
    title: 'Hook Directo',
    duration: '15 segundos',
    type: 'Impacto rápido',
    sections: [
      { label: 'Hook (3s)', content: '"¿Cuántas horas perdiste esta semana en [problema]?"' },
      { label: 'Problema', content: 'Mostrar frustración común (sin tiempo, estrés)' },
      { label: 'Solución', content: 'Presentar tu servicio como la respuesta' },
      { label: 'CTA', content: '"Escríbenos" + botón WhatsApp' },
    ],
  },
  {
    id: '2',
    title: 'Testimonial Guiado',
    duration: '20 segundos',
    type: 'Confianza social',
    sections: [
      { label: 'Pregunta', content: '"¿Cómo era tu vida antes de [servicio]?"' },
      { label: 'Problema', content: 'El cliente cuenta su situación anterior' },
      { label: 'Resultado', content: 'Mostrar el cambio positivo' },
      { label: 'CTA', content: '"¿Quieres lo mismo? Hablemos"' },
    ],
  },
  {
    id: '3',
    title: 'Educativo Rápido',
    duration: '15 segundos',
    type: 'Valor + autoridad',
    sections: [
      { label: 'Mito', content: '"Mucha gente cree que [mito común]..."' },
      { label: 'Realidad', content: 'Revelar la verdad con datos' },
      { label: 'Tip', content: 'Dar un consejo práctico' },
      { label: 'CTA', content: '"¿Quieres más tips? Escríbenos"' },
    ],
  },
];

const recordingTips = [
  { icon: Smartphone, label: 'Formato', value: 'Vertical (9:16)' },
  { icon: Clock, label: 'Duración', value: '10-15 seg' },
  { icon: Users, label: 'Estilo', value: 'Cercano / Natural' },
  { icon: Video, label: 'Calidad', value: 'Con celular' },
];

export default function VexaAdsVideoAsesor() {
  const navigate = useNavigate();
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['1']);
  const [selectedScript, setSelectedScript] = useState<string | null>('1');

  const toggleTheme = (id: string) => {
    setSelectedThemes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAction = (action: 'ready' | 'adjust' | 'discard') => {
    const messages = {
      ready: '✅ Video marcado como listo.',
      adjust: '✏️ Abriendo editor...',
      discard: '❌ Recomendación descartada.',
    };
    alert(messages[action] + ' (Demo)');
    if (action !== 'adjust') {
      navigate('/vexa-ads/recomendaciones');
    }
  };

  return (
    <VexaAdsLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm mb-4 md:mb-6">
        <button 
          onClick={() => navigate('/vexa-ads/recomendaciones')}
          className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Recomendaciones IA</span>
          <span className="sm:hidden">Atrás</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-white/30" />
        <span className="text-violet-300">Video sugerido</span>
      </div>

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              <Video className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
                Asesor de Video IA
              </h1>
              <p className="text-white/50 text-xs md:text-sm">
                Basado en el análisis de tus conversaciones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {videoRecommendation.pilar}
            </span>
            <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Prioridad {videoRecommendation.priority}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* ¿Por qué este video? */}
          <section className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
              <h2 className="text-sm md:text-base text-white font-medium">¿Por qué este video?</h2>
            </div>
            
            <p className="text-xs md:text-sm text-white/80 leading-relaxed mb-4 md:mb-6">
              {videoRecommendation.reason}
            </p>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-lg md:text-xl font-bold text-emerald-400">{videoRecommendation.metrics.ctrEstimado}</div>
                <div className="text-[10px] md:text-xs text-white/40 mt-0.5 md:mt-1">CTR estimado</div>
              </div>
              <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-lg md:text-xl font-bold text-amber-400">{videoRecommendation.metrics.engagement}</div>
                <div className="text-[10px] md:text-xs text-white/40 mt-0.5 md:mt-1">Engagement</div>
              </div>
              <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-xs md:text-sm font-medium text-white">{videoRecommendation.metrics.audiencia}</div>
                <div className="text-[10px] md:text-xs text-white/40 mt-0.5 md:mt-1">Audiencia</div>
              </div>
            </div>
          </section>

          {/* Pilar de marketing */}
          <section className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Target className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
              <h2 className="text-sm md:text-base text-white font-medium">Pilar Recomendado</h2>
            </div>

            <div className="p-4 md:p-5 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-violet-400" />
                <span className="text-base md:text-lg font-semibold text-white">{videoRecommendation.pilar}</span>
              </div>
              <p className="text-xs md:text-sm text-white/60">
                <strong className="text-white/80">Qué comunica:</strong> Rapidez, conveniencia, solución sin fricción.
              </p>
            </div>

            <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs md:text-sm text-white/50 mb-1.5 md:mb-2">
                <strong className="text-white/70">Cuándo usar:</strong>
              </p>
              <ul className="space-y-1 md:space-y-1.5">
                {['Audiencia nueva', 'Leads indecisos', 'Objeción de tiempo'].map((item, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-white/60 flex items-center gap-1.5 md:gap-2">
                    <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Temáticas sugeridas */}
          <section className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                <h2 className="text-sm md:text-base text-white font-medium">Temáticas Sugeridas</h2>
              </div>
              <button className="text-[10px] md:text-xs text-violet-300 hover:text-violet-200 transition-colors">
                Otra temática
              </button>
            </div>

            <div className="space-y-2">
              {suggestedThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => toggleTheme(theme.id)}
                  className={cn(
                    "w-full p-3 md:p-4 rounded-xl border text-left transition-all flex items-center gap-2 md:gap-3",
                    selectedThemes.includes(theme.id)
                      ? "bg-violet-500/10 border-violet-500/50"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 md:h-5 md:w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    selectedThemes.includes(theme.id)
                      ? "bg-violet-500 border-violet-500"
                      : "border-white/30"
                  )}>
                    {selectedThemes.includes(theme.id) && (
                      <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-white/80">{theme.text}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Guiones sugeridos */}
          <section className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Play className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
              <h2 className="text-sm md:text-base text-white font-medium">Guiones Sugeridos</h2>
            </div>

            <div className="space-y-3 md:space-y-4">
              {suggestedScripts.map((script) => (
                <div
                  key={script.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all",
                    selectedScript === script.id
                      ? "border-violet-500/50 bg-violet-500/5"
                      : "border-white/10 bg-white/[0.02]"
                  )}
                >
                  {/* Header del guion */}
                  <div 
                    className="p-3 md:p-4 cursor-pointer"
                    onClick={() => setSelectedScript(selectedScript === script.id ? null : script.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                          <Video className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs md:text-sm text-white font-medium">🎥 {script.title}</h3>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                            <span className="text-[10px] md:text-xs text-white/40">{script.duration}</span>
                            <span className="text-[10px] md:text-xs text-white/20">•</span>
                            <span className="text-[10px] md:text-xs text-violet-300">{script.type}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 md:h-5 md:w-5 text-white/40 transition-transform shrink-0",
                        selectedScript === script.id && "rotate-90"
                      )} />
                    </div>
                  </div>

                  {/* Contenido expandido */}
                  {selectedScript === script.id && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-white/10">
                      <div className="pt-3 md:pt-4 space-y-2 md:space-y-3">
                        {script.sections.map((section, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                            <div className="sm:w-20 md:w-24 shrink-0">
                              <span className="text-[10px] md:text-xs font-medium text-violet-300 bg-violet-500/20 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                                {section.label}
                              </span>
                            </div>
                            <p className="text-xs md:text-sm text-white/70">{section.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10">
                        <button className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs md:text-sm font-medium transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          Usar este guion
                        </button>
                        <button className="px-3 md:px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">
                          <Edit3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Recomendaciones de grabación */}
          <section className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              <h2 className="text-sm md:text-base text-white font-medium">Recomendaciones</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
              {recordingTips.map((tip, idx) => (
                <div key={idx} className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 md:gap-3">
                    <tip.icon className="h-4 w-4 md:h-5 md:w-5 text-white/50 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] md:text-xs text-white/40">{tip.label}</div>
                      <div className="text-xs md:text-sm text-white font-medium truncate">{tip.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 md:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs md:text-sm text-emerald-300">
                📱 Este video puede grabarse con tu celular.
              </p>
            </div>
          </section>

          {/* Loop de VEXA Ads */}
          <section className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
              <h2 className="text-sm md:text-base text-white font-medium">¿Qué hará VEXA Ads?</h2>
            </div>

            <p className="text-xs md:text-sm text-white/70 mb-4 md:mb-6">
              Este video se testeará contra otros creativos. Si funciona mejor, la IA priorizará este enfoque.
            </p>

            {/* Loop visual - Simplificado para móvil */}
            <div className="hidden md:flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              {[
                { icon: MessageSquare, text: 'Conversaciones' },
                { icon: Target, text: 'Estrategia' },
                { icon: Video, text: 'Video', highlight: true },
                { icon: Zap, text: 'Campañas' },
                { icon: TrendingUp, text: 'Aprendizaje' },
              ].map((item, idx, arr) => (
                <div key={idx} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.highlight ? "text-violet-400" : "text-white/40")} />
                    <span className={cn("text-xs", item.highlight ? "text-violet-300 font-medium" : "text-white/50")}>{item.text}</span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight className="h-4 w-4 text-white/20 mx-2" />}
                </div>
              ))}
            </div>

            {/* Loop móvil simplificado */}
            <div className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-white/50">
                Conversaciones → Estrategia → <span className="text-violet-300 font-medium">Video</span> → Campañas → Aprendizaje
              </p>
            </div>
          </section>
        </div>

        {/* Columna lateral - Acciones */}
        <div className="space-y-4 md:space-y-6">
          {/* Card de acciones - Sticky en desktop */}
          <div className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6 lg:sticky lg:top-6">
            <h3 className="text-sm md:text-base text-white font-medium mb-3 md:mb-4">Acciones</h3>

            <div className="space-y-2 md:space-y-3">
              <button
                onClick={() => handleAction('ready')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Marcar como listo</span>
                <span className="sm:hidden">Listo para usar</span>
              </button>

              <button
                onClick={() => handleAction('adjust')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10 text-sm"
              >
                <Edit3 className="h-4 w-4 md:h-5 md:w-5" />
                Ajustar enfoque
              </button>

              <button
                onClick={() => handleAction('discard')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 transition-colors text-sm"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
                Descartar
              </button>
            </div>

            <div className="mt-3 md:mt-4 p-2.5 md:p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] md:text-xs text-white/40 text-center">
                🔒 Nada se publica sin tu aprobación
              </p>
            </div>
          </div>

          {/* Resumen de selección */}
          <div className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
            <h3 className="text-sm md:text-base text-white font-medium mb-3 md:mb-4">Tu selección</h3>
            
            <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Pilar</span>
                <span className="text-violet-300">{videoRecommendation.pilar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Temáticas</span>
                <span className="text-white">{selectedThemes.length} seleccionadas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Guion</span>
                <span className="text-white truncate ml-2">
                  {selectedScript ? suggestedScripts.find(s => s.id === selectedScript)?.title : 'Ninguno'}
                </span>
              </div>
            </div>
          </div>

          {/* Demo notice */}
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 md:p-4 text-center">
            <span className="text-[10px] md:text-xs text-violet-300">
              ✨ Modo Demo — Las acciones son simuladas
            </span>
          </div>
        </div>
      </div>
    </VexaAdsLayout>
  );
}
