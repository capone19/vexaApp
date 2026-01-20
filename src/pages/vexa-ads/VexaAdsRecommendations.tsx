// ============================================
// VEXA Ads - Recomendaciones IA (Demo)
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Lightbulb, 
  Video, 
  Clock, 
  AlertTriangle, 
  Target, 
  TrendingUp,
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

// Datos mock
const mockRecommendations = [
  {
    id: 1,
    type: 'creative',
    icon: Video,
    priority: 'high',
    title: 'Recomendamos testear video corto',
    description: 'Los videos de menos de 15 segundos están generando 3x más engagement en tu audiencia. Sugiero crear un video testimonial rápido.',
    action: 'Crear video',
    impact: '+45% CTR estimado',
    createdAt: 'Hace 2 horas',
  },
  {
    id: 2,
    type: 'fatigue',
    icon: AlertTriangle,
    priority: 'high',
    title: 'Pilar "Exclusividad" muestra fatiga',
    description: 'Este ángulo lleva 14 días sin variación y el CTR ha caído 32%. Recomiendo rotar creativos o pausar temporalmente.',
    action: 'Ver pilar',
    impact: 'Evitar -$120/día',
    createdAt: 'Hace 4 horas',
  },
  {
    id: 3,
    type: 'timing',
    icon: Clock,
    priority: 'medium',
    title: 'Mejor horario detectado: 18:00–21:00',
    description: 'El 67% de tus conversiones ocurren en este rango horario. Considera aumentar presupuesto en estas horas.',
    action: 'Ajustar horarios',
    impact: '+28% conversiones',
    createdAt: 'Hace 6 horas',
  },
  {
    id: 4,
    type: 'budget',
    icon: TrendingUp,
    priority: 'medium',
    title: 'Oportunidad de escalar Campaña 1',
    description: 'Esta campaña mantiene ROAS estable hace 7 días. Puedes aumentar presupuesto 20% sin perder eficiencia.',
    action: 'Escalar',
    impact: '+$340/semana',
    createdAt: 'Hace 8 horas',
  },
  {
    id: 5,
    type: 'audience',
    icon: Target,
    priority: 'low',
    title: 'Nueva audiencia sugerida',
    description: 'Detectamos un segmento de mujeres 35-44 con interés en skincare que podría responder bien a tu oferta.',
    action: 'Crear audiencia',
    impact: 'Nuevo mercado',
    createdAt: 'Hace 12 horas',
  },
  {
    id: 6,
    type: 'copy',
    icon: Sparkles,
    priority: 'low',
    title: 'Variación de copy sugerida',
    description: 'Basado en objeciones frecuentes, sugiero probar: "Sin tiempo? En solo 30 minutos transformamos tu piel"',
    action: 'Probar copy',
    impact: 'Test A/B',
    createdAt: 'Hace 1 día',
  },
];

const priorityConfig = {
  high: { label: 'Alta prioridad', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  medium: { label: 'Media', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  low: { label: 'Sugerencia', color: 'bg-white/10 text-white/40 border-white/10' },
};

export default function VexaAdsRecommendations() {
  const highPriority = mockRecommendations.filter(r => r.priority === 'high');
  const otherRecs = mockRecommendations.filter(r => r.priority !== 'high');

  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Recomendaciones IA</h1>
          <p className="text-white/50 mt-1">Sugerencias automáticas basadas en el análisis de tus datos</p>
        </div>

        {/* AI Status */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <Zap className="h-6 w-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Motor de IA activo</p>
            <p className="text-xs text-white/50">Analizando 1,247 conversaciones y 5 campañas activas</p>
          </div>
          <span className="text-xs text-violet-400">Última actualización: hace 2 horas</span>
        </div>

        {/* High Priority Section */}
        {highPriority.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              Requieren atención
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {highPriority.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Other Recommendations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            Otras sugerencias
          </h2>
          <div className="space-y-3">
            {otherRecs.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} compact />
            ))}
          </div>
        </div>

        {/* Applied Recommendations */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Aplicadas recientemente
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white/70">Aumentado presupuesto de Retargeting en 15%</span>
              </div>
              <span className="text-xs text-white/40">Hace 3 días</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white/70">Rotados creativos del grupo A</span>
              </div>
              <span className="text-xs text-white/40">Hace 5 días</span>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Recomendaciones simuladas para demostración. En producción, se generan en tiempo real.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

function RecommendationCard({ 
  recommendation, 
  compact = false 
}: { 
  recommendation: typeof mockRecommendations[0]; 
  compact?: boolean;
}) {
  const priority = priorityConfig[recommendation.priority as keyof typeof priorityConfig];
  const Icon = recommendation.icon;

  if (compact) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className="h-4 w-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white truncate">{recommendation.title}</h3>
              <span className={`px-2 py-0.5 text-[10px] rounded-full border shrink-0 ${priority.color}`}>
                {priority.label}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">{recommendation.createdAt}</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/30 transition-colors flex items-center gap-1 shrink-0">
            {recommendation.action}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 hover:border-violet-500/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          recommendation.priority === 'high' ? 'bg-rose-500/20' : 'bg-amber-500/20'
        }`}>
          <Icon className={`h-5 w-5 ${
            recommendation.priority === 'high' ? 'text-rose-400' : 'text-amber-400'
          }`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-white">{recommendation.title}</h3>
            <span className={`px-2 py-0.5 text-[10px] rounded-full border ${priority.color}`}>
              {priority.label}
            </span>
          </div>
          <p className="text-sm text-white/60 mb-4">{recommendation.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400 font-medium">{recommendation.impact}</span>
              <span className="text-white/40">{recommendation.createdAt}</span>
            </div>
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
              {recommendation.action}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

