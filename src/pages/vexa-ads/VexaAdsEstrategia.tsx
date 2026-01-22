// ============================================
// VEXA Ads - ESTRATEGIA (Pilares Simples)
// ============================================
// Qué mensajes se usan y cuáles funcionan mejor
// Tarjetas simples con acciones claras
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Clock, 
  DollarSign, 
  Shield, 
  Zap,
  TrendingUp,
  Pause,
  Play,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Estrategias/Pilares
const strategies = [
  { 
    id: '1',
    name: 'Falta de tiempo',
    description: 'Para personas ocupadas que buscan soluciones rápidas',
    status: 'active' as const,
    performance: 'high' as const,
    leads: 156,
    conversion: 12.4,
    icon: Clock,
  },
  { 
    id: '2',
    name: 'Ahorro de dinero',
    description: 'Enfocado en el valor y ROI del servicio',
    status: 'active' as const,
    performance: 'medium' as const,
    leads: 98,
    conversion: 8.2,
    icon: DollarSign,
  },
  { 
    id: '3',
    name: 'Confianza y seguridad',
    description: 'Testimonios, garantías y casos de éxito',
    status: 'testing' as const,
    performance: 'pending' as const,
    leads: 34,
    conversion: 5.1,
    icon: Shield,
  },
  { 
    id: '4',
    name: 'Resultados rápidos',
    description: 'Promesa de cambios visibles en poco tiempo',
    status: 'saturated' as const,
    performance: 'low' as const,
    leads: 23,
    conversion: 2.8,
    icon: Zap,
  },
];

const statusConfig = {
  active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  testing: { label: 'En test', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  saturated: { label: 'Saturado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  paused: { label: 'Pausado', color: 'bg-white/10 text-white/50 border-white/20' },
};

const performanceConfig = {
  high: { label: 'Alto', color: 'text-emerald-400' },
  medium: { label: 'Medio', color: 'text-amber-400' },
  low: { label: 'Bajo', color: 'text-red-400' },
  pending: { label: 'Pendiente', color: 'text-white/40' },
};

export default function VexaAdsEstrategia() {
  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Estrategia
        </h1>
        <p className="text-white/50 text-sm">
          Tus ángulos de mensaje y cuáles funcionan mejor
        </p>
      </div>

      {/* Grid de estrategias */}
      <div className="grid md:grid-cols-2 gap-4">
        {strategies.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} />
        ))}
      </div>

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Estrategias generadas automáticamente desde tus conversaciones
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de tarjeta de estrategia
function StrategyCard({ strategy }: { strategy: typeof strategies[0] }) {
  const status = statusConfig[strategy.status];
  const performance = performanceConfig[strategy.performance];
  const Icon = strategy.icon;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Icon className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">{strategy.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">{strategy.description}</p>
          </div>
        </div>
        <span className={cn("text-xs px-2 py-1 rounded-full border", status.color)}>
          {status.label}
        </span>
      </div>

      {/* Métricas simples */}
      <div className="grid grid-cols-3 gap-4 py-4 border-t border-white/10">
        <div>
          <div className="text-lg font-semibold text-white">{strategy.leads}</div>
          <div className="text-xs text-white/40">Leads</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{strategy.conversion}%</div>
          <div className="text-xs text-white/40">Conversión</div>
        </div>
        <div>
          <div className={cn("text-lg font-semibold flex items-center gap-1", performance.color)}>
            {strategy.performance === 'high' && <TrendingUp className="h-4 w-4" />}
            {performance.label}
          </div>
          <div className="text-xs text-white/40">Performance</div>
        </div>
      </div>

      {/* Acciones simples */}
      <div className="flex gap-2 pt-4 border-t border-white/10">
        {strategy.status === 'active' ? (
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">
            <Pause className="h-4 w-4" />
            Pausar
          </button>
        ) : (
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-sm transition-colors">
            <Play className="h-4 w-4" />
            Activar
          </button>
        )}
        <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
