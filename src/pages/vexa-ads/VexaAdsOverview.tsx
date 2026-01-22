// ============================================
// VEXA Ads - INICIO (Overview) - RESPONSIVE
// ============================================
// "En 10 segundos entiendo cómo va mi negocio"
// Optimizado para móvil
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  MessageSquare, 
  Flame, 
  CheckCircle2, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

// Mock data - Solo 4 métricas clave
const metrics = [
  { 
    id: 'conversations',
    label: 'Conversaciones', 
    value: '1,847', 
    trend: 12, 
    icon: MessageSquare 
  },
  { 
    id: 'hot-leads',
    label: 'Leads Calientes', 
    value: '234', 
    trend: 8, 
    icon: Flame 
  },
  { 
    id: 'conversions',
    label: 'Conversiones', 
    value: '89', 
    trend: -3, 
    icon: CheckCircle2 
  },
  { 
    id: 'investment',
    label: 'Inversión Total', 
    value: '$4,250', 
    trend: 5, 
    icon: DollarSign 
  },
];

// Resumen IA en lenguaje humano
const aiSummary = {
  main: "Esta semana tus campañas están funcionando mejor gracias al ángulo 'Falta de tiempo'.",
  opportunity: "Hay una oportunidad clara de escalar con video corto.",
  action: "Recomendamos aumentar presupuesto en la campaña de remarketing.",
};

export default function VexaAdsOverview() {
  return (
    <VexaAdsLayout>
      {/* Header minimalista */}
      <div className="mb-6 md:mb-10">
        <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
          Bienvenido a VEXA Ads
        </h1>
        <p className="text-white/50 text-xs md:text-sm">
          Tu asesor publicitario con inteligencia artificial
        </p>
      </div>

      {/* 4 Métricas clave - Grid responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Resumen IA */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400" />
          </div>
          <span className="text-xs md:text-sm font-medium text-violet-300">Resumen de tu IA</span>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          <p className="text-white/90 text-sm md:text-lg leading-relaxed">
            {aiSummary.main}
          </p>
          <p className="text-white/60 text-xs md:text-base">
            💡 {aiSummary.opportunity}
          </p>
          <div className="pt-3 md:pt-4 border-t border-white/10">
            <p className="text-xs md:text-sm text-white/50">
              Siguiente paso recomendado:
            </p>
            <p className="text-violet-300 text-sm md:text-base font-medium mt-1">
              {aiSummary.action}
            </p>
          </div>
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-6 md:mt-10 text-center">
        <span className="text-[10px] md:text-xs text-white/30">
          ✨ Datos de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de métrica - Responsive
function MetricCard({ label, value, trend, icon: Icon }: {
  label: string;
  value: string;
  trend: number;
  icon: React.ElementType;
}) {
  const isPositive = trend >= 0;
  
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 md:p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-white/60" />
        </div>
        <div className={`flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="text-xl md:text-2xl font-semibold text-white mb-0.5 md:mb-1">
        {value}
      </div>
      <div className="text-xs md:text-sm text-white/50 truncate">
        {label}
      </div>
    </div>
  );
}
