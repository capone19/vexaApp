import { useState, useEffect, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useN8nChatHistory } from "@/hooks/use-n8n-chat-history";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, X, MessageSquare, Loader2, Radio } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface N8nSession {
  sessionId: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  contactName: string;
}

export default function Chats() {
  const { messages, sessions, isLoading, error } = useN8nChatHistory({
    enableRealtime: true,
    limit: 500,
  });
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const isMobile = useIsMobile();

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
        });
      } else {
        existing.messageCount++;
        if (msgDate > existing.lastMessageAt) {
          existing.lastMessageAt = msgDate;
          existing.lastMessage = msg.message.content || '';
        }
      }
    });
    
    return Array.from(sessionMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [messages]);

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return processedSessions;
    return processedSessions.filter(s => 
      s.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [processedSessions, searchTerm]);

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
            placeholder="Buscar por número o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-border h-10"
          />
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
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 md:h-4 md:w-4 text-green-600" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{session.contactName}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {format(session.lastMessageAt, "HH:mm", { locale: es })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2 ml-10 md:ml-0">
                {session.lastMessage || "Sin mensajes"}
              </p>
              <div className="flex items-center gap-2 flex-wrap ml-10 md:ml-0">
                <Badge variant="secondary" className="text-xs">
                  {session.messageCount} mensajes
                </Badge>
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
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">
                {selectedSession.contactName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {selectedSession.messageCount} mensajes
              </p>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Badge variant="outline" className="gap-1.5">
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              En vivo
            </Badge>
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
                      isHuman ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                        isHuman
                          ? "bg-background border border-border text-foreground rounded-bl-md"
                          : "bg-primary text-primary-foreground rounded-br-md"
                      )}
                    >
                      {!isHuman && (
                        <div className="flex items-center gap-1 mb-1 opacity-70">
                          <Bot className="h-3 w-3" />
                          <span className="text-[10px] font-medium">VEXA</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.message.content}
                      </p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isHuman ? "text-muted-foreground" : "opacity-70"
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

        {/* Input (disabled - view only) */}
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
            Vista de solo lectura • Datos en tiempo real
          </p>
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
