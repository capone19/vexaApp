import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useN8nChatHistory } from "@/hooks/use-n8n-chat-history";
import { externalSupabase } from "@/integrations/supabase/external-client";
import { WEBHOOKS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, X, MessageSquare, Loader2, Radio } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  phoneNumber: string;
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
  const { user, isLoading: authLoading } = useAuth();
  
  // Determinar si el usuario es admin (ve todos los chats)
  const isAdmin = user?.role === 'admin';
  
  // Filtrar por tenant: admins ven todo, otros usuarios solo su tenant
  const { messages, isLoading, error, refetch } = useN8nChatHistory({
    enableRealtime: true,
    limit: 1000, // Aumentar límite para ver más mensajes
    tenantId: isAdmin ? undefined : user?.tenantId || undefined,
  });
  
  // Log para debug
  useEffect(() => {
    console.log('[Chats] User tenantId:', user?.tenantId, 'isAdmin:', isAdmin);
    console.log('[Chats] Total messages loaded:', messages.length);
    const uniqueSessions = [...new Set(messages.map(m => m.session_id))];
    console.log('[Chats] Unique sessions:', uniqueSessions.length, uniqueSessions);
  }, [messages, user?.tenantId, isAdmin]);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [botStates, setBotStates] = useState<Record<string, boolean>>({});
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Auto-scroll al último mensaje cuando cambia la selección o llegan nuevos mensajes
  useEffect(() => {
    if (selectedSessionId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedSessionId, messages]);

  // Obtener el tenant_id de los mensajes de la sesión seleccionada
  const selectedSessionTenantId = useMemo(() => {
    if (!selectedSessionId) return null;
    const sessionMessages = messages.filter(m => m.session_id === selectedSessionId);
    // Buscar el primer mensaje que tenga tenant_id
    const messageWithTenant = sessionMessages.find(m => m.tenant_id);
    return messageWithTenant?.tenant_id || null;
  }, [messages, selectedSessionId]);

  // Enviar mensaje de agente humano via edge function proxy
  const sendHumanMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedSessionId || isSendingMessage) return;
    
    const messageContent = messageInput.trim();
    setIsSendingMessage(true);
    
    try {
      // Usar el tenant_id directamente de los mensajes del chat
      console.log("[Chats] Sending message to tenant:", selectedSessionTenantId || "none");
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/human-message-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            message: messageContent,
            session_id: selectedSessionId,
            tenant_id: selectedSessionTenantId, // Usar el tenant_id de los mensajes del chat
            source: "human_agent",
            timestamp: new Date().toISOString(),
          }),
        }
      );

      const result: { success: boolean; status?: number; response?: string; error?: string } =
        await response.json();

      if (!result.success) {
        const details = result.status
          ? `n8n HTTP ${result.status}${result.response ? `: ${result.response}` : ""}`
          : result.error || "Error del servidor";
        throw new Error(details);
      }

      setMessageInput(""); // Limpiar solo si fue exitoso
      toast.success("Mensaje enviado");
      setTimeout(() => refetch?.(), 1000);
    } catch (err) {
      console.error("[Chats] Error sending human message:", err);
      toast.error(err instanceof Error ? err.message : "Error al enviar el mensaje");
    } finally {
      setIsSendingMessage(false);
    }
  }, [messageInput, selectedSessionId, isSendingMessage, refetch, selectedSessionTenantId]);

  // Manejar Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendHumanMessage();
    }
  };

  // Flag para evitar múltiples cargas iniciales
  const botStatesLoadedRef = useRef(false);

  // Cargar estados iniciales de bot_activado desde la DB externa (solo una vez)
  useEffect(() => {
    if (botStatesLoadedRef.current) return;
    
    const loadBotStates = async () => {
      try {
        // Obtener el estado más reciente de bot_activado para cada session_id
        const { data, error } = await externalSupabase
          .from('n8n_chat_histories')
          .select('session_id, bot_activado')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[Chats] Error loading bot states:', error);
          return;
        }
        
        // Crear mapa de estados (tomar el más reciente por session)
        const statesMap: Record<string, boolean> = {};
        data?.forEach(row => {
          if (!(row.session_id in statesMap)) {
            statesMap[row.session_id] = row.bot_activado ?? true;
          }
        });
        
        setBotStates(statesMap);
        botStatesLoadedRef.current = true;
      } catch (err) {
        console.error('[Chats] Error loading bot states:', err);
      }
    };
    
    loadBotStates();
  }, []); // Solo cargar una vez al montar

  // Actualizar estados de bot solo para sesiones nuevas que no conocemos
  useEffect(() => {
    if (!botStatesLoadedRef.current) return;
    
    // Obtener sesiones únicas de los mensajes actuales
    const currentSessions = new Set(messages.map(m => m.session_id));
    
    // Encontrar sesiones que no tenemos en botStates
    const unknownSessions = Array.from(currentSessions).filter(
      sessionId => !(sessionId in botStates)
    );
    
    if (unknownSessions.length === 0) return;
    
    // Solo cargar estados para las sesiones nuevas
    const loadNewBotStates = async () => {
      try {
        const { data, error } = await externalSupabase
          .from('n8n_chat_histories')
          .select('session_id, bot_activado')
          .in('session_id', unknownSessions)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[Chats] Error loading new bot states:', error);
          return;
        }
        
        // Crear mapa solo para las sesiones nuevas
        const newStatesMap: Record<string, boolean> = {};
        data?.forEach(row => {
          if (!(row.session_id in newStatesMap)) {
            newStatesMap[row.session_id] = row.bot_activado ?? true;
          }
        });
        
        // Merge con estados existentes
        if (Object.keys(newStatesMap).length > 0) {
          setBotStates(prev => ({ ...prev, ...newStatesMap }));
        }
      } catch (err) {
        console.error('[Chats] Error loading new bot states:', err);
      }
    };
    
    loadNewBotStates();
  }, [messages, botStates]);

  // Toggle bot state for a session - actualiza en DB externa
  const toggleBotState = useCallback(async (sessionId: string) => {
    const currentState = botStates[sessionId] ?? true;
    const newState = !currentState;
    
    // Optimistic update
    setBotStates(prev => ({ ...prev, [sessionId]: newState }));
    setIsTogglingBot(true);
    
    try {
      // Actualizar TODAS las filas de este session_id en la DB externa
      const { error } = await externalSupabase
        .from('n8n_chat_histories')
        .update({ bot_activado: newState })
        .eq('session_id', sessionId);
      
      if (error) {
        // Revert on error
        setBotStates(prev => ({ ...prev, [sessionId]: currentState }));
        console.error('[Chats] Error updating bot state:', error);
        toast.error('Error al actualizar el estado del bot');
        return;
      }
      
      toast.success(newState ? 'Bot activado' : 'Bot desactivado');
      console.log(`[Chats] Bot ${newState ? 'activado' : 'desactivado'} para session: ${sessionId}`);
    } catch (err) {
      // Revert on error
      setBotStates(prev => ({ ...prev, [sessionId]: currentState }));
      console.error('[Chats] Error updating bot state:', err);
      toast.error('Error al actualizar el estado del bot');
    } finally {
      setIsTogglingBot(false);
    }
  }, [botStates]);

  // Process sessions from messages
  const processedSessions = useMemo(() => {
    const sessionMap = new Map<string, N8nSession>();
    
    messages.forEach(msg => {
      // Skip messages with missing or invalid message object
      if (!msg.message || typeof msg.message !== 'object') return;
      
      const existing = sessionMap.get(msg.session_id);
      const msgDate = new Date(msg.created_at);
      
      // Use phone_number column if available, fallback to extracting from session_id
      const phoneNumber = msg.phone_number || msg.session_id.split('@')[0] || msg.session_id;
      const displayPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      if (!existing) {
        sessionMap.set(msg.session_id, {
          sessionId: msg.session_id,
          phoneNumber: displayPhone,
          lastMessage: msg.message.content || '',
          lastMessageAt: msgDate,
          messageCount: 1,
          contactName: displayPhone,
          intentLabel: getIntentLabel(1),
          botEnabled: botStates[msg.session_id] ?? true,
        });
      } else {
        existing.messageCount++;
        existing.intentLabel = getIntentLabel(existing.messageCount);
        existing.botEnabled = botStates[msg.session_id] ?? true;
        // Update phone_number if current message has it and existing doesn't
        if (msg.phone_number && existing.phoneNumber === existing.sessionId) {
          existing.phoneNumber = displayPhone;
          existing.contactName = displayPhone;
        }
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
                      {session.phoneNumber}
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

  // Contenido del panel de mensajes (SIN el input para evitar re-renders)
  const chatMessagesContent = useMemo(() => {
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
      <>
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
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-2 py-1">
                    <Bot className={cn(
                      "h-4 w-4 transition-colors",
                      isBotEnabled ? "text-primary" : "text-muted-foreground"
                    )} />
                    <Switch
                      checked={isBotEnabled}
                      onCheckedChange={() => toggleBotState(selectedSessionId)}
                      disabled={isTogglingBot}
                      className="data-[state=checked]:bg-primary"
                    />
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
                // Skip messages with missing or invalid message object
                if (!msg.message || typeof msg.message !== 'object') return null;
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
              {/* Elemento para auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </>
    );
  }, [selectedSessionId, selectedSession, selectedMessages, botStates, isMobile, isTogglingBot, toggleBotState]);

  // El panel completo de chat (wrapper + input separado)
  const chatPanel = selectedSessionId && selectedSession ? (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isMobile ? "h-full" : "flex-1 rounded-lg border border-border bg-card"
    )}>
      {chatMessagesContent}
      
      {/* Input para agente humano - FUERA del useMemo para estabilidad */}
      {/* Se bloquea cuando el bot está activo */}
      {(() => {
        const isBotActive = botStates[selectedSessionId] ?? true;
        const isInputDisabled = isBotActive || isSendingMessage;
        return (
          <div className="p-3 md:p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                placeholder={isBotActive ? "Desactiva el bot para escribir..." : "Escribe un mensaje..."}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isInputDisabled}
                className={cn(
                  "bg-secondary border-border h-11",
                  isInputDisabled && "opacity-50 cursor-not-allowed"
                )}
              />
              <Button 
                size="icon" 
                className={cn(
                  "h-11 w-11 shrink-0 bg-primary hover:bg-primary/90",
                  isInputDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={sendHumanMessage}
                disabled={isInputDisabled || !messageInput.trim()}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  ) : chatMessagesContent;

  return (
    <MainLayout>
      <div className={cn(
        "flex flex-col",
        isMobile ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-8rem)]"
      )}>
        {!isMobile && (
          <PageHeader title="Chats" subtitle="Conversaciones en tiempo real" className="mb-4" />
        )}

        {authLoading ? (
          <LoadingState />
        ) : isMobile ? (
          // Mobile: Full screen chat list or messages
          selectedSessionId ? (
            chatPanel
          ) : (
            chatListContent
          )
        ) : (
          // Desktop: Side by side
          <div className="flex flex-1 gap-4 min-h-0">
            {chatListContent}
            {chatPanel}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
