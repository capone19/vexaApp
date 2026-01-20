// ============================================
// VEXA Ads - Layout Principal (Demo)
// ============================================
// Layout aislado para el módulo premium VEXA Ads
// NO conectar con backend real
// ============================================

import { useState } from 'react';
import { VexaAdsSidebar } from './VexaAdsSidebar';
import { cn } from '@/lib/utils';

interface VexaAdsLayoutProps {
  children: React.ReactNode;
}

export function VexaAdsLayout({ children }: VexaAdsLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Sidebar */}
      <VexaAdsSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content */}
      <div className={cn(
        "min-h-screen transition-all duration-300",
        sidebarCollapsed ? "ml-20" : "ml-72"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-xs font-bold">VA</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">VEXA Ads</h1>
                <p className="text-xs text-white/40">Módulo Premium</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30">
                ✨ Demo Mode
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

