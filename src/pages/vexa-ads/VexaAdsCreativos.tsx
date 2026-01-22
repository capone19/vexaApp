// ============================================
// VEXA Ads - CREATIVOS (Por Estrategia) - RESPONSIVE
// ============================================
// REGLA: Todo creativo DEBE pertenecer a una estrategia
// Optimizado para móvil
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Image as ImageIcon, 
  Video, 
  Eye,
  Pencil,
  Plus,
  Target,
  Layers,
  FileText,
  Wand2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Estrategias disponibles
const strategies = [
  { 
    id: '1', 
    name: 'Falta de tiempo', 
    description: 'Para personas ocupadas',
    status: 'active' as const,
    creativesCount: 3,
  },
  { 
    id: '2', 
    name: 'Ahorro de dinero', 
    description: 'Enfocado en el valor y ROI',
    status: 'active' as const,
    creativesCount: 2,
  },
  { 
    id: '3', 
    name: 'Confianza y seguridad', 
    description: 'Testimonios y garantías',
    status: 'testing' as const,
    creativesCount: 1,
  },
  { 
    id: '4', 
    name: 'Resultados rápidos', 
    description: 'Cambios visibles en poco tiempo',
    status: 'saturated' as const,
    creativesCount: 1,
  },
];

// Creativos agrupados por estrategia
const creativesByStrategy: Record<string, Creative[]> = {
  '1': [
    {
      id: '1',
      name: 'Testimonio de María',
      description: 'Video corto mostrando cómo María ahorró 3 horas al día',
      type: 'video' as const,
      status: 'active' as const,
      potentialLevel: 'high' as const,
      estimatedCTR: '3.8% - 4.5%',
    },
    {
      id: '2',
      name: 'Carrusel: Un día sin estrés',
      description: 'Carrusel mostrando la rutina ideal vs la rutina actual',
      type: 'carousel' as const,
      status: 'active' as const,
      potentialLevel: 'medium' as const,
      estimatedCTR: '2.5% - 3.2%',
    },
    {
      id: '3',
      name: 'Guión: Día Típico',
      description: 'Idea de video mostrando un día en la vida del cliente ideal',
      type: 'script' as const,
      status: 'draft' as const,
      potentialLevel: 'high' as const,
      estimatedCTR: '4.0% - 5.0%',
    },
  ],
  '2': [
    {
      id: '4',
      name: 'Comparativa de precios',
      description: 'Imagen mostrando el ahorro mensual vs alternativas',
      type: 'image' as const,
      status: 'active' as const,
      potentialLevel: 'medium' as const,
      estimatedCTR: '2.8% - 3.5%',
    },
    {
      id: '5',
      name: 'Video: ROI real',
      description: 'Cliente explicando cuánto ha ahorrado en 6 meses',
      type: 'video' as const,
      status: 'testing' as const,
      potentialLevel: 'pending' as const,
      estimatedCTR: 'En evaluación',
    },
  ],
  '3': [
    {
      id: '6',
      name: 'Caso de éxito - Juan',
      description: 'Imagen con datos y resultados de un cliente satisfecho',
      type: 'image' as const,
      status: 'active' as const,
      potentialLevel: 'medium' as const,
      estimatedCTR: '2.2% - 2.8%',
    },
  ],
  '4': [
    {
      id: '7',
      name: 'Antes y Después',
      description: 'Carrusel mostrando transformaciones reales',
      type: 'carousel' as const,
      status: 'saturated' as const,
      potentialLevel: 'low' as const,
      estimatedCTR: '1.2% - 1.8%',
    },
  ],
};

interface Creative {
  id: string;
  name: string;
  description: string;
  type: 'video' | 'image' | 'carousel' | 'script';
  status: 'active' | 'testing' | 'saturated' | 'draft';
  potentialLevel: 'high' | 'medium' | 'low' | 'pending';
  estimatedCTR: string;
}

const statusConfig = {
  active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  testing: { label: 'En test', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  saturated: { label: 'Saturado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  draft: { label: 'Borrador', color: 'bg-white/10 text-white/50 border-white/20' },
};

const strategyStatusConfig = {
  active: { label: 'Activa', color: 'text-emerald-400' },
  testing: { label: 'En test', color: 'text-amber-400' },
  saturated: { label: 'Saturada', color: 'text-red-400' },
};

const potentialConfig = {
  high: { label: 'Alto', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  medium: { label: 'Medio', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  low: { label: 'Bajo', color: 'text-red-400', bg: 'bg-red-500/10' },
  pending: { label: 'Evaluando', color: 'text-white/50', bg: 'bg-white/5' },
};

const typeConfig = {
  video: { icon: Video, label: 'Video', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  image: { icon: ImageIcon, label: 'Imagen', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  carousel: { icon: Layers, label: 'Carrusel', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  script: { icon: FileText, label: 'Guión', color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

export default function VexaAdsCreativos() {
  const [expandedStrategies, setExpandedStrategies] = useState<string[]>(strategies.map(s => s.id));
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);

  const toggleStrategy = (id: string) => {
    setExpandedStrategies(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">
            Creativos
          </h1>
          <p className="text-white/50 text-xs md:text-sm">
            Ideas publicitarias organizadas por estrategia
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-500/25 w-full sm:w-auto">
          <Wand2 className="h-4 w-4" />
          <span>Generar con IA</span>
        </button>
      </div>

      {/* Mensaje explicativo */}
      <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex items-start gap-2 md:gap-3">
          <Target className="h-4 w-4 md:h-5 md:w-5 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-white/80">
            <span className="text-violet-300 font-medium">Cada creativo pertenece a una estrategia.</span> Esto permite 
            medir qué mensajes funcionan mejor.
          </p>
        </div>
      </div>

      {/* Estrategias con sus creativos */}
      <div className="space-y-3 md:space-y-4">
        {strategies.map((strategy) => {
          const isExpanded = expandedStrategies.includes(strategy.id);
          const strategyCreatives = creativesByStrategy[strategy.id] || [];
          const strategyStatus = strategyStatusConfig[strategy.status];

          return (
            <div key={strategy.id} className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
              {/* Header de estrategia */}
              <button
                onClick={() => toggleStrategy(strategy.id)}
                className="w-full flex items-center justify-between p-3 md:p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <h3 className="text-sm md:text-base text-white font-medium truncate">{strategy.name}</h3>
                      <span className={cn("text-[10px] md:text-xs whitespace-nowrap", strategyStatus.color)}>
                        • {strategyStatus.label}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-sm text-white/40 truncate">{strategy.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
                  <span className="text-xs md:text-sm text-white/50 hidden sm:inline">
                    {strategyCreatives.length} {strategyCreatives.length === 1 ? 'creativo' : 'creativos'}
                  </span>
                  <span className="text-[10px] text-white/50 sm:hidden">
                    {strategyCreatives.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-white/40" />
                  ) : (
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Creativos de la estrategia */}
              {isExpanded && (
                <div className="border-t border-white/10 p-3 md:p-4">
                  {strategyCreatives.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                      {strategyCreatives.map((creative) => (
                        <CreativeCard 
                          key={creative.id} 
                          creative={creative}
                          isSelected={selectedCreative === creative.id}
                          onSelect={() => setSelectedCreative(selectedCreative === creative.id ? null : creative.id)}
                        />
                      ))}
                      
                      {/* Botón agregar */}
                      <button className="rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 p-4 md:p-6 flex flex-col items-center justify-center gap-2 transition-colors group min-h-[120px] md:min-h-[180px]">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-white/5 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
                          <Plus className="h-4 w-4 md:h-5 md:w-5 text-white/30 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <span className="text-xs md:text-sm text-white/40 group-hover:text-white/60">Agregar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-8">
                      <p className="text-white/40 text-sm mb-3">Sin creativos en esta estrategia</p>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-sm hover:bg-violet-500/30 transition-colors">
                        <Plus className="h-4 w-4" />
                        Crear primer creativo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Demo notice */}
      <div className="mt-6 md:mt-8 text-center">
        <span className="text-[10px] md:text-xs text-white/30">
          ✨ Los creativos son representaciones visuales de ideas (demo)
        </span>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de tarjeta de creativo
function CreativeCard({ 
  creative, 
  isSelected,
  onSelect 
}: { 
  creative: Creative;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = statusConfig[creative.status];
  const potential = potentialConfig[creative.potentialLevel];
  const type = typeConfig[creative.type];
  const TypeIcon = type.icon;

  return (
    <div 
      className={cn(
        "rounded-xl bg-white/5 border p-3 md:p-4 transition-all cursor-pointer",
        isSelected 
          ? "border-violet-500/50 bg-violet-500/5" 
          : "border-white/10 hover:border-white/20"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className={cn("h-8 w-8 md:h-9 md:w-9 rounded-lg flex items-center justify-center", type.bg)}>
          <TypeIcon className={cn("h-4 w-4", type.color)} />
        </div>
        <span className={cn("text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border", status.color)}>
          {status.label}
        </span>
      </div>

      {/* Contenido */}
      <h4 className="text-xs md:text-sm text-white font-medium mb-0.5 md:mb-1 truncate">{creative.name}</h4>
      <p className="text-[10px] md:text-xs text-white/40 mb-2 md:mb-3 line-clamp-2">{creative.description}</p>

      {/* Métricas */}
      <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-white/10">
        <div className="flex items-center gap-1 md:gap-1.5">
          <span className="text-[10px] md:text-xs text-white/40">Potencial:</span>
          <span className={cn("text-[10px] md:text-xs font-medium", potential.color)}>{potential.label}</span>
        </div>
        <span className="text-[10px] md:text-xs text-white/50">{creative.estimatedCTR}</span>
      </div>

      {/* Acciones (visible al seleccionar) */}
      {isSelected && (
        <div className="flex gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/10">
          <button className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[10px] md:text-xs transition-colors">
            <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
            Ver
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 px-2 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] md:text-xs transition-colors">
            <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5" />
            Editar
          </button>
          <button className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors">
            <MoreHorizontal className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
