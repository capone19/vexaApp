// ============================================
// VEXA Ads - Insights de Conversaciones (Demo)
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Brain, 
  AlertTriangle, 
  MessageSquare, 
  TrendingDown,
  Lightbulb,
  Quote
} from 'lucide-react';

// Datos mock
const mockPainPoints = [
  { text: 'Falta de tiempo para cuidado personal', frequency: 67, trend: 'increasing' },
  { text: 'Desconfianza en tratamientos nuevos', frequency: 45, trend: 'stable' },
  { text: 'Preocupación por resultados visibles', frequency: 38, trend: 'decreasing' },
  { text: 'Dificultad para mantener rutinas', frequency: 31, trend: 'increasing' },
];

const mockObjections = [
  { text: '"Es muy caro para mí en este momento"', count: 89, category: 'Precio' },
  { text: '"No tengo tiempo para ir a sesiones"', count: 67, category: 'Tiempo' },
  { text: '"Ya probé algo similar y no funcionó"', count: 45, category: 'Desconfianza' },
  { text: '"Necesito consultarlo con mi pareja"', count: 34, category: 'Decisión' },
];

const mockFrictions = [
  { stage: 'Primera respuesta', dropoff: 23, issue: 'Tiempo de respuesta > 5 min' },
  { stage: 'Presentación de precios', dropoff: 45, issue: 'Falta de opciones de pago' },
  { stage: 'Agendamiento', dropoff: 18, issue: 'Horarios limitados disponibles' },
];

const mockMessages = [
  {
    type: 'objection',
    message: 'Me interesa pero la verdad es que el precio se me hace muy alto, no sé si pueda pagarlo todo de una vez',
    insight: 'Ofrecer planes de pago podría aumentar conversiones en 35%',
  },
  {
    type: 'pain',
    message: 'Es que con el trabajo y los niños no tengo tiempo ni para mí, siempre termino dejando todo a medias',
    insight: 'Destacar la rapidez y comodidad del servicio',
  },
  {
    type: 'friction',
    message: 'Ok me interesa, pero solo puedo los sábados en la mañana y me dijeron que no hay espacio',
    insight: 'Ampliar disponibilidad los fines de semana',
  },
];

export default function VexaAdsInsights() {
  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Insights de Conversaciones</h1>
          <p className="text-white/50 mt-1">Análisis automático de patrones en tus conversaciones</p>
        </div>

        {/* AI Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <Brain className="h-4 w-4 text-violet-400" />
          <span className="text-sm text-violet-300">Análisis generado por IA</span>
          <span className="text-xs text-white/40">• Actualizado hace 2 horas</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pain Points */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Puntos de Dolor Detectados</h2>
                <p className="text-xs text-white/40">Problemas recurrentes mencionados</p>
              </div>
            </div>

            <div className="space-y-3">
              {mockPainPoints.map((point, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-white/80">{point.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">{point.frequency}%</span>
                      <span className={`text-xs ${
                        point.trend === 'increasing' ? 'text-rose-400' : 
                        point.trend === 'decreasing' ? 'text-green-400' : 'text-white/40'
                      }`}>
                        {point.trend === 'increasing' ? '↑' : point.trend === 'decreasing' ? '↓' : '→'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500"
                      style={{ width: `${point.frequency}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Objections */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <MessageSquare className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Objeciones Frecuentes</h2>
                <p className="text-xs text-white/40">Razones comunes de no conversión</p>
              </div>
            </div>

            <div className="space-y-3">
              {mockObjections.map((obj, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-white/60">
                      {obj.category}
                    </span>
                    <span className="text-xs text-white/40">{obj.count} veces</span>
                  </div>
                  <p className="text-sm text-white/80 italic">{obj.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Frictions */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-violet-500/20">
              <TrendingDown className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Fricciones Detectadas</h2>
              <p className="text-xs text-white/40">Puntos donde se pierden conversiones</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockFrictions.map((friction, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">{friction.stage}</span>
                  <span className="text-lg font-bold text-rose-400">-{friction.dropoff}%</span>
                </div>
                <p className="text-xs text-white/50">{friction.issue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example Messages */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-green-500/20">
              <Quote className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Ejemplos Representativos</h2>
              <p className="text-xs text-white/40">Mensajes reales con insights generados</p>
            </div>
          </div>

          <div className="space-y-4">
            {mockMessages.map((msg, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5">
                    <MessageSquare className="h-4 w-4 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 italic mb-3">"{msg.message}"</p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <Lightbulb className="h-4 w-4 text-violet-400 shrink-0" />
                      <p className="text-xs text-violet-300">{msg.insight}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Datos simulados para demostración. En producción, estos insights se generan automáticamente.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

