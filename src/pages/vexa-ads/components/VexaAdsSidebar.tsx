// ============================================
// VEXA Ads - Sidebar Simplificado (Demo)
// ============================================
// Navegación por PASOS LÓGICOS, no módulos técnicos
// ============================================

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Stethoscope,
  Target,
  Megaphone,
  Palette,
  Lightbulb,
  Wallet,
  Settings,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface VexaAdsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Navegación simplificada por pasos lógicos
const navItems = [
  { title: 'Inicio', href: '/vexa-ads', icon: Home, step: 1 },
  { title: 'Diagnóstico', href: '/vexa-ads/diagnostico', icon: Stethoscope, step: 2 },
  { title: 'Estrategia', href: '/vexa-ads/estrategia', icon: Target, step: 3 },
  { title: 'Campañas', href: '/vexa-ads/campanas', icon: Megaphone, step: 4 },
  { title: 'Creativos', href: '/vexa-ads/creativos', icon: Palette, step: 5 },
  { title: 'Recomendaciones IA', href: '/vexa-ads/recomendaciones', icon: Lightbulb, step: 6 },
  { title: 'Presupuesto', href: '/vexa-ads/presupuesto', icon: Wallet, step: 7 },
  { title: 'Configuración', href: '/vexa-ads/configuracion', icon: Settings, step: 8 },
];

export function VexaAdsSidebar({ collapsed, onToggle }: VexaAdsSidebarProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/vexa-ads') return location.pathname === '/vexa-ads';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen border-r border-white/5 bg-[#09090b] transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Zap className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                VEXA Ads
              </h2>
              <p className="text-[10px] text-white/40">Tu asesor publicitario</p>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="mx-auto h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 p-1.5 rounded-full bg-[#18181b] border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
              collapsed && "justify-center px-2",
              isActive(item.href)
                ? "bg-violet-500/15 text-white border border-violet-500/30"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
            title={collapsed ? item.title : undefined}
          >
            <div className={cn(
              "shrink-0 flex items-center justify-center",
              isActive(item.href) && "text-violet-400"
            )}>
              <item.icon className={cn(collapsed ? "h-5 w-5" : "h-4 w-4")} />
            </div>
            {!collapsed && (
              <span className="truncate font-medium">{item.title}</span>
            )}
            {!collapsed && isActive(item.href) && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
            )}
          </Link>
        ))}
      </nav>

      {/* Demo Badge */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-xs">✨</span>
            <span className="text-xs text-white/60">Modo Demo</span>
          </div>
        </div>
      )}

      {/* Back to VEXA */}
      <div className="border-t border-white/5 p-3">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            "text-white/40 hover:text-white hover:bg-white/5",
            collapsed && "justify-center px-2"
          )}
        >
          <ArrowLeft className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!collapsed && <span>Volver a VEXA</span>}
        </Link>
      </div>
    </aside>
  );
}
