// ============================================
// VEXA Ads - INICIO (Overview Simple)
// ============================================
// "En 10 segundos entiendo cómo va mi negocio"
// Solo métricas clave + resumen IA en lenguaje humano
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
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Bienvenido a VEXA Ads
        </h1>
        <p className="text-white/50 text-sm">
          Tu asesor publicitario con inteligencia artificial
        </p>
      </div>

      {/* 4 Métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Resumen IA */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <span className="text-sm font-medium text-violet-300">Resumen de tu IA</span>
        </div>
        
        <div className="space-y-4">
          <p className="text-white/90 text-lg leading-relaxed">
            {aiSummary.main}
          </p>
          <p className="text-white/60">
            💡 {aiSummary.opportunity}
          </p>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-white/50">
              Siguiente paso recomendado:
            </p>
            <p className="text-violet-300 font-medium mt-1">
              {aiSummary.action}
            </p>
          </div>
        </div>
      </div>

      {/* Demo notice sutil */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Datos de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de métrica simple
function MetricCard({ label, value, trend, icon: Icon }: {
  label: string;
  value: string;
  trend: number;
  icon: React.ElementType;
}) {
  const isPositive = trend >= 0;
  
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white/60" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="text-2xl font-semibold text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-white/50">
        {label}
      </div>
    </div>
  );
}
