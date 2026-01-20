// ============================================
// VEXA Ads - Estrategias & Pilares (Demo)
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Target, 
  Clock, 
  DollarSign, 
  Award, 
  TrendingUp,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';

// Datos mock
const mockStrategies = [
  {
    id: 1,
    name: 'Falta de tiempo',
    description: 'Ángulo enfocado en la rapidez y conveniencia del servicio',
    status: 'active',
    performance: 'high',
    leads: 156,
    conversion: 14.2,
    spent: 450,
    creatives: 8,
  },
  {
    id: 2,
    name: 'Precio / Valor',
    description: 'Comunicación centrada en el retorno de inversión',
    status: 'testing',
    performance: 'medium',
    leads: 89,
    conversion: 9.8,
    spent: 280,
    creatives: 5,
  },
  {
    id: 3,
    name: 'Resultados visibles',
    description: 'Prueba social con antes/después y testimonios',
    status: 'active',
    performance: 'high',
    leads: 203,
    conversion: 16.5,
    spent: 520,
    creatives: 12,
  },
  {
    id: 4,
    name: 'Exclusividad',
    description: 'Posicionamiento premium y diferenciación',
    status: 'saturated',
    performance: 'low',
    leads: 34,
    conversion: 4.2,
    spent: 180,
    creatives: 4,
  },
  {
    id: 5,
    name: 'Urgencia temporal',
    description: 'Ofertas por tiempo limitado y escasez',
    status: 'paused',
    performance: 'medium',
    leads: 67,
    conversion: 11.3,
    spent: 0,
    creatives: 6,
  },
];

const statusConfig = {
  active: { label: 'Activo', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  testing: { label: 'En test', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Sparkles },
  saturated: { label: 'Saturado', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: AlertCircle },
  paused: { label: 'Pausado', color: 'bg-white/10 text-white/40 border-white/10', icon: Pause },
};

const performanceConfig = {
  high: { label: 'Alto', color: 'text-green-400' },
  medium: { label: 'Medio', color: 'text-amber-400' },
  low: { label: 'Bajo', color: 'text-rose-400' },
};

export default function VexaAdsStrategies() {
  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Estrategias & Pilares</h1>
            <p className="text-white/50 mt-1">Gestiona los ángulos de comunicación de tus campañas</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
            + Nueva Estrategia
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Pilares activos" value="3" />
          <StatCard icon={Sparkles} label="En testing" value="1" />
          <StatCard icon={AlertCircle} label="Saturados" value="1" />
          <StatCard icon={TrendingUp} label="Mejor ROAS" value="3.2x" />
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockStrategies.map((strategy) => {
            const status = statusConfig[strategy.status as keyof typeof statusConfig];
            const perf = performanceConfig[strategy.performance as keyof typeof performanceConfig];
            const StatusIcon = status.icon;
            
            return (
              <div 
                key={strategy.id}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 hover:border-violet-500/30 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                      <Target className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                      <p className="text-sm text-white/50">{strategy.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 py-4 border-y border-white/5">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Leads</p>
                    <p className="text-lg font-semibold text-white">{strategy.leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Conversión</p>
                    <p className="text-lg font-semibold text-white">{strategy.conversion}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Invertido</p>
                    <p className="text-lg font-semibold text-white">${strategy.spent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Performance</p>
                    <p className={`text-lg font-semibold ${perf.color}`}>{perf.label}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-white/40">{strategy.creatives} creativos asociados</span>
                  <div className="flex items-center gap-2">
                    {strategy.status === 'paused' ? (
                      <button className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1">
                        <Play className="h-3 w-3" /> Activar
                      </button>
                    ) : strategy.status !== 'saturated' ? (
                      <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1">
                        <Pause className="h-3 w-3" /> Pausar
                      </button>
                    ) : null}
                    <button className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/30 transition-colors">
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Los botones son demostrativos. En producción, las estrategias se sincronizan con Meta Ads.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-violet-400" />
        <div>
          <p className="text-xs text-white/40">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

