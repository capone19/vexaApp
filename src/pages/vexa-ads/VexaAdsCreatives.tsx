// ============================================
// VEXA Ads - Creativos (Demo)
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Image, 
  Sparkles, 
  Upload, 
  Check, 
  X, 
  Edit3,
  Eye,
  MoreVertical,
  Play,
  Pause,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos mock
const mockCreatives = [
  {
    id: 1,
    name: 'Antes/Después - Resultados',
    type: 'image',
    status: 'active',
    performance: 'high',
    impressions: 8540,
    ctr: 6.2,
    thumbnail: '🖼️',
    copy: 'Transforma tu piel en solo 4 sesiones. Resultados reales, clientes reales.',
    strategy: 'Resultados visibles',
  },
  {
    id: 2,
    name: 'Video Testimonio Clara',
    type: 'video',
    status: 'active',
    performance: 'high',
    impressions: 12300,
    ctr: 7.8,
    thumbnail: '🎬',
    copy: '"No podía creer el cambio en mi piel" - Clara, 34 años',
    strategy: 'Prueba social',
  },
  {
    id: 3,
    name: 'Carrusel Servicios',
    type: 'carousel',
    status: 'testing',
    performance: 'medium',
    impressions: 4200,
    ctr: 4.1,
    thumbnail: '📱',
    copy: 'Descubre todos nuestros tratamientos faciales premium →',
    strategy: 'Catálogo',
  },
  {
    id: 4,
    name: 'Promo Flash -30%',
    type: 'image',
    status: 'paused',
    performance: 'low',
    impressions: 2100,
    ctr: 2.3,
    thumbnail: '🏷️',
    copy: '¡Solo por 48 horas! 30% de descuento en tu primera sesión',
    strategy: 'Urgencia',
  },
  {
    id: 5,
    name: 'Story Proceso',
    type: 'video',
    status: 'pending',
    performance: 'pending',
    impressions: 0,
    ctr: 0,
    thumbnail: '📲',
    copy: 'Mira cómo es una sesión paso a paso...',
    strategy: 'Educación',
  },
];

const statusConfig = {
  active: { label: 'Activo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  testing: { label: 'En test', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  paused: { label: 'Pausado', color: 'bg-white/10 text-white/40 border-white/10' },
  pending: { label: 'Pendiente', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

const performanceConfig = {
  high: { label: 'Alto', color: 'text-green-400', icon: TrendingUp },
  medium: { label: 'Medio', color: 'text-amber-400', icon: TrendingUp },
  low: { label: 'Bajo', color: 'text-rose-400', icon: TrendingDown },
  pending: { label: '-', color: 'text-white/40', icon: null },
};

export default function VexaAdsCreatives() {
  const [activeTab, setActiveTab] = useState<'all' | 'generate' | 'upload'>('all');

  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Creativos</h1>
            <p className="text-white/50 mt-1">Gestiona y genera creativos para tus campañas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 w-fit">
          <TabButton 
            active={activeTab === 'all'} 
            onClick={() => setActiveTab('all')}
            icon={Image}
            label="Todos"
          />
          <TabButton 
            active={activeTab === 'generate'} 
            onClick={() => setActiveTab('generate')}
            icon={Sparkles}
            label="Generar con IA"
          />
          <TabButton 
            active={activeTab === 'upload'} 
            onClick={() => setActiveTab('upload')}
            icon={Upload}
            label="Subir material"
          />
        </div>

        {/* Content */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCreatives.map((creative) => {
              const status = statusConfig[creative.status as keyof typeof statusConfig];
              const perf = performanceConfig[creative.performance as keyof typeof performanceConfig];
              const PerfIcon = perf.icon;
              
              return (
                <div 
                  key={creative.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden hover:border-violet-500/30 transition-colors"
                >
                  {/* Preview */}
                  <div className="aspect-video bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center text-6xl">
                    {creative.thumbnail}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{creative.name}</h3>
                        <p className="text-xs text-white/40 mt-0.5">{creative.strategy}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <p className="text-sm text-white/60 line-clamp-2">"{creative.copy}"</p>

                    {creative.status !== 'pending' && (
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-white/40">Impresiones</span>
                          <p className="text-white font-medium">{creative.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-white/40">CTR</span>
                          <p className="text-white font-medium">{creative.ctr}%</p>
                        </div>
                        <div>
                          <span className="text-white/40">Performance</span>
                          <p className={`font-medium flex items-center gap-1 ${perf.color}`}>
                            {PerfIcon && <PerfIcon className="h-3 w-3" />}
                            {perf.label}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      {creative.status === 'pending' ? (
                        <>
                          <button className="flex-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1">
                            <Check className="h-3 w-3" /> Aprobar
                          </button>
                          <button className="flex-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/30 transition-colors flex items-center justify-center gap-1">
                            <X className="h-3 w-3" /> Rechazar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Ver
                          </button>
                          <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> Editar copy
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Generación de Gráficas con IA</h2>
                <p className="text-white/50 mt-2">
                  Crea creativos únicos basados en los insights de tus conversaciones y la identidad de tu marca.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <p className="text-sm font-medium text-white">Imágenes estáticas</p>
                  <p className="text-xs text-white/40 mt-1">Posts, stories, anuncios</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <p className="text-sm font-medium text-white">Videos cortos</p>
                  <p className="text-xs text-white/40 mt-1">Reels, TikTok, stories</p>
                </div>
              </div>
              <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity">
                ✨ Generar nuevo creativo
              </button>
              <p className="text-xs text-white/40">Funcionalidad demo - No genera imágenes reales</p>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="rounded-2xl border border-dashed border-white/20 bg-gradient-to-br from-white/5 to-transparent p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
                <Upload className="h-10 w-10 text-white/40" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Subir Material Propio</h2>
                <p className="text-white/50 mt-2">
                  Arrastra tus imágenes o videos aquí, o haz clic para seleccionar archivos.
                </p>
              </div>
              <button className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-colors">
                Seleccionar archivos
              </button>
              <p className="text-xs text-white/40">PNG, JPG, MP4, MOV hasta 100MB</p>
            </div>
          </div>
        )}

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Interfaz demostrativa. La generación de creativos con IA estará disponible en la versión completa.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

