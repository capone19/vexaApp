// ============================================
// VEXA Ads - Layout Principal (Responsive)
// ============================================
// Layout dark premium con soporte móvil
// Sidebar colapsable en móvil (drawer)
// ============================================

import { useState } from 'react';
import { VexaAdsSidebar } from './VexaAdsSidebar';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface VexaAdsLayoutProps {
  children: React.ReactNode;
}

export function VexaAdsLayout({ children }: VexaAdsLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#09090b] border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">VA</span>
          </div>
          <span className="text-white font-semibold">VEXA Ads</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Menu className="h-5 w-5 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <VexaAdsSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Sidebar - Mobile (Drawer) */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 z-50 h-full transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <VexaAdsSidebar 
          collapsed={false} 
          onToggle={() => setMobileMenuOpen(false)}
          isMobile
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "min-h-screen transition-all duration-300",
        "lg:ml-64", // Desktop margin
        sidebarCollapsed && "lg:ml-20",
        "pt-14 lg:pt-0" // Mobile header padding
      )}>
        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
