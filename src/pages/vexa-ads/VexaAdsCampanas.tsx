// ============================================
// VEXA Ads - CAMPAÑAS (Estilo Meta Ads Simplificado)
// ============================================
// Vista familiar pero más simple que Meta Ads
// Todo en una sola vista controlable
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Play, 
  Pause, 
  ExternalLink,
  Plus,
  MessageSquare,
  Flame,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Campañas
const campaigns = [
  {
    id: '1',
    name: 'Campaña Principal - Q1',
    status: 'active' as const,
    budget: 150,
    spent: 2340,
    chats: 456,
    hotLeads: 89,
    conversions: 34,
    roas: 3.2,
  },
  {
    id: '2',
    name: 'Remarketing - Carrito Abandonado',
    status: 'active' as const,
    budget: 80,
    spent: 1250,
    chats: 234,
    hotLeads: 67,
    conversions: 28,
    roas: 4.1,
  },
  {
    id: '3',
    name: 'Lookalike - Clientes Premium',
    status: 'paused' as const,
    budget: 100,
    spent: 890,
    chats: 123,
    hotLeads: 23,
    conversions: 8,
    roas: 1.8,
  },
  {
    id: '4',
    name: 'Test - Video Corto',
    status: 'active' as const,
    budget: 50,
    spent: 420,
    chats: 89,
    hotLeads: 34,
    conversions: 12,
    roas: 2.9,
  },
];

// Totales
const totals = {
  spent: campaigns.reduce((acc, c) => acc + c.spent, 0),
  chats: campaigns.reduce((acc, c) => acc + c.chats, 0),
  hotLeads: campaigns.reduce((acc, c) => acc + c.hotLeads, 0),
  conversions: campaigns.reduce((acc, c) => acc + c.conversions, 0),
};

export default function VexaAdsCampanas() {
  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Campañas
          </h1>
          <p className="text-white/50 text-sm">
            Gestiona tus campañas publicitarias
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors border border-white/10">
            <ExternalLink className="h-4 w-4" />
            Abrir en Meta
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </button>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={DollarSign} label="Gasto Total" value={`$${totals.spent.toLocaleString()}`} />
        <SummaryCard icon={MessageSquare} label="Chats" value={totals.chats.toLocaleString()} />
        <SummaryCard icon={Flame} label="Leads Calientes" value={totals.hotLeads.toLocaleString()} />
        <SummaryCard icon={CheckCircle2} label="Conversiones" value={totals.conversions.toLocaleString()} />
      </div>

      {/* Tabla de campañas */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        {/* Header de tabla */}
        <div className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
          <div className="col-span-2">Campaña</div>
          <div className="text-right">Presupuesto</div>
          <div className="text-right">Gasto</div>
          <div className="text-right">Chats</div>
          <div className="text-right">Hot Leads</div>
          <div className="text-right">Conv.</div>
          <div className="text-right">ROAS</div>
        </div>

        {/* Filas de campañas */}
        {campaigns.map((campaign) => (
          <div 
            key={campaign.id}
            className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Nombre y estado */}
            <div className="col-span-2 flex items-center gap-3">
              <button className={cn(
                "p-2 rounded-lg transition-colors",
                campaign.status === 'active' 
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                  : "bg-white/10 text-white/40 hover:bg-white/20"
              )}>
                {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div>
                <div className="text-sm font-medium text-white">{campaign.name}</div>
                <div className={cn(
                  "text-xs",
                  campaign.status === 'active' ? 'text-emerald-400' : 'text-white/40'
                )}>
                  {campaign.status === 'active' ? 'Activa' : 'Pausada'}
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="text-right text-sm text-white/70">${campaign.budget}/día</div>
            <div className="text-right text-sm text-white">${campaign.spent.toLocaleString()}</div>
            <div className="text-right text-sm text-white/70">{campaign.chats}</div>
            <div className="text-right text-sm text-amber-400">{campaign.hotLeads}</div>
            <div className="text-right text-sm text-emerald-400">{campaign.conversions}</div>
            <div className={cn(
              "text-right text-sm font-medium",
              campaign.roas >= 3 ? "text-emerald-400" : campaign.roas >= 2 ? "text-amber-400" : "text-red-400"
            )}>
              {campaign.roas}x
            </div>
          </div>
        ))}
      </div>

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Datos de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de tarjeta de resumen
function SummaryCard({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white/50" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{value}</div>
          <div className="text-xs text-white/40">{label}</div>
        </div>
      </div>
    </div>
  );
}
