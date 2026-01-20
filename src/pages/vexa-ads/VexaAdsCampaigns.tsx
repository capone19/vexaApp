// ============================================
// VEXA Ads - Campañas (Demo)
// ============================================

import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Megaphone, 
  MoreVertical,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MousePointer,
  MessageSquare,
  Flame,
  CheckCircle
} from 'lucide-react';

// Datos mock tipo Meta Ads
const mockCampaigns = [
  {
    id: 1,
    name: 'Campaña Principal - Conversiones',
    status: 'active',
    budget: 50,
    spent: 42.30,
    impressions: 15420,
    clicks: 892,
    ctr: 5.78,
    cpc: 0.47,
    chats: 156,
    hotLeads: 45,
    conversions: 12,
    roas: 3.2,
    trend: 'up',
  },
  {
    id: 2,
    name: 'Retargeting - Visitantes Web',
    status: 'active',
    budget: 25,
    spent: 23.10,
    impressions: 8750,
    clicks: 612,
    ctr: 6.99,
    cpc: 0.38,
    chats: 89,
    hotLeads: 34,
    conversions: 8,
    roas: 4.1,
    trend: 'up',
  },
  {
    id: 3,
    name: 'Lookalike - Clientes Premium',
    status: 'active',
    budget: 30,
    spent: 28.45,
    impressions: 12300,
    clicks: 534,
    ctr: 4.34,
    cpc: 0.53,
    chats: 67,
    hotLeads: 18,
    conversions: 4,
    roas: 1.8,
    trend: 'down',
  },
  {
    id: 4,
    name: 'Test - Nuevo Ángulo Tiempo',
    status: 'learning',
    budget: 15,
    spent: 8.20,
    impressions: 3200,
    clicks: 145,
    ctr: 4.53,
    cpc: 0.57,
    chats: 23,
    hotLeads: 7,
    conversions: 1,
    roas: 1.2,
    trend: 'stable',
  },
  {
    id: 5,
    name: 'Promo Temporada - Descuento',
    status: 'paused',
    budget: 20,
    spent: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    chats: 0,
    hotLeads: 0,
    conversions: 0,
    roas: 0,
    trend: 'stable',
  },
];

const statusConfig = {
  active: { label: 'Activa', color: 'bg-green-500/20 text-green-400' },
  learning: { label: 'Aprendiendo', color: 'bg-amber-500/20 text-amber-400' },
  paused: { label: 'Pausada', color: 'bg-white/10 text-white/40' },
};

export default function VexaAdsCampaigns() {
  const totals = {
    spent: mockCampaigns.reduce((acc, c) => acc + c.spent, 0),
    chats: mockCampaigns.reduce((acc, c) => acc + c.chats, 0),
    hotLeads: mockCampaigns.reduce((acc, c) => acc + c.hotLeads, 0),
    conversions: mockCampaigns.reduce((acc, c) => acc + c.conversions, 0),
  };

  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campañas</h1>
            <p className="text-white/50 mt-1">Vista simplificada de tus campañas publicitarias</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir en Meta
            </button>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
              + Nueva Campaña
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={MessageSquare} label="Total Chats" value={totals.chats.toString()} />
          <SummaryCard icon={Flame} label="Hot Leads" value={totals.hotLeads.toString()} />
          <SummaryCard icon={CheckCircle} label="Conversiones" value={totals.conversions.toString()} />
          <SummaryCard icon={Megaphone} label="Inversión" value={`$${totals.spent.toFixed(2)}`} />
        </div>

        {/* Campaigns Table */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Campaña</th>
                  <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Estado</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Presupuesto</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Gastado</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Impresiones</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">CTR</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Chats</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Hot Leads</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Conv.</th>
                  <th className="text-right p-4 text-xs font-medium text-white/40 uppercase tracking-wider">ROAS</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {mockCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.status as keyof typeof statusConfig];
                  return (
                    <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-violet-500/20">
                            <Megaphone className="h-4 w-4 text-violet-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm text-white/60">${campaign.budget}/día</td>
                      <td className="p-4 text-right text-sm text-white">${campaign.spent.toFixed(2)}</td>
                      <td className="p-4 text-right text-sm text-white/60">{campaign.impressions.toLocaleString()}</td>
                      <td className="p-4 text-right text-sm text-white/60">{campaign.ctr}%</td>
                      <td className="p-4 text-right text-sm text-white">{campaign.chats}</td>
                      <td className="p-4 text-right text-sm text-amber-400">{campaign.hotLeads}</td>
                      <td className="p-4 text-right text-sm text-green-400">{campaign.conversions}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-sm font-medium ${
                            campaign.roas >= 3 ? 'text-green-400' : 
                            campaign.roas >= 2 ? 'text-amber-400' : 'text-white/60'
                          }`}>
                            {campaign.roas}x
                          </span>
                          {campaign.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
                          {campaign.trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
                          {campaign.trend === 'stable' && <Minus className="h-3 w-3 text-white/40" />}
                        </div>
                      </td>
                      <td className="p-4">
                        <button className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Datos simulados. En producción, esta tabla se sincroniza automáticamente con Meta Ads API.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/20">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-xs text-white/40">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

