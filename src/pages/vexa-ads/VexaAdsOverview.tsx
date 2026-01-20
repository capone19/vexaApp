// ============================================
// VEXA Ads - Overview (Demo)
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  MessageSquare, 
  Flame, 
  TrendingUp, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
  Zap,
  Brain
} from 'lucide-react';

// Datos mock para la demo
const mockMetrics = {
  conversations: { value: 1247, change: 12.5, trend: 'up' },
  hotLeads: { value: 89, change: 23.1, trend: 'up' },
  conversions: { value: 34, change: -5.2, trend: 'down' },
  adSpend: { value: 2450, change: 8.3, trend: 'up' },
};

const mockCampaigns = [
  { name: 'Campaña Principal Q1', status: 'active', leads: 45, conversion: 12.3 },
  { name: 'Retargeting Warm', status: 'active', leads: 28, conversion: 18.7 },
  { name: 'Lookalike Test', status: 'paused', leads: 16, conversion: 8.2 },
];

const mockRecommendations = [
  {
    type: 'insight',
    icon: Brain,
    title: 'Nuevo ángulo detectado',
    description: 'Se recomienda testear un nuevo ángulo basado en objeciones recientes sobre "falta de tiempo".',
    priority: 'high',
  },
  {
    type: 'optimization',
    icon: Target,
    title: 'Optimización de presupuesto',
    description: 'Mover 15% del presupuesto de Campaña 2 a Campaña 1 podría mejorar ROAS en 22%.',
    priority: 'medium',
  },
  {
    type: 'creative',
    icon: Sparkles,
    title: 'Creativos saturados',
    description: 'Los creativos del grupo A muestran fatiga. Considerar rotar con nuevas variantes.',
    priority: 'high',
  },
];

export default function VexaAdsOverview() {
  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-white/50 mt-1">Resumen de rendimiento de tus campañas publicitarias</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Conversaciones" 
            value={mockMetrics.conversations.value.toLocaleString()}
            change={mockMetrics.conversations.change}
            trend={mockMetrics.conversations.trend as 'up' | 'down'}
            icon={MessageSquare}
          />
          <MetricCard 
            title="Hot Leads" 
            value={mockMetrics.hotLeads.value.toLocaleString()}
            change={mockMetrics.hotLeads.change}
            trend={mockMetrics.hotLeads.trend as 'up' | 'down'}
            icon={Flame}
          />
          <MetricCard 
            title="Conversiones" 
            value={mockMetrics.conversions.value.toLocaleString()}
            change={mockMetrics.conversions.change}
            trend={mockMetrics.conversions.trend as 'up' | 'down'}
            icon={TrendingUp}
          />
          <MetricCard 
            title="Inversión" 
            value={`$${mockMetrics.adSpend.value.toLocaleString()}`}
            change={mockMetrics.adSpend.change}
            trend={mockMetrics.adSpend.trend as 'up' | 'down'}
            icon={Activity}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Recommendations */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Recomendaciones IA</h2>
                <p className="text-xs text-white/40">Sugerencias basadas en análisis de datos</p>
              </div>
            </div>

            <div className="space-y-4">
              {mockRecommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      rec.priority === 'high' 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <rec.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{rec.title}</h3>
                        {rec.priority === 'high' && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Alta prioridad
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/50 mt-1">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Campañas Activas</h2>
              <span className="text-xs text-white/40">Últimos 7 días</span>
            </div>

            <div className="space-y-3">
              {mockCampaigns.map((campaign, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{campaign.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                      campaign.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-white/10 text-white/40'
                    }`}>
                      {campaign.status === 'active' ? 'Activa' : 'Pausada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span>{campaign.leads} leads</span>
                    <span>•</span>
                    <span>{campaign.conversion}% conv.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Esta es una versión demo de VEXA Ads. Los datos mostrados son simulados.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

// Componente MetricCard
function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon 
}: { 
  title: string; 
  value: string; 
  change: number; 
  trend: 'up' | 'down'; 
  icon: any;
}) {
  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-violet-500/30 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
        <div className={`flex items-center gap-1 text-xs ${
          trend === 'up' ? 'text-green-400' : 'text-rose-400'
        }`}>
          {trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50 mt-1">{title}</p>
    </div>
  );
}

