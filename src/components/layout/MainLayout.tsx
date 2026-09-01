import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { MobileSidebar } from "./MobileSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { ChatRealtimeSyncProvider } from "@/hooks/use-chat-realtime-sync";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isImpersonating } = useImpersonation();
  const { isAdmin } = useAuthContext();
  const { tenantId } = useEffectiveTenant();

  const showImpersonationPadding = isAdmin && isImpersonating;

  return (
    <NotificationsProvider>
      <ChatRealtimeSyncProvider
        tenantId={tenantId}
        enablePollingFallback
        pollingIntervalMs={30000}
      >
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
            !isMobile && (sidebarExpanded ? "ml-64" : "ml-[72px]"),
            isMobile && "ml-0 pb-20"
          )}>
            <TopBar />
            <main className={cn(
              "flex-1 bg-background",
              "md:p-6",
              "p-4"
            )}>
              {children}
            </main>
          </div>

          {isMobile && (
            <MobileNav onMenuClick={() => setMobileMenuOpen(true)} />
          )}
        </div>
      </ChatRealtimeSyncProvider>
    </NotificationsProvider>
  );
}
