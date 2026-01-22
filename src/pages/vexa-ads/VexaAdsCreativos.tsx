// ============================================
// VEXA Ads - CREATIVOS (Unificado con Generación IA)
// ============================================
// Una sola sección para ver, generar y subir creativos
// Nada de módulos duplicados
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Image as ImageIcon, 
  Video, 
  Sparkles,
  Upload,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Wand2,
  FileImage,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - Creativos
const creatives = [
  {
    id: '1',
    name: 'Video Testimonial - María',
    type: 'video' as const,
    status: 'active' as const,
    performance: 'high' as const,
    impressions: 45600,
    ctr: 4.2,
    strategy: 'Falta de tiempo',
  },
  {
    id: '2',
    name: 'Carrusel Antes/Después',
    type: 'image' as const,
    status: 'active' as const,
    performance: 'medium' as const,
    impressions: 32100,
    ctr: 2.8,
    strategy: 'Resultados rápidos',
  },
  {
    id: '3',
    name: 'Story - Promo Enero',
    type: 'video' as const,
    status: 'testing' as const,
    performance: 'pending' as const,
    impressions: 8900,
    ctr: 3.1,
    strategy: 'Ahorro de dinero',
  },
  {
    id: '4',
    name: 'Imagen Principal - Hero',
    type: 'image' as const,
    status: 'saturated' as const,
    performance: 'low' as const,
    impressions: 89000,
    ctr: 1.2,
    strategy: 'Confianza',
  },
];

const statusConfig = {
  active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400' },
  testing: { label: 'En test', color: 'bg-amber-500/20 text-amber-400' },
  saturated: { label: 'Saturado', color: 'bg-red-500/20 text-red-400' },
  paused: { label: 'Pausado', color: 'bg-white/10 text-white/40' },
};

const performanceConfig = {
  high: { icon: TrendingUp, color: 'text-emerald-400' },
  medium: { icon: TrendingUp, color: 'text-amber-400' },
  low: { icon: TrendingDown, color: 'text-red-400' },
  pending: { icon: null, color: 'text-white/40' },
};

export default function VexaAdsCreativos() {
  const [activeTab, setActiveTab] = useState<'all' | 'generate' | 'upload'>('all');

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Creativos
          </h1>
          <p className="text-white/50 text-sm">
            Gestiona, genera y sube tus creativos publicitarios
          </p>
        </div>
      </div>

      {/* Tabs simples */}
      <div className="flex gap-2 mb-8">
        <TabButton 
          active={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
          icon={ImageIcon}
          label="Todos los creativos"
        />
        <TabButton 
          active={activeTab === 'generate'} 
          onClick={() => setActiveTab('generate')}
          icon={Wand2}
          label="Generar con IA"
        />
        <TabButton 
          active={activeTab === 'upload'} 
          onClick={() => setActiveTab('upload')}
          icon={Upload}
          label="Subir material"
        />
      </div>

      {/* Contenido según tab */}
      {activeTab === 'all' && (
        <div className="grid md:grid-cols-2 gap-4">
          {creatives.map((creative) => (
            <CreativeCard key={creative.id} creative={creative} />
          ))}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Generación con IA
          </h3>
          <p className="text-white/50 max-w-md mx-auto mb-6">
            Crea creativos automáticamente basados en tus estrategias ganadoras y el análisis de conversaciones.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors">
              Generar Video
            </button>
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
              Generar Imagen
            </button>
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
              Generar Carrusel
            </button>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="rounded-2xl border-2 border-dashed border-white/20 hover:border-violet-500/50 p-12 text-center transition-colors cursor-pointer">
          <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <FileImage className="h-8 w-8 text-white/40" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Arrastra archivos aquí
          </h3>
          <p className="text-white/50 text-sm mb-4">
            o haz clic para seleccionar
          </p>
          <p className="text-xs text-white/30">
            Soporta: JPG, PNG, MP4, MOV (máx. 100MB)
          </p>
        </div>
      )}

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Funcionalidad de demostración
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de tab
function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
          : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// Componente de tarjeta de creativo
function CreativeCard({ creative }: { creative: typeof creatives[0] }) {
  const status = statusConfig[creative.status];
  const perf = performanceConfig[creative.performance];

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            creative.type === 'video' ? 'bg-purple-500/20' : 'bg-blue-500/20'
          )}>
            {creative.type === 'video' ? (
              <Video className="h-5 w-5 text-purple-400" />
            ) : (
              <ImageIcon className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="text-white font-medium">{creative.name}</h3>
            <p className="text-xs text-white/40">{creative.strategy}</p>
          </div>
        </div>
        <span className={cn("text-xs px-2 py-1 rounded-full", status.color)}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4 border-t border-white/10">
        <div>
          <div className="text-sm font-medium text-white">{(creative.impressions / 1000).toFixed(1)}K</div>
          <div className="text-xs text-white/40">Impresiones</div>
        </div>
        <div>
          <div className="text-sm font-medium text-white">{creative.ctr}%</div>
          <div className="text-xs text-white/40">CTR</div>
        </div>
        <div className="flex items-center gap-1">
          {perf.icon && <perf.icon className={cn("h-4 w-4", perf.color)} />}
          <span className={cn("text-sm font-medium", perf.color)}>
            {creative.performance === 'high' ? 'Alto' : creative.performance === 'medium' ? 'Medio' : creative.performance === 'low' ? 'Bajo' : 'Pendiente'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-white/10">
        {creative.status === 'active' ? (
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
