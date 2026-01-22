// ============================================
// VEXA Ads - DIAGNÓSTICO (Insights Simples)
// ============================================
// Qué dicen los clientes y por qué compran o no
// Solo conclusiones, no data cruda
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  AlertCircle, 
  XCircle, 
  TrendingDown,
  MessageSquare,
} from 'lucide-react';

// Mock data - Puntos de dolor detectados
const painPoints = [
  { label: 'No tengo tiempo', percentage: 45, count: 234 },
  { label: 'Es muy caro', percentage: 28, count: 145 },
  { label: 'Ya probé algo similar', percentage: 15, count: 78 },
  { label: 'No lo necesito ahora', percentage: 12, count: 62 },
];

// Mock data - Objeciones frecuentes
const objections = [
  { label: 'Precio elevado', percentage: 38, responses: 89 },
  { label: 'Falta de confianza', percentage: 25, responses: 58 },
  { label: 'Timing inadecuado', percentage: 22, responses: 51 },
  { label: 'Comparación con competencia', percentage: 15, responses: 35 },
];

// Mock data - Fricciones del proceso
const frictions = [
  { stage: 'Primer contacto', dropRate: 12 },
  { stage: 'Presentación de precio', dropRate: 34 },
  { stage: 'Agendar cita', dropRate: 18 },
  { stage: 'Cierre', dropRate: 8 },
];

export default function VexaAdsDiagnostico() {
  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Diagnóstico
        </h1>
        <p className="text-white/50 text-sm">
          Qué dicen tus clientes y por qué compran (o no)
        </p>
      </div>

      {/* Grid de insights */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Puntos de dolor */}
        <InsightCard 
          title="Puntos de dolor detectados"
          subtitle="Lo que más preocupa a tus clientes"
          icon={AlertCircle}
          iconColor="text-amber-400"
        >
          <div className="space-y-4">
            {painPoints.map((point) => (
              <div key={point.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">"{point.label}"</span>
                  <span className="text-white/50">{point.count} menciones</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    style={{ width: `${point.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </InsightCard>

        {/* Objeciones frecuentes */}
        <InsightCard 
          title="Objeciones frecuentes"
          subtitle="Por qué no compran"
          icon={XCircle}
          iconColor="text-red-400"
        >
          <div className="space-y-4">
            {objections.map((obj) => (
              <div key={obj.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{obj.label}</span>
                  <span className="text-white/50">{obj.responses} respuestas</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full"
                    style={{ width: `${obj.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </InsightCard>
      </div>

      {/* Fricciones del proceso */}
      <InsightCard 
        title="Fricciones del proceso"
        subtitle="Dónde se cae la gente en el embudo"
        icon={TrendingDown}
        iconColor="text-violet-400"
        fullWidth
      >
        <div className="flex items-end justify-between gap-4 pt-4">
          {frictions.map((friction, index) => (
            <div key={friction.stage} className="flex-1 text-center">
              <div className="relative">
                {/* Barra */}
                <div 
                  className="mx-auto w-full max-w-[60px] bg-gradient-to-t from-violet-500/50 to-violet-500 rounded-t-lg"
                  style={{ height: `${friction.dropRate * 4}px` }}
                />
                {/* Porcentaje */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-white">
                  {friction.dropRate}%
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50">
                {friction.stage}
              </div>
              {index < frictions.length - 1 && (
                <div className="absolute top-1/2 right-0 w-8 h-0.5 bg-white/10" />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-white/40 mt-6">
          La mayor caída ocurre en la <span className="text-violet-300">presentación de precio</span>
        </p>
      </InsightCard>

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Datos de demostración basados en análisis de conversaciones
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de card de insight
function InsightCard({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor,
  children,
  fullWidth = false
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 p-6 ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-start gap-3 mb-6">
        <div className={`h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-white font-medium">{title}</h3>
          <p className="text-sm text-white/40">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
