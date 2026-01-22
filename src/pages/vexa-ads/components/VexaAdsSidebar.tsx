// ============================================
// VEXA Ads - Sidebar Responsive
// ============================================
// Navegación con soporte móvil
// Drawer en móvil, sidebar fijo en desktop
// ============================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Stethoscope,
  Target,
  Palette,
  Megaphone,
  BarChart3,
  Lightbulb,
  Settings,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Wallet,
  X,
} from 'lucide-react';

interface VexaAdsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

// Navegación reestructurada
const navItems = [
  { title: 'Inicio', href: '/vexa-ads', icon: Home, step: 1 },
  { title: 'Diagnóstico', href: '/vexa-ads/diagnostico', icon: Stethoscope, step: 2 },
  { title: 'Estrategia', href: '/vexa-ads/estrategia', icon: Target, step: 3 },
  { title: 'Creativos', href: '/vexa-ads/creativos', icon: Palette, step: 4 },
  { 
    title: 'Campañas', 
    href: '/vexa-ads/campanas', 
    icon: Megaphone, 
    step: 5,
    hasChildren: true,
    children: [
      { title: 'Campañas', href: '/vexa-ads/campanas' },
      { title: 'Presupuesto', href: '/vexa-ads/campanas/presupuesto' },
    ]
  },
  { title: 'Análisis', href: '/vexa-ads/analisis', icon: BarChart3, step: 6, isNew: true },
  { title: 'Recomendaciones IA', href: '/vexa-ads/recomendaciones', icon: Lightbulb, step: 7 },
  { title: 'Configuración', href: '/vexa-ads/configuracion', icon: Settings, step: 8 },
];

export function VexaAdsSidebar({ collapsed, onToggle, isMobile = false, onNavigate }: VexaAdsSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Campañas']);

  const isActive = (href: string) => {
    if (href === '/vexa-ads') return location.pathname === '/vexa-ads';
    return location.pathname.startsWith(href);
  };

  const isChildActive = (item: typeof navItems[0]) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.href);
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const sidebarWidth = collapsed && !isMobile ? "w-20" : "w-64";

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen border-r border-white/5 bg-[#09090b] transition-all duration-300",
      sidebarWidth
    )}>
      {/* Logo */}
      <div className="flex h-14 lg:h-16 items-center justify-between border-b border-white/5 px-4">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 lg:h-9 w-8 lg:w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Zap className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-sm lg:text-base font-semibold text-white">
                VEXA Ads
              </h2>
              <p className="text-[10px] text-white/40 hidden lg:block">Módulo Premium</p>
            </div>
          </div>
        )}
        
        {collapsed && !isMobile && (
          <div className="mx-auto h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        )}
      </div>

      {/* Toggle button - Desktop only */}
      {!isMobile && (
        <button 
          onClick={onToggle}
          className="absolute -right-3 top-20 z-50 p-1.5 rounded-full bg-[#18181b] border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-colors hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1 mt-2 lg:mt-4">
        {navItems.map((item) => {
          const isItemActive = isActive(item.href) || isChildActive(item);
          const isExpanded = expandedItems.includes(item.title);
          
          return (
            <div key={item.href}>
              {/* Item principal */}
              {item.hasChildren ? (
                <button
                  onClick={() => (!collapsed || isMobile) && toggleExpanded(item.title)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                    collapsed && !isMobile && "justify-center px-2",
                    isItemActive
                      ? "bg-violet-500/15 text-white border border-violet-500/30"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "shrink-0 flex items-center justify-center",
                    isItemActive && "text-violet-400"
                  )}>
                    <item.icon className={cn(collapsed && !isMobile ? "h-5 w-5" : "h-4 w-4")} />
                  </div>
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="truncate font-medium flex-1 text-left">{item.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                    collapsed && !isMobile && "justify-center px-2",
                    isItemActive
                      ? "bg-violet-500/15 text-white border border-violet-500/30"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  title={collapsed && !isMobile ? item.title : undefined}
                >
                  <div className={cn(
                    "shrink-0 flex items-center justify-center",
                    isItemActive && "text-violet-400"
                  )}>
                    <item.icon className={cn(collapsed && !isMobile ? "h-5 w-5" : "h-4 w-4")} />
                  </div>
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="truncate font-medium">{item.title}</span>
                      {item.isNew && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300 font-medium">
                          NEW
                        </span>
                      )}
                    </>
                  )}
                  {(!collapsed || isMobile) && isItemActive && !item.isNew && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              )}

              {/* Sub-items */}
              {item.hasChildren && (!collapsed || isMobile) && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      to={child.href}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                        location.pathname === child.href
                          ? "text-violet-300 bg-violet-500/10"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      )}
                    >
                      {child.title === 'Presupuesto' && <Wallet className="h-3.5 w-3.5" />}
                      {child.title === 'Campañas' && <Megaphone className="h-3.5 w-3.5" />}
                      <span>{child.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Demo Badge */}
      {(!collapsed || isMobile) && (
        <div className="px-3 lg:px-4 py-2 lg:py-3 mx-2 lg:mx-3 mb-2 lg:mb-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-xs">✨</span>
            <span className="text-xs text-white/60">Modo Demo</span>
          </div>
        </div>
      )}

      {/* Back to VEXA */}
      <div className="border-t border-white/5 p-2 lg:p-3">
        <Link
          to="/"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            "text-white/40 hover:text-white hover:bg-white/5",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <ArrowLeft className={cn("shrink-0", collapsed && !isMobile ? "h-5 w-5" : "h-4 w-4")} />
          {(!collapsed || isMobile) && <span>Volver a VEXA</span>}
        </Link>
      </div>
    </aside>
  );
}
