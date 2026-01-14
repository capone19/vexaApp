import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useN8nChatHistory } from "@/hooks/use-n8n-chat-history";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, X, MessageSquare, Loader2, Radio, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IntentLabel = "alta_intencion" | "en_progreso" | null;
type FilterTab = "todos" | "alta_intencion" | "en_progreso";

interface N8nSession {
  sessionId: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  contactName: string;
  intentLabel: IntentLabel;
  botEnabled: boolean;
}

// Mapeo de etiquetas para búsqueda y display
const INTENT_LABELS: Record<string, { text: string; className: string }> = {
  alta_intencion: {
    text: "Alta intención",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  en_progreso: {
    text: "En progreso",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
};

// Determinar etiqueta de intención basada en cantidad de mensajes
function getIntentLabel(messageCount: number): IntentLabel {
  if (messageCount > 10) return "alta_intencion";
  if (messageCount > 6) return "en_progreso";
  return null;
}

// Badge de intención con colores
function IntentBadge({ label }: { label: IntentLabel }) {
  if (!label) return null;
  
  const config = INTENT_LABELS[label];
  if (!config) return null;
  
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.text}
    </Badge>
  );
}

export default function Chats() {
  const { messages, isLoading, error } = useN8nChatHistory({
    enableRealtime: true,
    limit: 500,
  });
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [botStates, setBotStates] = useState<Record<string, boolean>>({});
  
  const isMobile = useIsMobile();

  // Toggle bot state for a session
  const toggleBotState = (sessionId: string) => {
    setBotStates(prev => ({
      ...prev,
      [sessionId]: prev[sessionId] === undefined ? false : !prev[sessionId],
    }));
  };

  // Process sessions from messages
  const processedSessions = useMemo(() => {
    const sessionMap = new Map<string, N8nSession>();
    
    messages.forEach(msg => {
      const existing = sessionMap.get(msg.session_id);
      const msgDate = new Date(msg.created_at);
      
      // Extract phone number for display
      const contactName = msg.session_id.split('@')[0] || msg.session_id;
      
      if (!existing) {
        sessionMap.set(msg.session_id, {
          sessionId: msg.session_id,
          lastMessage: msg.message.content || '',
          lastMessageAt: msgDate,
          messageCount: 1,
          contactName: `+${contactName}`,
          intentLabel: getIntentLabel(1),
          botEnabled: botStates[msg.session_id] ?? true,
        });
      } else {
        existing.messageCount++;
        existing.intentLabel = getIntentLabel(existing.messageCount);
        existing.botEnabled = botStates[msg.session_id] ?? true;
        if (msgDate > existing.lastMessageAt) {
          existing.lastMessageAt = msgDate;
          existing.lastMessage = msg.message.content || '';
        }
      }
    });
    
    return Array.from(sessionMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [messages, botStates]);

  // Filter sessions by search and tab
  const filteredSessions = useMemo(() => {
    let filtered = processedSessions;
    
    // Filter by tab
    if (filterTab !== "todos") {
      filtered = filtered.filter(s => s.intentLabel === filterTab);
    }
    
    // Filter by search term (including label text)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const labelText = s.intentLabel ? INTENT_LABELS[s.intentLabel]?.text.toLowerCase() : "";
        return (
          s.contactName.toLowerCase().includes(term) ||
          s.lastMessage.toLowerCase().includes(term) ||
          labelText.includes(term)
        );
      });
    }
    
    return filtered;
  }, [processedSessions, searchTerm, filterTab]);

  // Get messages for selected session
  const selectedMessages = useMemo(() => {
    if (!selectedSessionId) return [];
    return messages
      .filter(m => m.session_id === selectedSessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedSessionId]);

  // Get selected session info
  const selectedSession = useMemo(() => {
    return processedSessions.find(s => s.sessionId === selectedSessionId);
  }, [processedSessions, selectedSessionId]);

  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Sin conversaciones</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Cuando tus clientes envíen mensajes por WhatsApp, aparecerán aquí en tiempo real.
      </p>
    </div>
  );

  // Loading State
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">Cargando conversaciones...</p>
    </div>
  );

  // Error State
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <X className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Error al cargar</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reintentar
      </Button>
    </div>
  );

  // Chat List content
  const chatListContent = (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isMobile ? "h-full" : "w-80 flex-shrink-0 rounded-lg border border-border bg-card"
    )}>
      {/* Header with realtime indicator */}
      <div className="p-3 md:p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              Realtime
            </Badge>
            <span className="text-xs text-muted-foreground">
              {processedSessions.length} chats
            </span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-border h-10"
          />
        </div>
        {/* Filter Tabs */}
        <div className="flex gap-1 flex-wrap">
          <Button 
            variant={filterTab === "todos" ? "secondary" : "ghost"} 
            size="sm" 
            className="text-xs h-7"
            onClick={() => setFilterTab("todos")}
          >
            Todos
          </Button>
          <Button 
            variant={filterTab === "en_progreso" ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "text-xs h-7",
              filterTab !== "en_progreso" && "text-muted-foreground"
            )}
            onClick={() => setFilterTab("en_progreso")}
          >
            En progreso
          </Button>
          <Button 
            variant={filterTab === "alta_intencion" ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "text-xs h-7",
              filterTab !== "alta_intencion" && "text-muted-foreground"
            )}
            onClick={() => setFilterTab("alta_intencion")}
          >
            Alta intención
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : filteredSessions.length === 0 ? (
          processedSessions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No se encontraron chats</p>
            </div>
          )
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => setSelectedSessionId(session.sessionId)}
              className={cn(
                "w-full p-4 text-left border-b border-border transition-colors",
                "hover:bg-secondary/50 active:bg-secondary",
                selectedSessionId === session.sessionId && "bg-secondary"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground truncate">
                      {session.contactName}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(session.lastMessageAt, "HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {session.lastMessage || "Sin mensajes"}
                  </p>
                  {session.intentLabel && (
                    <IntentBadge label={session.intentLabel} />
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  // Chat Messages Component
  const ChatMessages = () => {
    if (!selectedSessionId || !selectedSession) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground rounded-lg border border-border bg-card">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Selecciona un chat para ver la conversación</p>
          </div>
        </div>
      );
    }

    const isBotEnabled = botStates[selectedSessionId] ?? true;

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
                onClick={() => setSelectedSessionId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">
                {selectedSession.contactName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Session: {selectedSession.sessionId.slice(0, 12)}...
              </p>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/30">
              Activo
            </Badge>
            {selectedSession.intentLabel && (
              <IntentBadge label={selectedSession.intentLabel} />
            )}
            
            {/* Bot Toggle with Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isBotEnabled}
                      onCheckedChange={() => toggleBotState(selectedSessionId)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Control del chatbot:</strong> Activa o desactiva el chatbot para esta conversación específica. 
                    Cuando está desactivado, el bot no responderá automáticamente y un agente humano deberá atender.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-secondary/30">
          {selectedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Sin mensajes en esta conversación</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedMessages.map((msg) => {
                const isHuman = msg.message.type === 'human';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isHuman ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                        isHuman
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border text-foreground rounded-bl-md"
                      )}
                    >
                      {!isHuman && (
                        <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          <span className="text-[10px] font-medium">VEXA</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.message.content}
                      </p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isHuman ? "opacity-70" : "text-muted-foreground"
                      )}>
                        {format(new Date(msg.created_at), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              disabled
              className="bg-secondary border-border h-11"
            />
            <Button size="icon" className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className={cn(
        "flex flex-col",
        isMobile ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-8rem)]"
      )}>
        {!isMobile && (
          <PageHeader title="Chats" subtitle="Conversaciones en tiempo real" className="mb-4" />
        )}

        {isMobile ? (
          // Mobile: Full screen chat list or messages
          selectedSessionId ? (
            <ChatMessages />
          ) : (
            chatListContent
          )
        ) : (
          // Desktop: Side by side
          <div className="flex flex-1 gap-4 min-h-0">
            {chatListContent}
            <ChatMessages />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
