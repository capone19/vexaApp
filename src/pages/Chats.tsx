import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelStageBadge } from "@/components/shared/FunnelStagesBadge";
import { ChannelBadge } from "@/components/shared/ChannelBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchChats } from "@/lib/mock/data";
import type { Chat, FunnelStage, Channel, ChatStatus } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, AlertTriangle, Send } from "lucide-react";

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all" as "all" | ChatStatus,
    channel: "all" as "all" | Channel,
    stage: "all" as "all" | FunnelStage,
  });

  useEffect(() => {
    const load = async () => {
      const data = await fetchChats();
      setChats(data);
      setSelectedChat(data[0] || null);
      setLoading(false);
    };
    load();
  }, []);

  const filteredChats = chats.filter((chat) => {
    if (filters.search && !chat.userName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status !== "all" && chat.status !== filters.status) return false;
    if (filters.channel !== "all" && chat.channel !== filters.channel) return false;
    if (filters.stage !== "all" && chat.funnelStage !== filters.stage) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <PageHeader title="Chats" subtitle="Gestiona tus conversaciones" className="mb-4" />

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as typeof filters.status })}>
            <SelectTrigger className="w-32 bg-card border-border"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.channel} onValueChange={(v) => setFilters({ ...filters, channel: v as typeof filters.channel })}>
            <SelectTrigger className="w-36 bg-card border-border"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="messenger">Messenger</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.stage} onValueChange={(v) => setFilters({ ...filters, stage: v as typeof filters.stage })}>
            <SelectTrigger className="w-32 bg-card border-border"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="dead">Dead</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Chat List */}
          <div className="w-80 flex-shrink-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors hover:bg-muted/50",
                    selectedChat?.id === chat.id && "bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm">{chat.userName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(chat.lastMessageAt, "HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {chat.messages[chat.messages.length - 1]?.content || "Sin mensajes"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FunnelStageBadge stage={chat.funnelStage} />
                    <ChannelBadge channel={chat.channel} showLabel={false} />
                    {chat.hasHumanIntervention && (
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 rounded-xl border border-border bg-card flex flex-col overflow-hidden">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedChat.userName}</h3>
                      <p className="text-xs text-muted-foreground">Session: {selectedChat.sessionId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedChat.status} />
                    <FunnelStageBadge stage={selectedChat.funnelStage} />
                    <Button variant="outline" size="sm" className="gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Intervención
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedChat.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.sender === "user" ? "justify-start" : "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5",
                            msg.sender === "user"
                              ? "bg-muted text-foreground rounded-bl-md"
                              : msg.sender === "bot"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-warning text-warning-foreground rounded-br-md"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1 opacity-70",
                            msg.sender === "user" ? "text-muted-foreground" : ""
                          )}>
                            {format(msg.timestamp, "HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input (disabled for demo) */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      disabled
                      className="bg-muted/50 border-border"
                    />
                    <Button disabled size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Vista de solo lectura - Demo
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecciona un chat para ver la conversación
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
