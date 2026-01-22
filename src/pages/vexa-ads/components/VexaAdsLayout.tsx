// ============================================
// VEXA Ads - Layout Principal (Demo)
// ============================================
// Layout dark premium, minimalista
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
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Sidebar */}
      <VexaAdsSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content */}
      <div className={cn(
        "min-h-screen transition-all duration-300",
        sidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        {/* Page Content */}
        <main className="p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
