import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatChannelPanel } from "@/components/chats/ChatChannelPanel";
import { ChatChannelTabs } from "@/components/chats/ChatChannelTabs";
import type { ChatChannelId } from "@/lib/chat-channels";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function ChatsPage() {
  const [channelTab, setChannelTab] = useState<ChatChannelId>("whatsapp");
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

      {isMobile && (
        <div className="px-4 pt-2 pb-3 -mx-4 md:mx-0 shrink-0">
          <PageHeader title="Chats" subtitle="Conversaciones en tiempo real" className="mb-3" />
          <ChatChannelTabs value={channelTab} onChange={setChannelTab} />
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <ChatChannelPanel
          key={channelTab}
          channel={channelTab}
          onChannelChange={isMobile ? undefined : setChannelTab}
          showChannelTabs={!isMobile}
        />
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
