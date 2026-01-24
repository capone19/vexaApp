import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { MobileSidebar } from "./MobileSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuthContext } from "@/contexts/AuthContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isImpersonating } = useImpersonation();
  const { isAdmin } = useAuthContext();
  
  // Agregar padding top cuando admin está impersonando
  const showImpersonationPadding = isAdmin && isImpersonating;

  return (
    <div className={cn("min-h-screen bg-background", showImpersonationPadding && "pt-12")}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onExpandedChange={setSidebarExpanded} 
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <MobileSidebar 
        open={mobileMenuOpen} 
        onOpenChange={setMobileMenuOpen} 
      />

      {/* Main Content */}
      <div className={cn(
        "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
        // Desktop: margin for sidebar
        !isMobile && (sidebarExpanded ? "ml-64" : "ml-[72px]"),
        // Mobile: no margin, but add bottom padding for nav
        isMobile && "ml-0 pb-20"
      )}>
        <TopBar />
        <main className={cn(
          "flex-1 bg-background",
          // Desktop: normal padding
          "md:p-6",
          // Mobile: tighter padding
          "p-4"
        )}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav onMenuClick={() => setMobileMenuOpen(true)} />
      )}
    </div>
  );
}
