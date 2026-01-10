import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isExpanded={sidebarExpanded} 
        onExpandedChange={setSidebarExpanded} 
      />
      <div className={cn(
        "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
        sidebarExpanded ? "ml-64" : "ml-[72px]"
      )}>
        <TopBar />
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
