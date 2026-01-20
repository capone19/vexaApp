// ============================================
// VEXA Ads - Sidebar Exclusivo (Demo)
// ============================================

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquareText,
  Target,
  Megaphone,
  Image,
  Sparkles,
  Lightbulb,
  DollarSign,
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

const navItems = [
  { title: 'Overview', href: '/vexa-ads', icon: LayoutDashboard },
  { title: 'Insights de Conversaciones', href: '/vexa-ads/insights', icon: MessageSquareText },
  { title: 'Estrategias & Pilares', href: '/vexa-ads/estrategias', icon: Target },
  { title: 'Campañas', href: '/vexa-ads/campanas', icon: Megaphone },
  { title: 'Creativos', href: '/vexa-ads/creativos', icon: Image },
  { title: 'Generación IA', href: '/vexa-ads/generacion-ia', icon: Sparkles },
  { title: 'Recomendaciones IA', href: '/vexa-ads/recomendaciones', icon: Lightbulb },
  { title: 'Presupuesto', href: '/vexa-ads/presupuesto', icon: DollarSign },
  { title: 'Configuración', href: '/vexa-ads/configuracion', icon: Settings },
];

export function VexaAdsSidebar({ collapsed, onToggle }: VexaAdsSidebarProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/vexa-ads') return location.pathname === '/vexa-ads';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen border-r border-white/5 bg-[#0d0d14] transition-all duration-300",
      collapsed ? "w-20" : "w-72"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-[#0d0d14]" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                VEXA Ads
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Premium Module</p>
            </div>
          </div>
        )}
        
        <button 
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              isActive(item.href)
                ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30 shadow-lg shadow-violet-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
            title={collapsed ? item.title : undefined}
          >
            <item.icon className={cn(
              "shrink-0 transition-colors",
              collapsed ? "h-5 w-5" : "h-4 w-4",
              isActive(item.href) ? "text-violet-400" : ""
            )} />
            {!collapsed && (
              <span className="truncate">{item.title}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Back to VEXA */}
      <div className="border-t border-white/5 p-3">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            "text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10",
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

