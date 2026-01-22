// ============================================
// VEXA Ads - ANÁLISIS (Sección Clave) - RESPONSIVE
// ============================================
// Responde: ¿Qué funciona? ¿Qué escalar? ¿Qué pausar?
// Optimizado para móvil
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  BarChart3,
  Target,
  Palette,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  MessageSquare,
  Flame,
  Zap,
  PauseCircle,
  PlayCircle,
  TestTube,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AnalysisTab = 'estrategias' | 'creativos' | 'embudo' | 'comparaciones';

// Mock data - Performance por Estrategia
const strategiesPerformance = [
  {
    id: '1',
    name: 'Falta de tiempo',
    creativosCount: 3,
    chats: 456,
    leads: 89,
    conversions: 34,
    conversionRate: 7.5,
    status: 'high' as const,
    trend: 'up' as const,
    recommendation: 'Escalar',
  },
  {
    id: '2',
    name: 'Ahorro de dinero',
    creativosCount: 2,
    chats: 234,
    leads: 45,
    conversions: 12,
    conversionRate: 5.1,
    status: 'medium' as const,
    trend: 'stable' as const,
    recommendation: 'Mantener',
  },
  {
    id: '3',
    name: 'Confianza y seguridad',
    creativosCount: 2,
    chats: 156,
    leads: 23,
    conversions: 5,
    conversionRate: 3.2,
    status: 'medium' as const,
    trend: 'up' as const,
    recommendation: 'Probar más',
  },
  {
    id: '4',
    name: 'Resultados rápidos',
    creativosCount: 1,
    chats: 89,
    leads: 12,
    conversions: 2,
    conversionRate: 2.2,
    status: 'low' as const,
    trend: 'down' as const,
    recommendation: 'Pausar',
  },
];

// Mock data - Performance por Creativo
const creativesPerformance = [
  { id: '1', name: 'Testimonio de María', strategy: 'Falta de tiempo', result: 'Alto', fatigued: false, conversionRate: 8.2 },
  { id: '2', name: 'Carrusel Día sin estrés', strategy: 'Falta de tiempo', result: 'Medio', fatigued: false, conversionRate: 5.4 },
  { id: '3', name: 'Comparativa precios', strategy: 'Ahorro de dinero', result: 'Medio', fatigued: false, conversionRate: 4.8 },
  { id: '4', name: 'Video ROI real', strategy: 'Ahorro de dinero', result: 'Evaluando', fatigued: false, conversionRate: 0 },
  { id: '5', name: 'Caso de éxito Juan', strategy: 'Confianza', result: 'Medio', fatigued: false, conversionRate: 3.5 },
  { id: '6', name: 'Antes y Después', strategy: 'Resultados', result: 'Bajo', fatigued: true, conversionRate: 1.8 },
];

// Mock data - Embudo
const funnelData = {
  stages: [
    { name: 'Chats', value: 935, percentage: 100 },
    { name: 'Leads', value: 169, percentage: 18 },
    { name: 'Conv.', value: 53, percentage: 5.7 },
  ],
  frictions: [
    { stage: 'Primera respuesta', dropRate: 15, insight: 'Algunos no responden al primer mensaje' },
    { stage: 'Presentación precio', dropRate: 42, insight: 'Punto crítico - Valor no percibido' },
    { stage: 'Agendamiento', dropRate: 12, insight: 'Fricción en el proceso de agenda' },
  ],
};

// Mock data - Comparaciones
const comparisons = [
  {
    type: 'Estrategia',
    itemA: { name: 'Falta de tiempo', value: 7.5, metric: 'Conv. Rate' },
    itemB: { name: 'Ahorro de dinero', value: 5.1, metric: 'Conv. Rate' },
    winner: 'A',
    insight: '"Falta de tiempo" convierte 47% mejor',
  },
  {
    type: 'Creativo',
    itemA: { name: 'Video Testimonio', value: 8.2, metric: 'Conv. Rate' },
    itemB: { name: 'Carrusel', value: 5.4, metric: 'Conv. Rate' },
    winner: 'A',
    insight: 'Los videos testimoniales superan a los carruseles',
  },
];

// Mock data - Conclusión IA
const aiConclusion = {
  working: [
    'La estrategia "Falta de tiempo" está funcionando muy bien',
    'Los videos testimoniales tienen el mejor rendimiento',
    'Las respuestas rápidas (<5 min) duplican conversión',
  ],
  pause: [
    'Creativo "Antes y Después" muestra fatiga',
    'Estrategia "Resultados rápidos" no conecta',
  ],
  scale: [
    'Escalar campaña de remarketing con ROAS 4.1x',
    'Aumentar presupuesto en "Falta de tiempo"',
  ],
  test: [
    'Probar video corto (<15 seg) en formato vertical',
    'Testear nuevo ángulo de "Garantía de resultados"',
  ],
};

const statusConfig = {
  high: { label: 'Alto', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  medium: { label: 'Medio', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  low: { label: 'Bajo', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

export default function VexaAdsAnalisis() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('estrategias');

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-semibold text-white">Análisis</h1>
            <span className="text-[10px] px-1.5 md:px-2 py-0.5 rounded bg-violet-500/30 text-violet-300 font-medium">
              NUEVO
            </span>
          </div>
          <p className="text-white/50 text-xs md:text-sm">
            ¿Qué funciona? ¿Qué escalar? ¿Qué pausar?
          </p>
        </div>
      </div>

      {/* Tabs - Scrollable en móvil */}
      <div className="flex gap-2 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-white/10 overflow-x-auto scrollbar-hide">
        <TabButton 
          active={activeTab === 'estrategias'} 
          onClick={() => setActiveTab('estrategias')}
          icon={Target}
          label="Estrategia"
        />
        <TabButton 
          active={activeTab === 'creativos'} 
          onClick={() => setActiveTab('creativos')}
          icon={Palette}
          label="Creativo"
        />
        <TabButton 
          active={activeTab === 'embudo'} 
          onClick={() => setActiveTab('embudo')}
          icon={Users}
          label="Embudo"
        />
        <TabButton 
          active={activeTab === 'comparaciones'} 
          onClick={() => setActiveTab('comparaciones')}
          icon={BarChart3}
          label="Comparar"
        />
      </div>

      {/* Contenido por tab */}
      {activeTab === 'estrategias' && <StrategiesAnalysis />}
      {activeTab === 'creativos' && <CreativesAnalysis />}
      {activeTab === 'embudo' && <FunnelAnalysis />}
      {activeTab === 'comparaciones' && <ComparisonsAnalysis />}

      {/* Conclusión IA */}
      <AIConclusion />

      {/* Demo notice */}
      <div className="mt-6 md:mt-8 text-center">
        <span className="text-[10px] md:text-xs text-white/30">
          ✨ Análisis basado en datos de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0",
        active 
          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
          : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
      )}
    >
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
      {label}
    </button>
  );
}

// 1️⃣ Performance por Estrategia
function StrategiesAnalysis() {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  return (
    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
      <h2 className="text-xs md:text-sm font-medium text-white/70 flex items-center gap-2">
        <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
        Performance por Estrategia
      </h2>
      
      {/* Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {strategiesPerformance.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} />
        ))}
      </div>

      {/* Mobile Cards (Expandable) */}
      <div className="md:hidden space-y-2">
        {strategiesPerformance.map((strategy) => {
          const status = statusConfig[strategy.status];
          const isExpanded = expandedStrategy === strategy.id;
          
          return (
            <div 
              key={strategy.id}
              className={cn(
                "rounded-xl bg-white/5 border transition-colors overflow-hidden",
                status.border
              )}
            >
              {/* Header clickable */}
              <button
                onClick={() => setExpandedStrategy(isExpanded ? null : strategy.id)}
                className="w-full p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-sm font-medium text-white truncate">{strategy.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", status.bg, status.color)}>
                      {status.label}
                    </span>
                    <span className="text-[10px] text-white/40">{strategy.creativosCount} creativos</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-violet-300">{strategy.conversionRate}%</p>
                  <p className="text-[10px] text-white/40">Conv. Rate</p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 text-white/30 transition-transform",
                  isExpanded && "rotate-90"
                )} />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-base font-semibold text-white">{strategy.chats}</p>
                      <p className="text-[10px] text-white/40">Chats</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-base font-semibold text-amber-400">{strategy.leads}</p>
                      <p className="text-[10px] text-white/40">Leads</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-base font-semibold text-emerald-400">{strategy.conversions}</p>
                      <p className="text-[10px] text-white/40">Conv.</p>
                    </div>
                  </div>
                  <div className={cn(
                    "p-2.5 rounded-lg flex items-center gap-2",
                    strategy.recommendation === 'Escalar' ? 'bg-emerald-500/10' :
                    strategy.recommendation === 'Pausar' ? 'bg-red-500/10' :
                    strategy.recommendation === 'Probar más' ? 'bg-amber-500/10' :
                    'bg-white/5'
                  )}>
                    {strategy.recommendation === 'Escalar' && <PlayCircle className="h-4 w-4 text-emerald-400" />}
                    {strategy.recommendation === 'Pausar' && <PauseCircle className="h-4 w-4 text-red-400" />}
                    {strategy.recommendation === 'Mantener' && <CheckCircle2 className="h-4 w-4 text-white/50" />}
                    {strategy.recommendation === 'Probar más' && <TestTube className="h-4 w-4 text-amber-400" />}
                    <span className="text-xs text-white/70">Recomendación: <span className="font-medium text-white">{strategy.recommendation}</span></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: typeof strategiesPerformance[0] }) {
  const status = statusConfig[strategy.status];
  return (
    <div 
      className={cn(
        "rounded-xl bg-white/5 border p-5 transition-colors",
        status.border
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-medium">{strategy.name}</h3>
          <p className="text-xs text-white/40">{strategy.creativosCount} creativos asociados</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-1 rounded-full", status.bg, status.color)}>
            {status.label}
          </span>
          {strategy.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-400" />}
          {strategy.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-400" />}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricMini icon={MessageSquare} label="Chats" value={strategy.chats.toString()} />
        <MetricMini icon={Flame} label="Leads" value={strategy.leads.toString()} />
        <MetricMini icon={CheckCircle2} label="Conv." value={strategy.conversions.toString()} />
        <MetricMini icon={Zap} label="Rate" value={`${strategy.conversionRate}%`} highlight />
      </div>

      <div className={cn(
        "p-3 rounded-lg flex items-center gap-2",
        strategy.recommendation === 'Escalar' ? 'bg-emerald-500/10' :
        strategy.recommendation === 'Pausar' ? 'bg-red-500/10' :
        strategy.recommendation === 'Probar más' ? 'bg-amber-500/10' :
        'bg-white/5'
      )}>
        {strategy.recommendation === 'Escalar' && <PlayCircle className="h-4 w-4 text-emerald-400" />}
        {strategy.recommendation === 'Pausar' && <PauseCircle className="h-4 w-4 text-red-400" />}
        {strategy.recommendation === 'Mantener' && <CheckCircle2 className="h-4 w-4 text-white/50" />}
        {strategy.recommendation === 'Probar más' && <TestTube className="h-4 w-4 text-amber-400" />}
        <span className="text-sm text-white/70">Recomendación: <span className="font-medium text-white">{strategy.recommendation}</span></span>
      </div>
    </div>
  );
}

// 2️⃣ Performance por Creativo
function CreativesAnalysis() {
  return (
    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
      <h2 className="text-xs md:text-sm font-medium text-white/70 flex items-center gap-2">
        <Palette className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
        Performance por Creativo
      </h2>
      
      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-xs font-medium text-white/40 uppercase">
          <div className="col-span-2">Creativo</div>
          <div>Estrategia</div>
          <div className="text-center">Resultado</div>
          <div className="text-center">Fatiga</div>
        </div>

        {creativesPerformance.map((creative) => (
          <div key={creative.id} className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-white/5 hover:bg-white/[0.02] items-center">
            <div className="col-span-2">
              <p className="text-sm text-white font-medium">{creative.name}</p>
              {creative.conversionRate > 0 && (
                <p className="text-xs text-white/40">{creative.conversionRate}% conv. rate</p>
              )}
            </div>
            <div className="text-sm text-white/60">{creative.strategy}</div>
            <div className="text-center">
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                creative.result === 'Alto' ? 'bg-emerald-500/20 text-emerald-400' :
                creative.result === 'Medio' ? 'bg-amber-500/20 text-amber-400' :
                creative.result === 'Bajo' ? 'bg-red-500/20 text-red-400' :
                'bg-white/10 text-white/50'
              )}>
                {creative.result}
              </span>
            </div>
            <div className="text-center">
              {creative.fatigued ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Sí
                </span>
              ) : (
                <span className="text-xs text-white/30">No</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {creativesPerformance.map((creative) => (
          <div key={creative.id} className="rounded-xl bg-white/[0.02] border border-white/10 p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium truncate">{creative.name}</p>
                <p className="text-[10px] text-white/40">{creative.strategy}</p>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ml-2",
                creative.result === 'Alto' ? 'bg-emerald-500/20 text-emerald-400' :
                creative.result === 'Medio' ? 'bg-amber-500/20 text-amber-400' :
                creative.result === 'Bajo' ? 'bg-red-500/20 text-red-400' :
                'bg-white/10 text-white/50'
              )}>
                {creative.result}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                {creative.conversionRate > 0 ? `${creative.conversionRate}% conv.` : 'En evaluación'}
              </span>
              {creative.fatigued && (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Fatiga
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3️⃣ Embudo Conversacional
function FunnelAnalysis() {
  return (
    <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
      <h2 className="text-xs md:text-sm font-medium text-white/70 flex items-center gap-2">
        <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
        Embudo Conversacional
      </h2>

      {/* Embudo visual */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="flex items-end justify-between gap-2 md:gap-4 mb-4 md:mb-6">
          {funnelData.stages.map((stage, index) => {
            const widthPercentage = 100 - (index * 30);
            return (
              <div key={stage.name} className="flex-1 text-center">
                <div className="text-xl md:text-2xl font-bold text-white mb-0.5 md:mb-1">{stage.value}</div>
                <div className="text-[10px] md:text-xs text-white/50 mb-2 md:mb-3">{stage.name}</div>
                <div 
                  className="h-12 md:h-16 bg-gradient-to-t from-violet-500/50 to-violet-500 rounded-t-lg mx-auto transition-all"
                  style={{ width: `${widthPercentage}%`, opacity: 1 - (index * 0.25) }}
                />
                <div className="text-[10px] md:text-xs text-violet-300 mt-1 md:mt-2">{stage.percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fricciones detectadas */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h3 className="text-xs md:text-sm font-medium text-white mb-3 md:mb-4 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
          Fricciones detectadas
        </h3>
        
        <div className="space-y-2 md:space-y-3">
          {funnelData.frictions.map((friction, index) => {
            const isHighest = friction.dropRate === Math.max(...funnelData.frictions.map(f => f.dropRate));
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 md:p-4 rounded-lg border",
                  isHighest ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"
                )}
              >
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <span className="text-xs md:text-sm text-white font-medium">{friction.stage}</span>
                  <span className={cn(
                    "text-xs md:text-sm font-bold",
                    isHighest ? "text-red-400" : "text-white/70"
                  )}>
                    -{friction.dropRate}%
                  </span>
                </div>
                <p className="text-[10px] md:text-xs text-white/50">{friction.insight}</p>
                {isHighest && (
                  <div className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-red-300 font-medium">⚠️ Punto crítico</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 4️⃣ Comparaciones
function ComparisonsAnalysis() {
  return (
    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
      <h2 className="text-xs md:text-sm font-medium text-white/70 flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
        Comparaciones
      </h2>

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        {comparisons.map((comp, index) => (
          <div key={index} className="rounded-xl bg-white/5 border border-white/10 p-4 md:p-5">
            <div className="text-[10px] md:text-xs text-white/40 mb-3 md:mb-4">{comp.type} vs {comp.type}</div>
            
            <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
              {/* Item A */}
              <div className={cn(
                "flex-1 p-3 md:p-4 rounded-lg border text-center",
                comp.winner === 'A' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"
              )}>
                <p className="text-xs md:text-sm text-white font-medium mb-0.5 md:mb-1 truncate">{comp.itemA.name}</p>
                <p className="text-xl md:text-2xl font-bold text-white">{comp.itemA.value}%</p>
                <p className="text-[10px] md:text-xs text-white/40">{comp.itemA.metric}</p>
                {comp.winner === 'A' && (
                  <span className="inline-block mt-1 md:mt-2 text-[10px] md:text-xs text-emerald-400">✓ Ganador</span>
                )}
              </div>

              <span className="text-white/30 text-xs md:text-sm shrink-0">vs</span>

              {/* Item B */}
              <div className={cn(
                "flex-1 p-3 md:p-4 rounded-lg border text-center",
                comp.winner === 'B' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"
              )}>
                <p className="text-xs md:text-sm text-white font-medium mb-0.5 md:mb-1 truncate">{comp.itemB.name}</p>
                <p className="text-xl md:text-2xl font-bold text-white">{comp.itemB.value}%</p>
                <p className="text-[10px] md:text-xs text-white/40">{comp.itemB.metric}</p>
                {comp.winner === 'B' && (
                  <span className="inline-block mt-1 md:mt-2 text-[10px] md:text-xs text-emerald-400">✓ Ganador</span>
                )}
              </div>
            </div>

            <div className="p-2.5 md:p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs md:text-sm text-violet-300">💡 {comp.insight}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5️⃣ Conclusión IA
function AIConclusion() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm md:text-base text-white font-medium">Conclusión de tu Asesor IA</h3>
          <p className="text-[10px] md:text-xs text-white/40">Resumen ejecutivo de lo que deberías hacer</p>
        </div>
      </div>

      {/* Grid responsive: 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <ConclusionCard
          icon={CheckCircle2}
          title="Qué funciona"
          color="emerald"
          items={aiConclusion.working}
        />
        <ConclusionCard
          icon={TrendingUp}
          title="Qué escalar"
          color="blue"
          items={aiConclusion.scale}
        />
        <ConclusionCard
          icon={PauseCircle}
          title="Qué pausar"
          color="red"
          items={aiConclusion.pause}
        />
        <ConclusionCard
          icon={TestTube}
          title="Qué probar"
          color="amber"
          items={aiConclusion.test}
        />
      </div>
    </div>
  );
}

function ConclusionCard({ icon: Icon, title, color, items }: {
  icon: React.ElementType;
  title: string;
  color: 'emerald' | 'blue' | 'red' | 'amber';
  items: string[];
}) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  const iconColors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  };

  const dotColors = {
    emerald: 'bg-emerald-400',
    blue: 'bg-blue-400',
    red: 'bg-red-400',
    amber: 'bg-amber-400',
  };

  return (
    <div className={cn("rounded-xl border p-3 md:p-4", colorClasses[color])}>
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Icon className={cn("h-3.5 w-3.5 md:h-4 md:w-4", iconColors[color])} />
        <span className="text-xs md:text-sm font-medium text-white">{title}</span>
      </div>
      <ul className="space-y-1.5 md:space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-[10px] md:text-xs text-white/60 flex items-start gap-1.5 md:gap-2">
            <span className={cn("mt-1.5 h-1 w-1 rounded-full shrink-0", dotColors[color])} />
            <span className="line-clamp-2">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricMini({ icon: Icon, label, value, highlight = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={cn(
        "text-sm font-semibold",
        highlight ? "text-violet-300" : "text-white"
      )}>
        {value}
      </div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}
