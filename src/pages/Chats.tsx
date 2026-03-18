import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useN8nChatHistory } from "@/hooks/use-n8n-chat-history";
import { externalSupabase, type N8nChatMessage } from "@/integrations/supabase/external-client";
import { WEBHOOKS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useChatLabels } from "@/hooks/use-chat-labels";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, X, MessageSquare, Loader2, Radio, Tags, FileText, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LabelBadge } from "@/components/chats/LabelBadge";
import { LabelFilterBar } from "@/components/chats/LabelFilterBar";
import { LabelSelector } from "@/components/chats/LabelSelector";
import { LabelsManagerDialog } from "@/components/chats/LabelsManagerDialog";

// Formatear timestamp estilo WhatsApp
function formatWhatsAppTimestamp(date: Date): string {
  // Hoy: mostrar hora
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: es });
  }
  
  // Ayer
  if (isYesterday(date)) {
    return "Ayer";
  }
  
  // Dentro de la última semana: día de la semana
  const daysDiff = differenceInDays(new Date(), date);
  if (daysDiff < 7) {
    return format(date, "EEEE", { locale: es }); // Lunes, Martes, etc.
  }
  
  // Más de 7 días: formato yy-MM-dd
  return format(date, "yy-MM-dd");
}

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
function IntentBadge({ label, isMobile }: { label: IntentLabel; isMobile?: boolean }) {
  if (!label) return null;
  
  const config = INTENT_LABELS[label];
  if (!config) return null;
  
  return (
    <Badge variant="outline" className={cn(
      "font-medium flex items-center",
      isMobile ? "h-6 px-2 text-[10px]" : "text-xs",
      config.className
    )}>
      {config.text}
    </Badge>
  );
}

export default function Chats() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { tenantId: effectiveTenantId, isImpersonating } = useEffectiveTenant();
  
  // Determinar si el usuario es admin (ve todos los chats) - pero NO cuando está impersonando
  const isAdmin = user?.role === 'admin' && !isImpersonating;
  
  // Filtrar por tenant: admins ven todo (cuando no impersonan), otros usuarios solo su tenant
  // CRÍTICO: Límite alto para conteo preciso de conversaciones (facturación)
  const { messages, isLoading, error, refetch } = useN8nChatHistory({
    enableRealtime: true,
    limit: 50000, // Límite alto para garantizar conteo completo de sesiones
    tenantId: isAdmin ? undefined : effectiveTenantId || undefined,
  });
  
  // Log para debug
  useEffect(() => {
    console.log('[Chats] Effective tenantId:', effectiveTenantId, 'isAdmin:', isAdmin, 'isImpersonating:', isImpersonating);
    console.log('[Chats] Total messages loaded:', messages.length);
    const uniqueSessions = [...new Set(messages.map(m => m.session_id))];
    console.log('[Chats] Unique sessions:', uniqueSessions.length, uniqueSessions);
  }, [messages, effectiveTenantId, isAdmin, isImpersonating]);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [botStates, setBotStates] = useState<Record<string, boolean>>({});
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [labelFilterIds, setLabelFilterIds] = useState<string[]>([]);
  const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  /** Mensajes de la sesión activa para calcular ventana 24h (el buffer global puede no incluir chats antiguos) */
  const [sessionRowsFor24h, setSessionRowsFor24h] = useState<N8nChatMessage[]>([]);
  const [resolved24hForSessionId, setResolved24hForSessionId] = useState<string | null>(null);

  // Chat labels hook
  const {
    labels,
    sessionLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeLabel,
    getLabelsForSession,
  } = useChatLabels();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Calcular cantidad de mensajes de la sesión seleccionada (para dependencia del auto-scroll)
  const selectedMessagesCount = useMemo(() => {
    if (!selectedSessionId) return 0;
    return messages.filter(m => m.session_id === selectedSessionId).length;
  }, [messages, selectedSessionId]);

  // Auto-scroll al último mensaje cuando cambia la selección o llegan nuevos mensajes
  // IMPORTANTE: Usamos el viewport interno del ScrollArea para evitar afectar el scroll del body
  useEffect(() => {
    if (!selectedSessionId) return;
    
    // Micro-delay para asegurar que el DOM renderizó los mensajes
    const timeoutId = setTimeout(() => {
      const viewport = messagesScrollAreaRef.current?.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement | null;
      
      if (viewport) {
        // Auto-scroll solo si está cerca del final (threshold de 150px)
        const isNearBottom = 
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
        
        // Si es la primera carga de la sesión o está cerca del final, scrollear
        if (isNearBottom || viewport.scrollTop === 0) {
          viewport.scrollTo({ 
            top: viewport.scrollHeight, 
            behavior: "smooth" 
          });
        }
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [selectedSessionId, selectedMessagesCount]);

  // Cargar historial de la sesión seleccionada para ventana 24h (últimos 500 de esa sesión)
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionRowsFor24h([]);
      setResolved24hForSessionId(null);
      return;
    }
    const sid = selectedSessionId;
    setResolved24hForSessionId(null);
    let cancelled = false;

    const run = async () => {
      try {
        let q = externalSupabase
          .from("n8n_chat_histories")
          .select("id, session_id, tenant_id, message, created_at, media")
          .eq("session_id", sid)
          .order("created_at", { ascending: false })
          .limit(500);

        if (effectiveTenantId && !isAdmin) {
          q = q.eq("tenant_id", effectiveTenantId);
        }

        const { data, error } = await q;
        if (cancelled) return;
        if (error) {
          console.warn("[Chats] Error cargando sesión para ventana 24h:", error);
          setSessionRowsFor24h([]);
        } else {
          setSessionRowsFor24h((data as N8nChatMessage[]) || []);
        }
        if (!cancelled) setResolved24hForSessionId(sid);
      } catch (e) {
        console.warn("[Chats] Ventana 24h:", e);
        if (!cancelled) {
          setSessionRowsFor24h([]);
          setResolved24hForSessionId(sid);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, effectiveTenantId, isAdmin]);

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
      // Un mensaje es válido si tiene content O media
      const hasContent = msg.message?.content && typeof msg.message.content === 'string' && msg.message.content.trim() !== '';
      const hasMedia = msg.media !== null && msg.media !== undefined;
      
      // Skip si no tiene ni content ni media, o si message object no existe
      if (!hasContent && !hasMedia) return;
      if (!msg.message || typeof msg.message !== 'object') return;
      
      const existing = sessionMap.get(msg.session_id);
      const msgDate = new Date(msg.created_at);
      
      // Use phone_number column if available, fallback to extracting from session_id
      const phoneNumber = msg.phone_number || msg.session_id.split('@')[0] || msg.session_id;
      const displayPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Determinar el contenido a mostrar (texto o indicador de media)
      const displayContent = hasContent 
        ? msg.message.content || ''
        : hasMedia 
          ? (msg.media?.type === 'image' ? '📷 Imagen' : msg.media?.type === 'audio' ? '🎵 Audio' : msg.media?.type === 'video' ? '🎬 Video' : '📎 Archivo')
          : '';
      
      if (!existing) {
        sessionMap.set(msg.session_id, {
          sessionId: msg.session_id,
          phoneNumber: displayPhone,
          lastMessage: displayContent,
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
          existing.lastMessage = displayContent;
        }
      }
    });
    
    return Array.from(sessionMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [messages, botStates]);

  // Filter sessions by search, tab, and labels
  const filteredSessions = useMemo(() => {
    let filtered = processedSessions;
    
    // Filter by tab
    if (filterTab !== "todos") {
      filtered = filtered.filter(s => s.intentLabel === filterTab);
    }
    
    // Filter by labels
    if (labelFilterIds.length > 0) {
      filtered = filtered.filter(s => {
        const sessionLabelIds = sessionLabels[s.sessionId] || [];
        return labelFilterIds.some(filterLabelId => sessionLabelIds.includes(filterLabelId));
      });
    }
    
    // Filter by search term (including label text and custom labels)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const intentLabelText = s.intentLabel ? INTENT_LABELS[s.intentLabel]?.text.toLowerCase() : "";
        const customLabels = getLabelsForSession(s.sessionId);
        const customLabelText = customLabels.map(l => l.name.toLowerCase()).join(" ");
        return (
          s.contactName.toLowerCase().includes(term) ||
          s.lastMessage.toLowerCase().includes(term) ||
          intentLabelText.includes(term) ||
          customLabelText.includes(term)
        );
      });
    }
    
    return filtered;
  }, [processedSessions, searchTerm, filterTab, labelFilterIds, sessionLabels, getLabelsForSession]);

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

  const getInboundMessageType = (m: N8nChatMessage): string => {
    let msg: unknown = m.message;
    if (typeof msg === "string") {
      try {
        msg = JSON.parse(msg) as { type?: string };
      } catch {
        return "";
      }
    }
    if (!msg || typeof msg !== "object") return "";
    return String((msg as { type?: string }).type ?? "").toLowerCase();
  };

  /** Último mensaje del cliente en la sesión (WhatsApp cuenta 24h desde aquí) */
  const lastClientMessageTime = useMemo(() => {
    if (!selectedSessionId) return null;

    const pool =
      sessionRowsFor24h.length > 0
        ? sessionRowsFor24h
        : messages.filter((m) => m.session_id === selectedSessionId);

    const sorted = [...pool].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const row of sorted) {
      const t = getInboundMessageType(row as N8nChatMessage);
      if (t === "human" || t === "user" || t === "customer") {
        return new Date(row.created_at);
      }
    }
    return null;
  }, [messages, selectedSessionId, sessionRowsFor24h]);

  const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;
  const isWindowExpired = useMemo(() => {
    if (!lastClientMessageTime) return true;
    return Date.now() - lastClientMessageTime.getTime() > TWENTY_FOUR_H_MS;
  }, [lastClientMessageTime]);

  const is24hCheckReady = !selectedSessionId || resolved24hForSessionId === selectedSessionId;
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
      isMobile ? "h-full" : "w-96 flex-shrink-0 rounded-lg border border-border bg-card"
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setLabelsManagerOpen(true)}
          >
            <Tags className="h-3.5 w-3.5" />
            Labels
          </Button>
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
        
        {/* Label Filters */}
        {labels.length > 0 && (
          <LabelFilterBar
            labels={labels}
            selectedLabelIds={labelFilterIds}
            onToggleFilter={(labelId) => {
              setLabelFilterIds(prev => 
                prev.includes(labelId) 
                  ? prev.filter(id => id !== labelId)
                  : [...prev, labelId]
              );
            }}
          />
        )}
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
            <div
              key={session.sessionId}
              className={cn(
                "w-full p-4 text-left border-b border-border transition-colors relative group",
                "hover:bg-secondary/50",
                selectedSessionId === session.sessionId && "bg-secondary"
              )}
            >
              <button
                onClick={() => setSelectedSessionId(session.sessionId)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground truncate">
                        {session.phoneNumber}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {!session.botEnabled && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center text-amber-500/70">
                                  <Bot className="h-3 w-3" />
                                  <span className="text-[10px] relative -ml-0.5 -mt-1 font-bold">✕</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Bot desactivado</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatWhatsAppTimestamp(session.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {session.lastMessage || "Sin mensajes"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {session.intentLabel && (
                        <IntentBadge label={session.intentLabel} />
                      )}
                      {getLabelsForSession(session.sessionId).map(label => (
                        <LabelBadge
                          key={label.id}
                          name={label.name}
                          color={label.color}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Label assign button - always visible */}
              <div className="absolute right-3 top-3">
                <LabelSelector
                  labels={labels}
                  selectedLabelIds={sessionLabels[session.sessionId] || []}
                  onToggleLabel={async (labelId, isSelected) => {
                    if (isSelected) {
                      await assignLabel(session.sessionId, labelId);
                    } else {
                      await removeLabel(session.sessionId, labelId);
                    }
                  }}
                  onManageLabels={() => setLabelsManagerOpen(true)}
                  trigger={
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-7 w-7 bg-background shadow-sm border border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tags className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
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
        {isMobile ? (
          // Mobile: Two-row layout
          <div className="border-b border-border bg-background shrink-0 p-2 flex flex-col gap-1.5">
            {/* Row 1: Back + Avatar + Number + Bot Toggle + Tags Button */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1 shrink-0"
                onClick={() => setSelectedSessionId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-xs break-words">
                  {selectedSession.contactName}
                </h3>
              </div>
              
              {/* Bot Toggle with Tooltip - Same row as number */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center bg-secondary/50 rounded-full gap-1 px-1.5 py-0.5 shrink-0">
                      <Bot className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        isBotEnabled ? "text-primary" : "text-muted-foreground"
                      )} />
                      <Switch
                        checked={isBotEnabled}
                        onCheckedChange={() => toggleBotState(selectedSessionId)}
                        disabled={isTogglingBot}
                        className="data-[state=checked]:bg-primary scale-75"
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
              
              {/* Label Selector - Same row as bot button */}
              <LabelSelector
                labels={labels}
                selectedLabelIds={sessionLabels[selectedSessionId] || []}
                onToggleLabel={async (labelId, isSelected) => {
                  if (isSelected) {
                    await assignLabel(selectedSessionId, labelId);
                  } else {
                    await removeLabel(selectedSessionId, labelId);
                  }
                }}
                onManageLabels={() => setLabelsManagerOpen(true)}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Tags className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
            
            {/* Row 2: Labels centered */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="h-6 px-2 text-[10px] font-medium bg-green-500/10 text-green-500 border-green-500/30 flex items-center">
                Activo
              </Badge>
              {selectedSession.intentLabel && (
                <IntentBadge label={selectedSession.intentLabel} isMobile={true} />
              )}
            </div>
          </div>
        ) : (
          // Desktop: Single-row layout
          <div className="border-b border-border flex items-center justify-between bg-background shrink-0 p-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
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
                <IntentBadge label={selectedSession.intentLabel} isMobile={isMobile} />
              )}
              
              {/* Label Selector */}
              <LabelSelector
                labels={labels}
                selectedLabelIds={sessionLabels[selectedSessionId] || []}
                onToggleLabel={async (labelId, isSelected) => {
                  if (isSelected) {
                    await assignLabel(selectedSessionId, labelId);
                  } else {
                    await removeLabel(selectedSessionId, labelId);
                  }
                }}
                onManageLabels={() => setLabelsManagerOpen(true)}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Tags className="h-4 w-4" />
                  </Button>
                }
              />
              
              {/* Bot Toggle with Tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center bg-secondary/50 rounded-full gap-2 px-2 py-1">
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
        )}

        {/* Messages */}
        <ScrollArea 
          ref={messagesScrollAreaRef}
          className={cn(
            "flex-1 min-h-0 overflow-hidden bg-secondary/30",
            isMobile ? "p-2" : "p-4"
          )}
        >
          {selectedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Sin mensajes en esta conversación</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedMessages.map((msg) => {
                // Un mensaje es válido si tiene content O media
                const hasContent = msg.message?.content && typeof msg.message.content === 'string' && msg.message.content.trim() !== '';
                const hasMedia = msg.media !== null && msg.media !== undefined;
                
                // Skip si no tiene ni content ni media
                if (!hasContent && !hasMedia) return null;
                
                // Skip si message object no existe
                if (!msg.message || typeof msg.message !== 'object') return null;
                
                // Filtrar mensajes técnicos que comienzan con "Tenemos texto e imagen"
                if (hasContent && msg.message.content!.trim().toLowerCase().startsWith('tenemos texto e imagen')) {
                  return null;
                }
                const isFromClient = msg.message.type === 'human';
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isFromClient ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                        isFromClient
                          ? "bg-blue-500 text-white rounded-bl-md"
                          : "bg-card border border-border text-foreground rounded-br-md"
                      )}
                    >
                      {!isFromClient && (
                        <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          <span className="text-[10px] font-medium">VEXA</span>
                        </div>
                      )}
                      
                      {/* Renderizar media si existe - estilo WhatsApp */}
                      {hasMedia && msg.media?.type === 'image' && (
                        <div className="mb-2">
                          <img 
                            src={msg.media.url} 
                            alt={msg.media.caption || "Imagen"}
                            className="w-48 h-auto max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setExpandedImage(msg.media!.url)}
                            loading="lazy"
                          />
                          {msg.media.caption && (
                            <p className="text-xs mt-1 opacity-80">{msg.media.caption}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Renderizar otros tipos de media */}
                      {hasMedia && msg.media?.type === 'audio' && (
                        <div className="mb-2">
                          <audio controls className="max-w-full">
                            <source src={msg.media.url} type={msg.media.mimeType || 'audio/mpeg'} />
                            Tu navegador no soporta audio
                          </audio>
                        </div>
                      )}
                      
                      {hasMedia && msg.media?.type === 'video' && (
                        <div className="mb-2">
                          <video controls className="max-w-full rounded-lg">
                            <source src={msg.media.url} type={msg.media.mimeType || 'video/mp4'} />
                            Tu navegador no soporta video
                          </video>
                        </div>
                      )}
                      
                      {hasMedia && msg.media?.type === 'document' && (
                        <div className="mb-2">
                          <a 
                            href={msg.media.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm underline hover:no-underline"
                          >
                            📎 {msg.media.filename || 'Documento'}
                          </a>
                        </div>
                      )}
                      
                      {/* Renderizar texto solo si hay content válido */}
                      {hasContent && msg.message.content!.trim().toLowerCase().startsWith('comprobante de pago recibido en formato pdf') ? (
                        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg cursor-default select-none">
                          <div className="flex-shrink-0 w-10 h-12 bg-red-500/10 rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Documento.pdf</p>
                            <p className="text-xs text-muted-foreground">PDF • Documento recibido</p>
                          </div>
                        </div>
                      ) : hasContent && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.message.content}
                        </p>
                      )}
                      
                      <p className={cn(
                        "text-[10px] mt-1",
                        isFromClient ? "opacity-70" : "text-muted-foreground"
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
      "flex flex-col h-full overflow-hidden",
      isMobile ? "bg-background" : "flex-1 rounded-lg border border-border bg-card"
    )}>
      {chatMessagesContent}
      
      {/* Input para agente humano - FUERA del useMemo para estabilidad */}
      {/* Se bloquea cuando el bot está activo o cuando la ventana de 24h expiró */}
      {(() => {
        const isBotActive = botStates[selectedSessionId] ?? true;

        if (!is24hCheckReady) {
          return (
            <div
              className={cn(
                "border-t border-border bg-background shrink-0 flex items-center justify-center gap-2 text-muted-foreground",
                isMobile ? "py-3 px-2" : "py-4"
              )}
            >
              <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-5 w-5")} />
              <span className={cn(isMobile ? "text-xs" : "text-sm")}>Comprobando ventana de mensajes…</span>
            </div>
          );
        }

        // Más de 24h desde el último mensaje del cliente → plantillas
        if (isWindowExpired) {
          return (
            <div className={cn(
              "border-t border-border bg-background shrink-0",
              isMobile ? "p-2" : "p-3 md:p-4"
            )}>
              <div className={cn(
                "flex flex-col items-center py-2",
                isMobile ? "gap-2" : "gap-3"
              )}>
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-xs" : "text-sm"
                  )}>Ventana de 24h expirada</span>
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Han pasado más de 24 horas desde el último mensaje del cliente.
                  </p>
                  <p className={cn(
                    "text-muted-foreground mt-1",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    Para enviar un mensaje, usa una plantilla aprobada.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/marketing/plantillas')}
                  className={cn(
                    "gap-2",
                    isMobile && "h-8 text-xs px-3"
                  )}
                >
                  <FileText className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  Ir a Plantillas
                </Button>
              </div>
            </div>
          );
        }
        
        // Input normal cuando la ventana está activa
        const isInputDisabled = isBotActive || isSendingMessage;
        return (
          <div className={cn(
            "border-t border-border bg-background shrink-0",
            isMobile ? "p-2" : "p-3 md:p-4"
          )}>
            <div className={cn("flex gap-2", isMobile && "gap-1.5")}>
              <Input
                placeholder={isBotActive ? "Desactiva el bot para escribir..." : "Escribe un mensaje..."}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isInputDisabled}
                className={cn(
                  "bg-secondary border-border",
                  isMobile ? "h-9 text-sm" : "h-11",
                  isInputDisabled && "opacity-50 cursor-not-allowed"
                )}
              />
              <Button 
                size="icon" 
                className={cn(
                  "shrink-0 bg-primary hover:bg-primary/90",
                  isMobile ? "h-9 w-9" : "h-11 w-11",
                  isInputDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={sendHumanMessage}
                disabled={isInputDisabled || !messageInput.trim()}
              >
                {isSendingMessage ? (
                  <Loader2 className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "animate-spin")} />
                ) : (
                  <Send className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
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
        isMobile ? "h-[calc(100dvh-3.5rem-5rem)] -m-4 md:m-0 overflow-hidden" : "h-[calc(100vh-8rem)]"
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
      
      {/* Labels Manager Dialog */}
      <LabelsManagerDialog
        open={labelsManagerOpen}
        onOpenChange={setLabelsManagerOpen}
        labels={labels}
        onCreateLabel={createLabel}
        onUpdateLabel={updateLabel}
        onDeleteLabel={deleteLabel}
      />
      
      {/* Modal para imagen expandida - estilo WhatsApp */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          <div 
            className="flex items-center justify-center w-full h-full cursor-pointer"
            onClick={() => setExpandedImage(null)}
          >
            {expandedImage && (
              <img 
                src={expandedImage} 
                alt="Imagen expandida"
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
