// ============================================
// VEXA Ads - CAMPAÑAS (Sección Padre) - RESPONSIVE
// ============================================
// Sub-sección 1: Campañas (tabla Meta Ads)
// Sub-sección 2: Presupuesto (control de gasto general)
// Incluye Wizard de creación de campañas
// Optimizado para móvil
// ============================================

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Plus,
  MessageSquare,
  Target,
  Palette,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
  Flame,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Type,
  FileText,
  Sparkles,
  Megaphone,
  Wallet,
  Calendar,
  Zap,
  History,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Campañas estilo Meta Ads
const campaigns = [
  {
    id: '1',
    name: 'Campaña Principal - Conversiones',
    strategy: 'Falta de tiempo',
    creativos: 3,
    status: 'active' as const,
    budget: 50,
    spent: 42.30,
    impressions: 15420,
    ctr: 5.78,
    chats: 156,
    hotLeads: 45,
    conversions: 12,
    roas: 3.2,
    roasTrend: 'up' as const,
  },
  {
    id: '2',
    name: 'Retargeting - Visitantes Web',
    strategy: 'Ahorro de dinero',
    creativos: 2,
    status: 'active' as const,
    budget: 25,
    spent: 23.10,
    impressions: 8750,
    ctr: 6.99,
    chats: 89,
    hotLeads: 34,
    conversions: 8,
    roas: 4.1,
    roasTrend: 'up' as const,
  },
  {
    id: '3',
    name: 'Lookalike - Clientes Premium',
    strategy: 'Confianza',
    creativos: 2,
    status: 'active' as const,
    budget: 30,
    spent: 28.45,
    impressions: 12300,
    ctr: 4.34,
    chats: 67,
    hotLeads: 18,
    conversions: 4,
    roas: 1.8,
    roasTrend: 'down' as const,
  },
  {
    id: '4',
    name: 'Test - Nuevo Ángulo Tiempo',
    strategy: 'Falta de tiempo',
    creativos: 1,
    status: 'learning' as const,
    budget: 15,
    spent: 8.20,
    impressions: 3200,
    ctr: 4.53,
    chats: 23,
    hotLeads: 7,
    conversions: 1,
    roas: 1.2,
    roasTrend: 'neutral' as const,
  },
  {
    id: '5',
    name: 'Promo Temporada - Descuento',
    strategy: 'Ahorro de dinero',
    creativos: 1,
    status: 'paused' as const,
    budget: 20,
    spent: 0,
    impressions: 0,
    ctr: 0,
    chats: 0,
    hotLeads: 0,
    conversions: 0,
    roas: 0,
    roasTrend: 'neutral' as const,
  },
];

// Totales
const totals = {
  chats: campaigns.reduce((acc, c) => acc + c.chats, 0),
  hotLeads: campaigns.reduce((acc, c) => acc + c.hotLeads, 0),
  conversions: campaigns.reduce((acc, c) => acc + c.conversions, 0),
  spent: campaigns.reduce((acc, c) => acc + c.spent, 0),
};

// Presupuesto mock data
const distribution = [
  { name: 'Campaña Principal', percentage: 45, amount: 67.5 },
  { name: 'Remarketing', percentage: 30, amount: 45 },
  { name: 'Test Video', percentage: 15, amount: 22.5 },
  { name: 'Lookalike', percentage: 10, amount: 15 },
];

const budgetHistory = [
  { date: 'Hoy, 14:30', from: 140, to: 150, reason: 'ROAS estable > 3x' },
  { date: 'Ayer, 09:15', from: 160, to: 140, reason: 'Ajuste de usuario' },
  { date: '18 Ene', from: 120, to: 160, reason: 'CTR alto en nuevo creativo' },
];

// Mock data para el wizard
const strategies = [
  { id: '1', name: 'Falta de tiempo', description: 'Para personas ocupadas', performance: 'Alto' },
  { id: '2', name: 'Ahorro de dinero', description: 'Enfocado en el valor y ROI', performance: 'Medio' },
  { id: '3', name: 'Confianza y seguridad', description: 'Testimonios y garantías', performance: 'En test' },
];

const creatives = [
  { id: '1', name: 'Video Testimonial - María', type: 'video', strategyId: '1' },
  { id: '2', name: 'Carrusel Antes/Después', type: 'image', strategyId: '1' },
  { id: '3', name: 'Story - Promo Enero', type: 'video', strategyId: '2' },
  { id: '4', name: 'Imagen Hero Principal', type: 'image', strategyId: '3' },
];

const suggestedTitles = [
  "¿Sin tiempo? Esto es para ti",
  "Transforma tu rutina en minutos",
  "El secreto de quienes lo logran",
  "Resultados desde el día 1",
];

const suggestedCopies = [
  "¿Cansado de no tener tiempo? Descubre cómo otros como tú lo lograron. Miles de personas ya transformaron su vida con nuestro método probado. Escríbenos y te contamos cómo 👇",
  "Sabemos que tu tiempo es oro. Por eso creamos algo especial para ti. Sin complicaciones, sin letra pequeña. Solo resultados. ¿Hablamos?",
  "Imagina lograr en semanas lo que otros tardan meses. No es magia, es método. Y funciona. Escríbenos para saber más 💬",
];

const statusConfig = {
  active: { label: 'Activa', color: 'bg-emerald-500/20 text-emerald-400' },
  learning: { label: 'Aprendiendo', color: 'bg-amber-500/20 text-amber-400' },
  paused: { label: 'Pausada', color: 'bg-white/10 text-white/50' },
};

type TabType = 'campanas' | 'presupuesto';

export default function VexaAdsCampanas() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isPresupuestoRoute = location.pathname.includes('/presupuesto');
  const [activeTab, setActiveTab] = useState<TabType>(isPresupuestoRoute ? 'presupuesto' : 'campanas');

  useEffect(() => {
    setActiveTab(isPresupuestoRoute ? 'presupuesto' : 'campanas');
  }, [isPresupuestoRoute]);
  
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedCreatives, setSelectedCreatives] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCopy, setCustomCopy] = useState('');
  const [campaignBudget, setCampaignBudget] = useState(30);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'presupuesto') {
      navigate('/vexa-ads/campanas/presupuesto');
    } else {
      navigate('/vexa-ads/campanas');
    }
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setSelectedStrategy(null);
    setSelectedCreatives([]);
    setSelectedTitles([]);
    setSelectedCopy(null);
    setCampaignName('');
    setCustomTitle('');
    setCustomCopy('');
    setCampaignBudget(30);
  };

  const totalSteps = 7;

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return true;
      case 2: return selectedStrategy !== null;
      case 3: return selectedCreatives.length > 0;
      case 4: return selectedTitles.length > 0 || customTitle.trim() !== '';
      case 5: return selectedCopy !== null || customCopy.trim() !== '';
      case 6: return campaignBudget >= 5;
      case 7: return campaignName.trim() !== '';
      default: return false;
    }
  };

  const filteredCreatives = selectedStrategy 
    ? creatives.filter(c => c.strategyId === selectedStrategy)
    : creatives;

  return (
    <VexaAdsLayout>
      {/* Vista principal */}
      {!showWizard && (
        <>
          {/* Header - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
                {activeTab === 'campanas' ? 'Campañas' : 'Presupuesto'}
              </h1>
              <p className="text-white/50 text-sm">
                {activeTab === 'campanas' 
                  ? 'Gestiona tus campañas publicitarias' 
                  : 'Controla cuánto gastas, sin sorpresas'}
              </p>
            </div>
            {activeTab === 'campanas' && (
              <div className="flex gap-2 sm:gap-3">
                <button className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors border border-white/10">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden md:inline">Abrir en Meta</span>
                </button>
                <button 
                  onClick={() => setShowWizard(true)}
                  className="flex items-center gap-2 px-4 md:px-5 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva Campaña</span>
                  <span className="sm:hidden">Nueva</span>
                </button>
              </div>
            )}
          </div>

          {/* Tabs de sub-secciones - Responsive */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleTabChange('campanas')}
              className={cn(
                "flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'campanas'
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-transparent"
              )}
            >
              <Megaphone className="h-4 w-4" />
              <span>Campañas</span>
            </button>
            <button
              onClick={() => handleTabChange('presupuesto')}
              className={cn(
                "flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'presupuesto'
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-transparent"
              )}
            >
              <Wallet className="h-4 w-4" />
              <span>Presupuesto</span>
            </button>
          </div>

          {/* Contenido de Campañas */}
          {activeTab === 'campanas' && (
            <>
              {/* KPIs - Grid Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                <KPICard icon={MessageSquare} label="Total Chats" value={totals.chats.toString()} />
                <KPICard icon={Flame} label="Hot Leads" value={totals.hotLeads.toString()} />
                <KPICard icon={CheckCircle2} label="Conversiones" value={totals.conversions.toString()} />
                <KPICard icon={DollarSign} label="Inversión" value={`$${totals.spent.toFixed(2)}`} />
              </div>

              {/* Tabla Desktop */}
              <div className="hidden lg:block rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-3">Campaña</div>
                  <div className="col-span-1 text-center">Estado</div>
                  <div className="col-span-1">Estrategia</div>
                  <div className="col-span-1 text-right">Gastado</div>
                  <div className="col-span-1 text-right">Chats</div>
                  <div className="col-span-1 text-right">Hot Leads</div>
                  <div className="col-span-1 text-right">Conv.</div>
                  <div className="col-span-2 text-right">ROAS</div>
                </div>

                {campaigns.map((campaign) => {
                  const status = statusConfig[campaign.status];
                  return (
                    <div 
                      key={campaign.id}
                      className="grid grid-cols-12 gap-2 px-4 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center group"
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-white block truncate">{campaign.name}</span>
                          <span className="text-xs text-white/40">{campaign.creativos} creativos</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <span className={cn("text-xs px-2 py-1 rounded-full whitespace-nowrap", status.color)}>{status.label}</span>
                      </div>
                      <div className="col-span-1 text-xs text-white/60 truncate">{campaign.strategy}</div>
                      <div className="col-span-1 text-right text-sm text-white font-medium">${campaign.spent.toFixed(2)}</div>
                      <div className="col-span-1 text-right text-sm text-white">{campaign.chats}</div>
                      <div className="col-span-1 text-right text-sm text-amber-400 font-medium">{campaign.hotLeads}</div>
                      <div className="col-span-1 text-right text-sm text-emerald-400 font-medium">{campaign.conversions}</div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <span className={cn(
                          "text-sm font-medium",
                          campaign.roas >= 3 ? "text-emerald-400" : campaign.roas >= 2 ? "text-amber-400" : campaign.roas > 0 ? "text-red-400" : "text-white/30"
                        )}>
                          {campaign.roas > 0 ? `${campaign.roas}x` : '0x'}
                        </span>
                        {campaign.roasTrend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                        {campaign.roasTrend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                        <button className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all">
                          <MoreVertical className="h-4 w-4 text-white/40" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-3">
                {campaigns.map((campaign) => {
                  const status = statusConfig[campaign.status];
                  const isExpanded = expandedCampaign === campaign.id;
                  
                  return (
                    <div 
                      key={campaign.id}
                      className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden"
                    >
                      {/* Card Header - Clickable */}
                      <button
                        onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                        className="w-full p-4 flex items-center gap-3"
                      >
                        <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-5 w-5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-white truncate">{campaign.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", status.color)}>{status.label}</span>
                            <span className="text-xs text-white/40">{campaign.strategy}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-lg font-bold",
                            campaign.roas >= 3 ? "text-emerald-400" : campaign.roas >= 2 ? "text-amber-400" : campaign.roas > 0 ? "text-white" : "text-white/30"
                          )}>
                            {campaign.roas > 0 ? `${campaign.roas}x` : '-'}
                          </p>
                          <p className="text-[10px] text-white/40">ROAS</p>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-white/30 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center">
                              <p className="text-lg font-semibold text-white">{campaign.chats}</p>
                              <p className="text-[10px] text-white/40">Chats</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-amber-400">{campaign.hotLeads}</p>
                              <p className="text-[10px] text-white/40">Hot Leads</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-emerald-400">{campaign.conversions}</p>
                              <p className="text-[10px] text-white/40">Conv.</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-white">${campaign.spent.toFixed(0)}</p>
                              <p className="text-[10px] text-white/40">Gastado</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/40">{campaign.creativos} creativos</span>
                            <button className="text-xs text-violet-400 flex items-center gap-1">
                              Ver detalles <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-3 md:p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 text-center">
                <span className="text-xs md:text-sm text-white/50">✨ Datos simulados. En producción, se sincroniza con Meta Ads API.</span>
              </div>
            </>
          )}

          {/* Contenido de Presupuesto - Dashboard Responsive */}
          {activeTab === 'presupuesto' && (
            <div className="space-y-4 md:space-y-6">
              {/* KPIs - Grid Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="rounded-xl bg-[#141417] border border-white/10 p-4 md:p-5">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-white/40">Gasto Hoy</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-white">$102.05</div>
                  <div className="text-[10px] md:text-xs text-white/40 mt-1">de $150 diario</div>
                  <div className="h-1 md:h-1.5 bg-white/10 rounded-full mt-2 md:mt-3 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: '68%' }} />
                  </div>
                </div>

                <div className="rounded-xl bg-[#141417] border border-white/10 p-4 md:p-5">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-white/40">Esta Semana</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-white">$847.30</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] md:text-xs text-emerald-400">+12% vs anterior</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#141417] border border-white/10 p-4 md:p-5">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-white/40">Este Mes</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-white">$2,456</div>
                  <div className="text-[10px] md:text-xs text-white/40 mt-1">Proyección: $4,500</div>
                </div>

                <div className="rounded-xl bg-[#141417] border border-white/10 p-4 md:p-5">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Zap className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-white/40">ROAS Global</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-emerald-400">3.2x</div>
                  <div className="text-[10px] md:text-xs text-white/40 mt-1">Retorno por $1</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                {/* Distribución por Campaña */}
                <div className="lg:col-span-2 rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
                  <h3 className="text-white font-medium mb-4 md:mb-5 text-sm md:text-base">Distribución por Campaña</h3>
                  <div className="space-y-3 md:space-y-4">
                    {campaigns.filter(c => c.status !== 'paused').map((campaign) => {
                      const percentage = (campaign.spent / totals.spent) * 100;
                      return (
                        <div key={campaign.id}>
                          <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-white truncate">{campaign.name}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                                campaign.roas >= 3 ? "bg-emerald-500/20 text-emerald-400" :
                                campaign.roas >= 2 ? "bg-amber-500/20 text-amber-400" :
                                "bg-red-500/20 text-red-400"
                              )}>
                                {campaign.roas}x
                              </span>
                            </div>
                            <span className="text-white font-medium shrink-0 ml-2">${campaign.spent.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                campaign.roas >= 3 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                                campaign.roas >= 2 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                "bg-gradient-to-r from-violet-500 to-purple-500"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-white/50 text-sm">Total gastado</span>
                    <span className="text-lg md:text-xl font-bold text-white">${totals.spent.toFixed(2)}</span>
                  </div>
                </div>

                {/* Columna lateral */}
                <div className="space-y-4 md:space-y-6">
                  {/* Por Estrategia */}
                  <div className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
                    <h3 className="text-white font-medium mb-4 md:mb-5 text-sm md:text-base">Por Estrategia</h3>
                    <div className="space-y-3 md:space-y-4">
                      {distribution.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2">
                            <span className="text-white/70 truncate">{item.name}</span>
                            <span className="text-white font-medium shrink-0 ml-2">${item.amount}</span>
                          </div>
                          <div className="h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Historial */}
                  <div className="rounded-2xl bg-[#141417] border border-white/10 p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4 md:mb-5">
                      <History className="h-4 w-4 text-white/50" />
                      <h3 className="text-white font-medium text-sm md:text-base">Cambios Recientes</h3>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      {budgetHistory.map((item, index) => (
                        <div key={index} className="pb-3 md:pb-4 border-b border-white/5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] md:text-xs text-white/40">{item.date}</span>
                            <div className="flex items-center gap-1 text-xs md:text-sm">
                              <span className="text-white/50">${item.from}</span>
                              {item.to > item.from ? (
                                <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-400" />
                              ) : (
                                <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-400" />
                              )}
                              <span className="text-white font-medium">${item.to}</span>
                            </div>
                          </div>
                          <p className="text-[10px] md:text-xs text-white/50">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 md:p-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-white/70">
                    El presupuesto de cada campaña se configura al momento de crearla.
                    Aquí puedes monitorear cómo se distribuye tu inversión.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] md:text-xs text-white/30">✨ Los cambios no se guardan (demostración)</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Wizard de creación - Responsive */}
      {showWizard && (
        <div className="max-w-2xl mx-auto px-2 md:px-0">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">Nueva Campaña</h1>
              <p className="text-white/50 text-xs md:text-sm">Paso {wizardStep} de {totalSteps}</p>
            </div>
            <button onClick={resetWizard} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1 mb-6 md:mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1">
                <div className={cn("h-1 md:h-1.5 rounded-full transition-colors", i + 1 <= wizardStep ? "bg-violet-500" : "bg-white/10")} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-8 mb-4 md:mb-6">
            {/* Paso 1: Objetivo */}
            {wizardStep === 1 && (
              <WizardStep icon={MessageSquare} title="Objetivo de la campaña" description="Todas las campañas llevan tráfico a WhatsApp">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 md:p-6 flex items-center gap-3 md:gap-4">
                  <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium mb-1 text-sm md:text-base">Conversaciones en WhatsApp</h4>
                    <p className="text-xs md:text-sm text-white/50">Tu agente de IA atenderá cada lead</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-emerald-400 shrink-0" />
                </div>
              </WizardStep>
            )}

            {/* Paso 2: Estrategia */}
            {wizardStep === 2 && (
              <WizardStep icon={Target} title="Selecciona una estrategia" description="¿Qué mensaje quieres transmitir?">
                <div className="space-y-2 md:space-y-3">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.id}
                      onClick={() => { setSelectedStrategy(strategy.id); setSelectedCreatives([]); }}
                      className={cn(
                        "w-full p-3 md:p-4 rounded-xl border text-left transition-all",
                        selectedStrategy === strategy.id ? "bg-violet-500/20 border-violet-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-white font-medium text-sm md:text-base">{strategy.name}</h4>
                          <p className="text-xs md:text-sm text-white/50 truncate">{strategy.description}</p>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                          <span className={cn(
                            "text-[10px] md:text-xs px-2 py-1 rounded-full whitespace-nowrap",
                            strategy.performance === 'Alto' ? "bg-emerald-500/20 text-emerald-400" :
                            strategy.performance === 'Medio' ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/50"
                          )}>{strategy.performance}</span>
                          {selectedStrategy === strategy.id && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </WizardStep>
            )}

            {/* Paso 3: Creativos */}
            {wizardStep === 3 && (
              <WizardStep icon={Palette} title="Selecciona creativos" description={`Creativos de "${strategies.find(s => s.id === selectedStrategy)?.name}"`}>
                {filteredCreatives.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    {filteredCreatives.map((creative) => (
                      <button
                        key={creative.id}
                        onClick={() => setSelectedCreatives(prev => prev.includes(creative.id) ? prev.filter(id => id !== creative.id) : [...prev, creative.id])}
                        className={cn(
                          "p-3 md:p-4 rounded-xl border text-left transition-all",
                          selectedCreatives.includes(creative.id) ? "bg-violet-500/20 border-violet-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className={cn("h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center", creative.type === 'video' ? 'bg-purple-500/20' : 'bg-blue-500/20')}>
                            <Palette className={cn("h-3.5 w-3.5 md:h-4 md:w-4", creative.type === 'video' ? 'text-purple-400' : 'text-blue-400')} />
                          </div>
                          {selectedCreatives.includes(creative.id) && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />}
                        </div>
                        <h4 className="text-xs md:text-sm text-white font-medium">{creative.name}</h4>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <p className="text-white/50 text-sm">No hay creativos para esta estrategia</p>
                  </div>
                )}
              </WizardStep>
            )}

            {/* Paso 4: Títulos */}
            {wizardStep === 4 && (
              <WizardStep icon={Type} title="Títulos del anuncio" description="Selecciona o escribe los títulos">
                <div className="space-y-2 md:space-y-3 mb-4">
                  {suggestedTitles.map((title, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTitles(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])}
                      className={cn(
                        "w-full p-3 md:p-4 rounded-xl border text-left transition-all",
                        selectedTitles.includes(title) ? "bg-violet-500/20 border-violet-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400 shrink-0" />
                        <p className="text-xs md:text-sm text-white/80 flex-1">{title}</p>
                        {selectedTitles.includes(title) && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-violet-400 shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-3 md:pt-4 border-t border-white/10">
                  <label className="text-xs md:text-sm text-white/50 mb-2 block">O escribe tu propio título:</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej: Descubre el secreto..."
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </WizardStep>
            )}

            {/* Paso 5: Copy */}
            {wizardStep === 5 && (
              <WizardStep icon={FileText} title="Texto principal del anuncio" description="El copy que acompañará tu creativo">
                <div className="space-y-2 md:space-y-3 mb-4">
                  {suggestedCopies.map((copy, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedCopy(copy)}
                      className={cn(
                        "w-full p-3 md:p-4 rounded-xl border text-left transition-all",
                        selectedCopy === copy ? "bg-violet-500/20 border-violet-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start gap-2 md:gap-3">
                        <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-400 shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-white/80 leading-relaxed flex-1">{copy}</p>
                        {selectedCopy === copy && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-violet-400 shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-3 md:pt-4 border-t border-white/10">
                  <label className="text-xs md:text-sm text-white/50 mb-2 block">O escribe tu propio texto:</label>
                  <textarea
                    value={customCopy}
                    onChange={(e) => { setCustomCopy(e.target.value); if (e.target.value) setSelectedCopy(null); }}
                    placeholder="Escribe el texto de tu anuncio..."
                    rows={3}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>
              </WizardStep>
            )}

            {/* Paso 6: Presupuesto */}
            {wizardStep === 6 && (
              <WizardStep icon={Wallet} title="Presupuesto de la campaña" description="¿Cuánto quieres invertir por día?">
                <div className="space-y-4 md:space-y-6">
                  <div className="text-center py-4 md:py-6">
                    <div className="text-4xl md:text-5xl font-bold text-violet-400">${campaignBudget}</div>
                    <div className="text-xs md:text-sm text-white/40 mt-2">por día</div>
                  </div>

                  <div>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      value={campaignBudget}
                      onChange={(e) => setCampaignBudget(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-violet-500
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:shadow-violet-500/50"
                      style={{
                        background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((campaignBudget - 5) / (200 - 5)) * 100}%, rgba(255,255,255,0.1) ${((campaignBudget - 5) / (200 - 5)) * 100}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    <div className="flex justify-between text-[10px] md:text-xs text-white/30 mt-2">
                      <span>$5 mín</span>
                      <span>$200 máx</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4">
                    <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-lg md:text-xl font-semibold text-white">${campaignBudget * 7}</div>
                      <div className="text-[10px] md:text-xs text-white/40 mt-1">Semanal estimado</div>
                    </div>
                    <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-lg md:text-xl font-semibold text-white">${campaignBudget * 30}</div>
                      <div className="text-[10px] md:text-xs text-white/40 mt-1">Mensual estimado</div>
                    </div>
                  </div>

                  <p className="text-[10px] md:text-xs text-white/40 text-center">
                    💡 Puedes ajustar el presupuesto después desde la sección de Presupuesto
                  </p>
                </div>
              </WizardStep>
            )}

            {/* Paso 7: Resumen */}
            {wizardStep === 7 && (
              <WizardStep icon={CheckCircle2} title="Resumen de tu campaña" description="Revisa antes de crear">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs md:text-sm text-white/50 mb-2 block">Nombre de la campaña</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Ej: Campaña Enero 2026"
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 pt-4">
                    <SummaryItem label="Objetivo" value="WhatsApp" />
                    <SummaryItem label="Estrategia" value={strategies.find(s => s.id === selectedStrategy)?.name || '-'} />
                    <SummaryItem label="Creativos" value={`${selectedCreatives.length} seleccionados`} />
                    <SummaryItem label="Presupuesto" value={`$${campaignBudget}/día`} highlight />
                  </div>
                </div>
              </WizardStep>
            )}
          </div>

          {/* Navegación del wizard */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : resetWizard()} 
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-white/50 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{wizardStep === 1 ? 'Cancelar' : 'Atrás'}</span>
            </button>

            {wizardStep < totalSteps ? (
              <button
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all",
                  canProceed() ? "bg-violet-500 hover:bg-violet-600 text-white" : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                <span>Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => { alert('¡Campaña creada! (Demo)'); resetWizard(); }}
                disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all",
                  canProceed() ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Crear</span>
              </button>
            )}
          </div>
        </div>
      )}
    </VexaAdsLayout>
  );
}

function KPICard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 md:p-4">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-white/50" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-white/40 truncate">{label}</p>
          <p className="text-lg md:text-xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WizardStep({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base md:text-lg font-medium text-white truncate">{title}</h3>
          <p className="text-xs md:text-sm text-white/50 truncate">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SummaryItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-2.5 md:p-3 rounded-lg",
      highlight ? "bg-violet-500/10 border border-violet-500/20" : "bg-white/5"
    )}>
      <p className="text-[10px] md:text-xs text-white/40">{label}</p>
      <p className={cn("text-xs md:text-sm font-medium truncate", highlight ? "text-violet-300" : "text-white")}>{value}</p>
    </div>
  );
}
