import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatChannelPanel } from "@/components/chats/ChatChannelPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function ChatsPage() {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex flex-col",
        isMobile ? "min-h-0" : "h-[calc(100vh-8rem)]"
      )}
    >
      {!isMobile && (
        <PageHeader title="Chats" subtitle="Conversaciones en tiempo real" className="mb-4 shrink-0" />
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <ChatChannelPanel />
      </div>
    </div>
  );
}

export default function Chats() {
  return (
    <MainLayout>
      <ChatsPage />
    </MainLayout>
  );
}
