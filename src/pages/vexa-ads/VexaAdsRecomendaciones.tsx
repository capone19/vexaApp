// ============================================
// VEXA Ads - RECOMENDACIONES IA (Asesor Publicitario)
// ============================================
// La IA como asesor experto, no como robot
// Tarjetas con acciones claras y impacto estimado
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Lightbulb, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Video,
  Target,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Recomendaciones
const recommendations = [
  {
    id: '1',
    priority: 'high' as const,
    title: 'Probar video corto',
    description: 'Los videos de menos de 15 segundos están generando 45% más engagement en tu industria.',
    impact: '+45% CTR estimado',
    action: 'Crear video',
    icon: Video,
  },
  {
    id: '2',
    priority: 'high' as const,
    title: 'Escalar campaña de remarketing',
    description: 'Tu ROAS de 4.1x está muy por encima del promedio. Aumentar presupuesto podría multiplicar conversiones.',
    impact: '+60% conversiones',
    action: 'Escalar ahora',
    icon: TrendingUp,
  },
  {
    id: '3',
    priority: 'medium' as const,
    title: 'Nuevo ángulo detectado',
    description: 'Las conversaciones revelan que "ahorro de tiempo" es una preocupación frecuente no explotada.',
    impact: 'Nuevo segmento',
    action: 'Ver pilar',
    icon: Target,
  },
  {
    id: '4',
    priority: 'medium' as const,
    title: 'Pausar creativos saturados',
    description: 'El creativo "Hero Principal" muestra fatiga de audiencia. CTR ha caído 35% en 7 días.',
    impact: 'Mejorar CPL',
    action: 'Revisar',
    icon: AlertCircle,
  },
  {
    id: '5',
    priority: 'low' as const,
    title: 'Optimizar horarios de publicación',
    description: 'Tu audiencia está más activa entre 7-9 PM. Considera ajustar horarios de mayor gasto.',
    impact: '+12% alcance',
    action: 'Aplicar',
    icon: DollarSign,
  },
];

// Recomendaciones aplicadas recientemente
const appliedRecently = [
  { text: 'Aumentaste presupuesto en campaña principal', date: 'Hace 3 días', result: '+23% leads' },
  { text: 'Pausaste creativo saturado "Promo Diciembre"', date: 'Hace 5 días', result: 'CPL mejoró 15%' },
];

const priorityConfig = {
  high: { label: 'Alta prioridad', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  medium: { label: 'Recomendado', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  low: { label: 'Sugerencia', color: 'bg-white/10 text-white/50 border-white/20' },
};

export default function VexaAdsRecomendaciones() {
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const otherRecs = recommendations.filter(r => r.priority !== 'high');

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Recomendaciones IA
            </h1>
            <p className="text-white/50 text-sm">
              Tu asesor publicitario personal
            </p>
          </div>
        </div>
      </div>

      {/* Sección: Requieren atención */}
      {highPriority.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            Requieren atención
          </h2>
          <div className="grid gap-4">
            {highPriority.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Sección: Otras sugerencias */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Otras sugerencias
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {otherRecs.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} compact />
          ))}
        </div>
      </div>

      {/* Sección: Aplicadas recientemente */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Aplicadas recientemente
        </h2>
        <div className="space-y-3">
          {appliedRecently.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-white/70">{item.text}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-emerald-400 font-medium">{item.result}</span>
                <span className="text-xs text-white/30">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Recomendaciones basadas en análisis de datos de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de tarjeta de recomendación
function RecommendationCard({ recommendation, compact = false }: { 
  recommendation: typeof recommendations[0];
  compact?: boolean;
}) {
  const priority = priorityConfig[recommendation.priority];
  const Icon = recommendation.icon;

  if (compact) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center">
            <Icon className="h-4 w-4 text-white/60" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm">{recommendation.title}</h3>
            <p className="text-xs text-white/40 mt-1 line-clamp-2">{recommendation.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-violet-300">{recommendation.impact}</span>
          <button className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1">
            {recommendation.action}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-6 hover:border-violet-500/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Icon className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-medium">{recommendation.title}</h3>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", priority.color)}>
                {priority.label}
              </span>
            </div>
            <p className="text-sm text-white/50">{recommendation.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">{recommendation.impact}</span>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors">
          {recommendation.action}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
