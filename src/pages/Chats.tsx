import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelStageBadge } from "@/components/shared/FunnelStagesBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fetchChats } from "@/lib/mock/data";
import type { Chat, FunnelStage, ChatStatus } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, Filter, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [botEnabled, setBotEnabled] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all" as "all" | ChatStatus,
    stage: "all" as "all" | FunnelStage,
  });
  
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      const data = await fetchChats();
      setChats(data);
      // Don't auto-select on mobile
      if (!isMobile && data[0]) {
        setSelectedChat(data[0]);
      }
      setLoading(false);
    };
    load();
  }, [isMobile]);

  const filteredChats = chats.filter((chat) => {
    if (filters.search && !chat.userName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status !== "all" && chat.status !== filters.status) return false;
    if (filters.stage !== "all" && chat.funnelStage !== filters.stage) return false;
    return true;
  });

  const hasActiveFilters = filters.status !== "all" || filters.stage !== "all";

  const clearFilters = () => {
    setFilters({ ...filters, status: "all", stage: "all" });
  };

  // Chat List Component
  const ChatList = () => (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isMobile ? "h-full" : "w-80 flex-shrink-0 rounded-lg border border-border bg-card"
    )}>
      {/* Search and Filters */}
      <div className="p-3 md:p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9 bg-background border-border h-10"
          />
        </div>
        
        {isMobile ? (
          // Mobile: Filter button
          <div className="flex items-center gap-2">
            <Button
              variant={hasActiveFilters ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                  {(filters.status !== "all" ? 1 : 0) + (filters.stage !== "all" ? 1 : 0)}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          // Desktop: Inline filters
          <div className="flex gap-2">
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as typeof filters.status })}>
              <SelectTrigger className="flex-1 bg-background border-border h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.stage} onValueChange={(v) => setFilters({ ...filters, stage: v as typeof filters.stage })}>
              <SelectTrigger className="flex-1 bg-background border-border h-9">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="dead">Sin respuesta</SelectItem>
                <SelectItem value="warm">En progreso</SelectItem>
                <SelectItem value="hot">Alta intención</SelectItem>
                <SelectItem value="converted">Conversión</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No se encontraron chats</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "w-full p-4 text-left border-b border-border transition-colors",
                "hover:bg-secondary/50 active:bg-secondary",
                selectedChat?.id === chat.id && "bg-secondary"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{chat.userName}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {format(chat.lastMessageAt, "HH:mm", { locale: es })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2 ml-10 md:ml-0">
                {chat.messages[chat.messages.length - 1]?.content || "Sin mensajes"}
              </p>
              <div className="flex items-center gap-2 flex-wrap ml-10 md:ml-0">
                <FunnelStageBadge stage={chat.funnelStage} />
                {botEnabled[chat.id] === false && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    <Bot className="h-3 w-3" />
                    Off
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  // Chat Messages Component
  const ChatMessages = () => {
    if (!selectedChat) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground rounded-lg border border-border bg-card">
          <p>Selecciona un chat para ver la conversación</p>
        </div>
      );
    }

    return (
      <div className={cn(
        "flex flex-col overflow-hidden",
        isMobile ? "h-full" : "flex-1 rounded-lg border border-border bg-card"
      )}>
        {/* Chat Header */}
        <div className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 -ml-1"
                onClick={() => setSelectedChat(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{selectedChat.userName}</h3>
              <p className="text-xs text-muted-foreground truncate">Session: {selectedChat.sessionId}</p>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {!isMobile && (
              <>
                <StatusBadge status={selectedChat.status} />
                <FunnelStageBadge stage={selectedChat.funnelStage} />
              </>
            )}
            <div className={cn(
              "flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-border bg-secondary/50",
              isMobile && "px-2"
            )}>
              <Bot className="h-4 w-4 text-muted-foreground" />
              {!isMobile && (
                <Label htmlFor="bot-toggle" className="text-sm font-medium cursor-pointer">
                  Bot
                </Label>
              )}
              <Switch
                id="bot-toggle"
                checked={botEnabled[selectedChat.id] !== false}
                onCheckedChange={(checked) => {
                  setBotEnabled(prev => ({ ...prev, [selectedChat.id]: checked }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile: Status badges below header */}
        {isMobile && (
          <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-2">
            <StatusBadge status={selectedChat.status} />
            <FunnelStageBadge stage={selectedChat.funnelStage} />
          </div>
        )}

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
                    "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                    msg.sender === "user"
                      ? "bg-background border border-border text-foreground rounded-bl-md"
                      : msg.sender === "bot"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-warning text-warning-foreground rounded-br-md"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
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
        <div className="p-3 md:p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              disabled
              className="bg-secondary border-border h-11"
            />
            <Button disabled size="icon" className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Vista de solo lectura - Demo
          </p>
        </div>
      </div>
    );
  };

  // Mobile: Filter Sheet
  const FilterSheet = () => (
    <Sheet open={showFilters} onOpenChange={setShowFilters}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado</Label>
            <Select 
              value={filters.status} 
              onValueChange={(v) => setFilters({ ...filters, status: v as typeof filters.status })}
            >
              <SelectTrigger className="w-full bg-background border-border h-12">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Etapa del funnel</Label>
            <Select 
              value={filters.stage} 
              onValueChange={(v) => setFilters({ ...filters, stage: v as typeof filters.stage })}
            >
              <SelectTrigger className="w-full bg-background border-border h-12">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etapas</SelectItem>
                <SelectItem value="dead">Sin respuesta</SelectItem>
                <SelectItem value="warm">En progreso</SelectItem>
                <SelectItem value="hot">Alta intención</SelectItem>
                <SelectItem value="converted">Conversión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={clearFilters}
            >
              Limpiar
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={() => setShowFilters(false)}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <MainLayout>
      <div className={cn(
        "flex flex-col",
        isMobile ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-8rem)]"
      )}>
        {!isMobile && (
          <PageHeader title="Chats" subtitle="Gestiona tus conversaciones" className="mb-4" />
        )}

        {isMobile ? (
          // Mobile: Full screen chat list or messages
          selectedChat ? (
            <ChatMessages />
          ) : (
            <ChatList />
          )
        ) : (
          // Desktop: Side by side
          <div className="flex flex-1 gap-4 min-h-0">
            <ChatList />
            <ChatMessages />
          </div>
        )}

        {/* Mobile Filter Sheet */}
        {isMobile && <FilterSheet />}
      </div>
    </MainLayout>
  );
}
