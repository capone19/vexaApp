import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelStageBadge } from "@/components/shared/FunnelStagesBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchChats } from "@/lib/mock/data";
import type { Chat, FunnelStage, ChatStatus } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [botEnabled, setBotEnabled] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    search: "",
    status: "all" as "all" | ChatStatus,
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
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as typeof filters.status })}>
            <SelectTrigger className="w-32 bg-background border-border"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.stage} onValueChange={(v) => setFilters({ ...filters, stage: v as typeof filters.stage })}>
            <SelectTrigger className="w-36 bg-background border-border"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="dead">Sin respuesta</SelectItem>
              <SelectItem value="warm">En progreso</SelectItem>
              <SelectItem value="hot">Alta intención</SelectItem>
              <SelectItem value="converted">Conversión</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Chat List */}
          <div className="w-80 flex-shrink-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors hover:bg-secondary/50",
                    selectedChat?.id === chat.id && "bg-secondary"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm text-foreground">{chat.userName}</span>
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
                    {botEnabled[chat.id] === false && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        <Bot className="h-3 w-3" />
                        Off
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 rounded-lg border border-border bg-card flex flex-col overflow-hidden">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedChat.userName}</h3>
                      <p className="text-xs text-muted-foreground">Session: {selectedChat.sessionId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedChat.status} />
                    <FunnelStageBadge stage={selectedChat.funnelStage} />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="bot-toggle" className="text-sm font-medium cursor-pointer">
                        Bot
                      </Label>
                      <Switch
                        id="bot-toggle"
                        checked={botEnabled[selectedChat.id] !== false}
                        onCheckedChange={(checked) => {
                          setBotEnabled(prev => ({ ...prev, [selectedChat.id]: checked }));
                          // Aquí se conectará con n8n/Supabase para actualizar el estado
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-secondary/30">
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
                            "max-w-[70%] rounded-lg px-4 py-2.5 shadow-sm",
                            msg.sender === "user"
                              ? "bg-background border border-border text-foreground"
                              : msg.sender === "bot"
                              ? "bg-primary text-primary-foreground"
                              : "bg-warning text-warning-foreground"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.sender === "user" ? "text-muted-foreground" : "opacity-70"
                          )}>
                            {format(msg.timestamp, "HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input (disabled for demo) */}
                <div className="p-4 border-t border-border bg-background">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      disabled
                      className="bg-secondary border-border"
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
