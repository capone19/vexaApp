import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useExternalChatList, useExternalChatSession } from "@/hooks/use-external-chat-history";
import { externalSupabase, type ExternalChatMessage } from "@/integrations/supabase/external-client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { useChatLabels } from "@/hooks/use-chat-labels";
import { getChannelConfig, type ChatChannelId } from "@/lib/chat-channels";
import { ChatChannelTabs } from "@/components/chats/ChatChannelTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDisplayContent, hasDisplayableContent, parseMessageField } from "@/lib/chat-message-utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Send, Bot, ArrowLeft, X, MessageSquare, Loader2, Radio, Tags, FileText, Clock, Paperclip, Megaphone, Check, Square, CheckSquare } from "lucide-react";
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

interface ChatSession {
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

interface ChatComposerProps {
  isMobile: boolean;
  isBotActive: boolean;
  disabledByWindow: boolean;
  supportsAttachments: boolean;
  onSend: (messageText: string, file: File | null) => Promise<void>;
}

const ChatComposer = memo(function ChatComposer({
  isMobile,
  isBotActive,
  disabledByWindow,
  supportsAttachments,
  onSend,
}: ChatComposerProps) {
  const [messageInput, setMessageInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAttachment = useCallback(() => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("El archivo es demasiado grande (máx. 16 MB)");
      return;
    }

    setAttachedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }
    setAttachedPreview(null);
  }, []);

  const isInputDisabled = disabledByWindow || isBotActive || isSendingMessage;
  const canSend = !isInputDisabled && (messageInput.trim().length > 0 || !!attachedFile);

  const sendCurrentMessage = useCallback(async () => {
    if (!canSend) return;
    setIsSendingMessage(true);
    try {
      await onSend(messageInput.trim(), attachedFile);
      setMessageInput("");
      clearAttachment();
    } finally {
      setIsSendingMessage(false);
    }
  }, [attachedFile, canSend, clearAttachment, messageInput, onSend]);

  return (
    <div className={cn("border-t border-border bg-background shrink-0", isMobile ? "p-2" : "p-3 md:p-4")}>
      {attachedFile && (
        <div className={cn("flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary/60 border border-border", isMobile ? "text-xs" : "text-sm")}>
          {attachedPreview ? (
            <img src={attachedPreview} alt="preview" className="h-10 w-10 rounded object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <span className="truncate flex-1 text-foreground">{attachedFile.name}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearAttachment}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className={cn("flex gap-2", isMobile && "gap-1.5")}>
        {supportsAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,video/*,audio/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("shrink-0 text-muted-foreground hover:text-foreground", isMobile ? "h-9 w-9" : "h-11 w-11", isInputDisabled && "opacity-50 cursor-not-allowed")}
              disabled={isInputDisabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
            </Button>
          </>
        )}
        <Input
          placeholder={isBotActive ? "Desactiva el bot para escribir..." : "Escribe un mensaje..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendCurrentMessage();
            }
          }}
          disabled={isInputDisabled}
          className={cn("bg-secondary border-border", isMobile ? "h-9 text-sm" : "h-11", isInputDisabled && "opacity-50 cursor-not-allowed")}
        />
        <Button
          size="icon"
          className={cn("shrink-0 bg-primary hover:bg-primary/90", isMobile ? "h-9 w-9" : "h-11 w-11", isInputDisabled && "opacity-50 cursor-not-allowed")}
          onClick={() => void sendCurrentMessage()}
          disabled={!canSend}
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
});

interface ChatChannelPanelProps {
  channel: ChatChannelId;
  onChannelChange?: (channel: ChatChannelId) => void;
  showChannelTabs?: boolean;
}

export function ChatChannelPanel({
  channel,
  onChannelChange,
  showChannelTabs = true,
}: ChatChannelPanelProps) {
  const channelConfig = getChannelConfig(channel);
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;
  const BOT_STATE_RECONCILE_WINDOW_MS = 1500;
  const { user, isLoading: authLoading } = useAuth();
  const { tenantId: effectiveTenantId, isImpersonating } = useEffectiveTenant();
  
  const isAdmin = user?.role === 'admin' && !isImpersonating;

  // Siempre acotar por tenant (nunca leer toda la tabla). Admin sin impersonar usa su tenant.
  const chatTenantId =
    effectiveTenantId ?? (isAdmin && !isImpersonating ? user?.tenantId : undefined) ?? undefined;

  // Ventana de retención para la lista lateral: expandible por el usuario, default 7 días, máx 90
  const MAX_HISTORY_DAYS = 90;
  const [historyWindowDays, setHistoryWindowDays] = useState(channelConfig.defaultListHistoryDays);
  const listSinceDate = useMemo(
    () => new Date(Date.now() - historyWindowDays * 86400000),
    [historyWindowDays],
  );

  // selectedSessionId debe declararse antes del hook de sesión
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Ventana de sesión para lazy loading: empieza en 7 días, expandible hasta 90
  const [sessionWindowDays, setSessionWindowDays] = useState(7);
  const sessionStartDate = useMemo(
    () => new Date(Date.now() - sessionWindowDays * 86400000),
    [sessionWindowDays],
  );

  // Resetear ventana al cambiar de conversación
  useEffect(() => {
    setSessionWindowDays(7);
  }, [selectedSessionId]);

  const {
    messages: listMessages,
    isLoading: listLoading,
    error: listError,
  } = useExternalChatList({
    table: channelConfig.table,
    tenantId: chatTenantId,
    sinceList: listSinceDate,
    skipDateFilter: channelConfig.skipListDateFilter,
    limit: channelConfig.listFetchLimit,
    enableRealtime: true,
  });

  const {
    messages: sessionMessages,
    isLoading: sessionIsLoading,
    isLoadingMore: sessionIsLoadingMore,
    refetch: refetchSession,
  } = useExternalChatSession({
    table: channelConfig.table,
    tenantId: chatTenantId,
    sessionId: selectedSessionId,
    sinceSession: sessionStartDate,
    enableRealtime: true,
  });


  const listSessionIdsKey = useMemo(
    () => [...new Set(listMessages.map(m => m.session_id))].sort().join('\0'),
    [listMessages],
  );

  // Debug
  useEffect(() => {
    if (!isDev) return;
    console.log('[Chats] Effective tenantId:', effectiveTenantId, 'isAdmin:', isAdmin, 'isImpersonating:', isImpersonating);
    console.log('[Chats] List messages loaded:', listMessages.length);
    const uniqueSessionCount = listSessionIdsKey ? listSessionIdsKey.split('\0').length : 0;
    console.log('[Chats] Unique sessions:', uniqueSessionCount, listSessionIdsKey.split('\0'));
  }, [listMessages.length, listSessionIdsKey, effectiveTenantId, isAdmin, isImpersonating, isDev]);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 180);
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [botStates, setBotStates] = useState<Record<string, boolean>>({});
  const botStatesRef = useRef(botStates);
  botStatesRef.current = botStates;
  const [botToggling, setBotToggling] = useState<Set<string>>(new Set());
  const [labelFilterIds, setLabelFilterIds] = useState<string[]>([]);
  const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [remarketingMode, setRemarketingMode] = useState(false);
  const [selectedForRemarketing, setSelectedForRemarketing] = useState<Set<string>>(new Set());
  const [isSendingRemarketing, setIsSendingRemarketing] = useState(false);
  const botToggleInFlightRef = useRef<Set<string>>(new Set());
  const botSyncCooldownRef = useRef<Map<string, { until: number; expected: boolean }>>(new Map());

  // Chat labels hook
  const {
    labels,
    sessionLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeLabel,
  } = useChatLabels();

  const labelsBySessionId = useMemo(() => {
    const labelMap = new Map(labels.map((label) => [label.id, label]));
    const bySession = new Map<string, typeof labels>();

    Object.entries(sessionLabels).forEach(([sessionId, labelIds]) => {
      const sessionLabelObjects = labelIds
        .map((labelId) => labelMap.get(labelId))
        .filter((label): label is (typeof labels)[number] => Boolean(label));
      bySession.set(sessionId, sessionLabelObjects);
    });

    return bySession;
  }, [labels, sessionLabels]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Refs para preservación de scroll al cargar más mensajes
  const prevScrollHeightRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  const shouldIgnoreIncomingBotState = useCallback((sessionId: string, incomingValue: boolean) => {
    if (botToggleInFlightRef.current.has(sessionId)) {
      return true;
    }

    const cooldown = botSyncCooldownRef.current.get(sessionId);
    if (!cooldown) return false;

    const now = Date.now();
    if (cooldown.until <= now) {
      botSyncCooldownRef.current.delete(sessionId);
      return false;
    }

    // Durante ventana de reconciliación, ignoramos valores que contradicen el esperado.
    return incomingValue !== cooldown.expected;
  }, []);


  // Auto-scroll al último mensaje cuando cambia la selección o llegan nuevos mensajes
  useEffect(() => {
    if (!selectedSessionId) return;
    const timeoutId = setTimeout(() => {
      const viewport = messagesScrollAreaRef.current?.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement | null;
      if (viewport) {
        const isNearBottom =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
        if (isNearBottom || viewport.scrollTop === 0) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        }
      }
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [selectedSessionId, sessionMessages.length]);

  // Preservar posición de scroll al cargar mensajes más antiguos (Load More)
  useLayoutEffect(() => {
    if (!shouldRestoreScrollRef.current || sessionIsLoadingMore) return;
    const viewport = messagesScrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    if (!viewport) return;
    shouldRestoreScrollRef.current = false;
    const delta = viewport.scrollHeight - prevScrollHeightRef.current;
    if (delta > 0) viewport.scrollTop = delta;
  }, [sessionMessages, sessionIsLoadingMore]);

  // Obtener el tenant_id de los mensajes de la sesión seleccionada
  const selectedSessionTenantId = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessionMessages.find(m => m.tenant_id)?.tenant_id ?? null;
  }, [sessionMessages, selectedSessionId]);

  // Determinar tipo de media para el payload
  const getMediaType = (mimeType: string): "image" | "audio" | "video" | "document" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    return "document";
  };

  // Enviar mensaje de agente humano via edge function proxy
  const sendHumanMessage = useCallback(async (messageText: string, file: File | null) => {
    const hasText = messageText.trim().length > 0;
    const hasFile = !!file;
    if ((!hasText && !hasFile) || !selectedSessionId) return;

    const messageContent = messageText.trim();
    let instagramUsername: string | null = null;
    if (channel === 'instagram') {
      const row = listMessages.find(
        m => m.session_id === selectedSessionId && 'username' in m && m.username
      );
      if (row && 'username' in row && row.username) {
        instagramUsername = row.username.replace(/^@/, '');
      }
    }

    try {
      let attachmentData: Record<string, unknown> | undefined;

      // Si hay archivo adjunto, subirlo a Supabase Storage
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const filePath = `${selectedSessionTenantId || "global"}/${selectedSessionId}/${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error subiendo archivo: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(uploadData.path);

        const mediaType = getMediaType(file.type);

        attachmentData = {
          media_type: mediaType,
          url: urlData.publicUrl,
          mime_type: file.type,
          filename: file.name,
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/human-message-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            message: messageContent || (attachmentData ? `[${attachmentData.media_type}]` : ""),
            type: attachmentData ? attachmentData.media_type : "text",
            session_id: selectedSessionId,
            tenant_id: selectedSessionTenantId,
            source: channelConfig.humanMessageSource,
            ...(instagramUsername ? { username: instagramUsername } : {}),
            timestamp: new Date().toISOString(),
            ...(attachmentData ? { attachment: attachmentData } : {}),
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

      toast.success("Mensaje enviado");

      // Mantener bot desactivado si estaba desactivado (n8n puede reactivarlo)
      const currentBotState = botStates[selectedSessionId];
      if (currentBotState === false) {
        setTimeout(async () => {
          if (!selectedSessionTenantId) return;
          await externalSupabase
            .from(channelConfig.table)
            .update({ bot_activado: false })
            .eq('session_id', selectedSessionId)
            .eq('tenant_id', selectedSessionTenantId);
        }, 2000);
      }

      setTimeout(() => void refetchSession(true), 1000);
    } catch (err) {
      console.error("[Chats] Error sending human message:", err);
      toast.error(err instanceof Error ? err.message : "Error al enviar el mensaje");
    }
  }, [selectedSessionId, refetchSession, selectedSessionTenantId, botStates, channelConfig.table, channelConfig.humanMessageSource, channel, listMessages]);

  // Remarketing: toggle seleccion de una sesion
  const toggleRemarketingSelection = useCallback((sessionId: string) => {
    setSelectedForRemarketing(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  // Remarketing: cancelar modo
  const cancelRemarketing = useCallback(() => {
    setRemarketingMode(false);
    setSelectedForRemarketing(new Set());
  }, []);

  // Flag para evitar múltiples cargas iniciales
  const botStatesLoadedRef = useRef(false);

  useEffect(() => {
    setSelectedSessionId(null);
    setRemarketingMode(false);
    setSelectedForRemarketing(new Set());
    botStatesLoadedRef.current = false;
    setBotStates({});
    setHistoryWindowDays(channelConfig.defaultListHistoryDays);
    setSessionWindowDays(7);
  }, [channel, channelConfig.defaultListHistoryDays]);

  // Cargar estados iniciales de bot_activado desde la DB externa (solo una vez)
  useEffect(() => {
    if (botStatesLoadedRef.current) return;
    
    const loadBotStates = async () => {
      if (!chatTenantId) return;
      try {
        const { data, error } = await externalSupabase
          .from(channelConfig.table)
          .select('session_id, bot_activado')
          .eq('tenant_id', chatTenantId)
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
  }, [channel, channelConfig.table, chatTenantId]);

  // Actualizar estados de bot solo para sesiones nuevas que no conocemos
  useEffect(() => {
    if (!botStatesLoadedRef.current) return;
    
    // Obtener sesiones únicas de los mensajes actuales
    const currentSessions = listSessionIdsKey ? listSessionIdsKey.split('\0') : [];

    // Encontrar sesiones que no tenemos en botStates
    const unknownSessions = currentSessions.filter(
      sessionId => !(sessionId in botStatesRef.current)
    );

    if (unknownSessions.length === 0) return;
    
    // Solo cargar estados para las sesiones nuevas
    const loadNewBotStates = async () => {
      if (!chatTenantId) return;
      try {
        const { data, error } = await externalSupabase
          .from(channelConfig.table)
          .select('session_id, bot_activado')
          .eq('tenant_id', chatTenantId)
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
          setBotStates(prev => {
            let changed = false;
            const next = { ...prev };
            Object.entries(newStatesMap).forEach(([sid, incomingValue]) => {
              if (shouldIgnoreIncomingBotState(sid, incomingValue)) {
                return;
              }
              if (next[sid] !== incomingValue) {
                next[sid] = incomingValue;
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        }
      } catch (err) {
        console.error('[Chats] Error loading new bot states:', err);
      }
    };
    
    loadNewBotStates();
  }, [listSessionIdsKey, shouldIgnoreIncomingBotState, channelConfig.table, chatTenantId]);

  // Sync botStates when messages update (e.g. realtime UPDATE with bot_activado change)
  useEffect(() => {
    if (!botStatesLoadedRef.current || listMessages.length === 0) return;

    const latestPerSession = new Map<string, boolean>();
    const latestTimePerSession = new Map<string, number>();

    for (const msg of listMessages) {
      const t = new Date(msg.created_at).getTime();
      const prev = latestTimePerSession.get(msg.session_id);
      if (prev === undefined || t > prev) {
        latestTimePerSession.set(msg.session_id, t);
        latestPerSession.set(msg.session_id, msg.bot_activado ?? true);
      }
    }

    setBotStates(prev => {
      let changed = false;
      const next = { ...prev };
      for (const [sid, val] of latestPerSession) {
        if (shouldIgnoreIncomingBotState(sid, val)) {
          continue;
        }
        if (next[sid] !== val) {
          next[sid] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [listMessages, shouldIgnoreIncomingBotState]);

  // Toggle bot state for a session - actualiza en DB externa
  const setBotStateForSession = useCallback(async (sessionId: string, nextState: boolean) => {
    if (botToggleInFlightRef.current.has(sessionId)) return;

    const currentState = botStates[sessionId] ?? true;
    if (currentState === nextState) return;

    // Marcar en vuelo (ref para guard instantáneo + state para re-render del disabled)
    if (!chatTenantId) return;

    botToggleInFlightRef.current.add(sessionId);
    setBotToggling(prev => new Set(prev).add(sessionId));

    // Iniciar ventana anti-sync para esta sesión
    botSyncCooldownRef.current.set(sessionId, {
      until: Date.now() + BOT_STATE_RECONCILE_WINDOW_MS,
      expected: nextState,
    });

    // Optimistic update
    setBotStates(prev => ({ ...prev, [sessionId]: nextState }));

    try {
      const { error } = await externalSupabase
        .from(channelConfig.table)
        .update({ bot_activado: nextState })
        .eq('session_id', sessionId)
        .eq('tenant_id', chatTenantId);

      if (error) {
        setBotStates(prev => ({ ...prev, [sessionId]: currentState }));
        botSyncCooldownRef.current.delete(sessionId);
        console.error('[Chats] Error updating bot state:', error);
        toast.error('Error al actualizar el estado del bot');
        return;
      }

      toast.success(nextState ? 'Bot activado' : 'Bot desactivado');
    } catch (err) {
      setBotStates(prev => ({ ...prev, [sessionId]: currentState }));
      botSyncCooldownRef.current.delete(sessionId);
      console.error('[Chats] Error updating bot state:', err);
      toast.error('Error al actualizar el estado del bot');
    } finally {
      // Liberar bloqueo en vuelo para que el switch se habilite de nuevo
      botToggleInFlightRef.current.delete(sessionId);
      setBotToggling(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }, [BOT_STATE_RECONCILE_WINDOW_MS, botStates, channelConfig.table, chatTenantId]);

  // handleLoadMore: guarda scrollHeight y expande la ventana de la sesión
  const handleLoadMore = useCallback(() => {
    const viewport = messagesScrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    if (viewport) prevScrollHeightRef.current = viewport.scrollHeight;
    shouldRestoreScrollRef.current = true;
    setSessionWindowDays(prev => Math.min(prev + 14, 90));
  }, []);

  const processedSessions = useMemo(() => {
    const sessionMap = new Map<string, ChatSession>();

    listMessages.forEach(msg => {
      const existing = sessionMap.get(msg.session_id);
      const msgDate = new Date(msg.created_at);
      const hasContent = hasDisplayableContent(msg, channelConfig.supportsMedia);
      const contactDisplay = channelConfig.getContactDisplay(msg, msg.session_id);
      const displayContent = hasContent ? getDisplayContent(msg, channelConfig.supportsMedia) : '';

      if (!existing) {
        sessionMap.set(msg.session_id, {
          sessionId: msg.session_id,
          phoneNumber: contactDisplay,
          lastMessage: displayContent,
          lastMessageAt: msgDate,
          messageCount: hasContent ? 1 : 0,
          contactName: contactDisplay,
          intentLabel: getIntentLabel(hasContent ? 1 : 0),
          botEnabled: botStates[msg.session_id] ?? true,
        });
      } else {
        if (hasContent) {
          existing.messageCount++;
          existing.intentLabel = getIntentLabel(existing.messageCount);
        }
        existing.botEnabled = botStates[msg.session_id] ?? true;
        if (channel === 'whatsapp' && 'phone_number' in msg && msg.phone_number && existing.phoneNumber === existing.sessionId) {
          existing.phoneNumber = contactDisplay;
          existing.contactName = contactDisplay;
        }
        if (channel === 'instagram' && 'username' in msg && msg.username) {
          const updated = channelConfig.getContactDisplay(msg, msg.session_id);
          existing.contactName = updated;
          existing.phoneNumber = updated;
        }
        if (msgDate > existing.lastMessageAt) {
          existing.lastMessageAt = msgDate;
          // Solo actualizar el preview si el mensaje más reciente tiene texto
          if (hasContent) existing.lastMessage = displayContent;
          if (channel === 'instagram' && 'username' in msg && msg.username) {
            const updated = channelConfig.getContactDisplay(msg, msg.session_id);
            existing.contactName = updated;
            existing.phoneNumber = updated;
          }
        }
      }
    });

    return Array.from(sessionMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }, [listMessages, botStates, channel, channelConfig]);

  useEffect(() => {
    if (!isDev || channel !== 'instagram') return;
    if (listLoading || listMessages.length === 0 || processedSessions.length > 0) return;
    console.warn(
      '[Chats:instagram] Hay',
      listMessages.length,
      'filas pero 0 sesiones — revisar formato de message o filtros'
    );
    toast.warning('Hay mensajes en la base pero no se pudieron agrupar. Revisá la consola (dev).');
  }, [channel, listLoading, listMessages.length, processedSessions.length, isDev]);
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
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const intentLabelText = s.intentLabel ? INTENT_LABELS[s.intentLabel]?.text.toLowerCase() : "";
        const customLabels = labelsBySessionId.get(s.sessionId) || [];
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
  }, [processedSessions, debouncedSearchTerm, filterTab, labelFilterIds, sessionLabels, labelsBySessionId]);

  // Remarketing: enviar al webhook
  const sendRemarketing = useCallback(async () => {
    if (!channelConfig.supportsRemarketing) return;
    if (selectedForRemarketing.size === 0 || isSendingRemarketing) return;
    setIsSendingRemarketing(true);

    try {
      const sessionsToSend = filteredSessions.filter(s => selectedForRemarketing.has(s.sessionId));
      let successCount = 0;

      for (const session of sessionsToSend) {
        const phone = session.phoneNumber.replace(/^\+/, "");
        const tenantMsg = listMessages.find(m => m.session_id === session.sessionId && m.tenant_id);
        const tenantId = tenantMsg?.tenant_id || effectiveTenantId || "";

        try {
          await fetch("https://n8ninnovatec-n8n.t0bgq1.easypanel.host/webhook/rmkt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone_number: phone,
              tenant_id: tenantId,
              session_id: session.sessionId,
            }),
          });
          successCount++;
        } catch (err) {
          console.error("[Chats] Remarketing error for", session.sessionId, err);
        }
      }

      toast.success(`Remarketing enviado a ${successCount} contacto${successCount !== 1 ? "s" : ""}`);
      cancelRemarketing();
    } catch (err) {
      console.error("[Chats] Remarketing error:", err);
      toast.error("Error al enviar remarketing");
    } finally {
      setIsSendingRemarketing(false);
    }
  }, [selectedForRemarketing, isSendingRemarketing, filteredSessions, listMessages, effectiveTenantId, cancelRemarketing, channelConfig.supportsRemarketing]);

  const getInboundMessageType = (m: ExternalChatMessage): string => {
    return parseMessageField(m.message)?.type ?? '';
  };

  // sessionMessages está en orden ASC — iteramos desde el final para el último msg del cliente
  const lastClientMessageTime = useMemo(() => {
    if (!selectedSessionId || sessionMessages.length === 0) return null;
    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const t = getInboundMessageType(sessionMessages[i]);
      if (t === "human" || t === "user" || t === "customer") {
        return new Date(sessionMessages[i].created_at);
      }
    }
    return null;
  }, [sessionMessages, selectedSessionId]);

  const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;
  const isWindowExpired = useMemo(() => {
    if (!lastClientMessageTime) return true;
    return Date.now() - lastClientMessageTime.getTime() > TWENTY_FOUR_H_MS;
  }, [lastClientMessageTime]);

  const selectedMessages = sessionMessages;

  const selectedSession = useMemo(() => {
    return processedSessions.find(s => s.sessionId === selectedSessionId);
  }, [processedSessions, selectedSessionId]);

  const is24hCheckReady = !selectedSessionId || !sessionIsLoading;
  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Sin conversaciones</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {channelConfig.emptyStateHint}
      </p>
      {channel === 'instagram' && !listLoading && listMessages.length === 0 && (
        <p className="text-xs text-muted-foreground max-w-sm mt-3">
          Si en SQL ves filas pero acá dice 0 filas, ejecutá la policy RLS en el Supabase externo
          (archivo <code className="text-[10px]">supabase/EXTERNAL_SUPABASE_INSTAGRAM.sql</code>)
          y verificá que <code className="text-[10px]">tenant_id</code> coincida con tu cuenta.
        </p>
      )}
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
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{listError}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reintentar
      </Button>
    </div>
  );

  // Chat List content
  const chatListContent = useMemo(() => (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isMobile ? "h-full" : "w-96 flex-shrink-0 rounded-lg border border-border bg-card"
    )}>
      {/* Header with realtime indicator */}
      <div className="p-3 md:p-4 border-b border-border space-y-3">
        {showChannelTabs && onChannelChange && (
          <ChatChannelTabs value={channel} onChange={onChannelChange} />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              Realtime
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isDev
                ? `${listMessages.length} filas / ${processedSessions.length} chats`
                : `${processedSessions.length} chats`}
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
        {listLoading && listMessages.length === 0 ? (
          <LoadingState />
        ) : listError ? (
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
          <>
          {filteredSessions.map((session) => (
            <div
              key={session.sessionId}
              className={cn(
                "flex items-start gap-2 w-full p-4 text-left border-b border-border transition-colors group overflow-hidden",
                "hover:bg-secondary/50",
                selectedSessionId === session.sessionId && !remarketingMode && "bg-secondary",
                remarketingMode && selectedForRemarketing.has(session.sessionId) && "bg-primary/10"
              )}
            >
              <button
                onClick={() => {
                  if (remarketingMode) {
                    toggleRemarketingSelection(session.sessionId);
                  } else {
                    setSelectedSessionId(session.sessionId);
                  }
                }}
                className="flex flex-1 min-w-0 items-start gap-3 text-left overflow-hidden"
              >
                {remarketingMode ? (
                  <div className="w-10 h-10 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    style={{
                      borderColor: selectedForRemarketing.has(session.sessionId) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      backgroundColor: selectedForRemarketing.has(session.sessionId) ? 'hsl(var(--primary))' : 'transparent',
                    }}
                  >
                    {selectedForRemarketing.has(session.sessionId) && (
                      <Check className="h-5 w-5 text-primary-foreground" />
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2 overflow-hidden">
                    <span className="font-medium text-sm text-foreground truncate min-w-0">
                      {channelConfig.getListPrimaryLabel(session)}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2 break-all">
                    {session.lastMessage || "Sin mensajes"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {session.intentLabel && (
                      <IntentBadge label={session.intentLabel} />
                    )}
                    {(labelsBySessionId.get(session.sessionId) || []).map(label => (
                      <LabelBadge
                        key={label.id}
                        name={label.name}
                        color={label.color}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </button>

              <div
                className="shrink-0 self-start z-10"
                onClick={(e) => e.stopPropagation()}
              >
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
          ))}
          <div className="p-3 border-t border-border space-y-1.5">
            {channelConfig.skipListDateFilter ? (
              <p className="text-xs text-center text-muted-foreground">
                Mostrando las últimas {channelConfig.listFetchLimit.toLocaleString()} filas del tenant
              </p>
            ) : historyWindowDays >= MAX_HISTORY_DAYS ? (
              <p className="text-xs text-center text-muted-foreground">
                Mostrando últimos 90 días (máximo)
              </p>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                  disabled={listLoading}
                  onClick={() => setHistoryWindowDays(prev => Math.min(prev + 14, MAX_HISTORY_DAYS))}
                >
                  {listLoading ? 'Cargando...' : 'Cargar más antiguos (+14 días)'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Mostrando últimos {historyWindowDays} días
                </p>
              </>
            )}
          </div>
          </>
        )}
      </ScrollArea>
    </div>
  ), [
    isMobile,
    processedSessions.length,
    listLoading,
    listMessages.length,
    historyWindowDays,
    listError,
    filteredSessions,
    selectedSessionId,
    remarketingMode,
    selectedForRemarketing,
    labels,
    labelFilterIds,
    filterTab,
    searchTerm,
    labelsBySessionId,
    sessionLabels,
    assignLabel,
    removeLabel,
    toggleRemarketingSelection,
  ]);

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
                        onCheckedChange={(checked) => {
                          void setBotStateForSession(selectedSessionId, checked);
                        }}
                        disabled={botToggling.has(selectedSessionId)}
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
                        onCheckedChange={(checked) => {
                          void setBotStateForSession(selectedSessionId, checked);
                        }}
                        disabled={botToggling.has(selectedSessionId)}
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
          {/* Botón cargar mensajes anteriores */}
          <div className="flex flex-col items-center py-2 gap-1">
            {sessionWindowDays < 90 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={sessionIsLoadingMore}
                  className="h-7 text-xs text-muted-foreground gap-1.5"
                >
                  {sessionIsLoadingMore ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />Cargando...</>
                  ) : (
                    "Cargar mensajes anteriores (+14 días)"
                  )}
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Mostrando últimos {sessionWindowDays} días
                </span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Mostrando últimos 90 días (máximo)
              </span>
            )}
          </div>

          {selectedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Sin mensajes en esta conversación</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedMessages.map((msg) => {
                const parsed = parseMessageField(msg.message);
                const hasContent = !!parsed?.content;
                const hasMedia = channelConfig.supportsMedia && 'media' in msg && msg.media !== null && msg.media !== undefined;
                
                if (!hasContent && !hasMedia) return null;
                
                if (hasContent && parsed!.content!.trim().toLowerCase().startsWith('tenemos texto e imagen')) {
                  return null;
                }
                const isFromClient = parsed?.type === 'human';
                
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
                      {hasMedia && 'media' in msg && msg.media?.type === 'image' && (
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
                      {hasMedia && 'media' in msg && msg.media?.type === 'audio' && (
                        <div className="mb-2">
                          <audio controls className="max-w-full">
                            <source src={msg.media.url} type={msg.media.mimeType || 'audio/mpeg'} />
                            Tu navegador no soporta audio
                          </audio>
                        </div>
                      )}
                      
                      {hasMedia && 'media' in msg && msg.media?.type === 'video' && (
                        <div className="mb-2">
                          <video controls className="max-w-full rounded-lg">
                            <source src={msg.media.url} type={msg.media.mimeType || 'video/mp4'} />
                            Tu navegador no soporta video
                          </video>
                        </div>
                      )}
                      
                      {hasMedia && 'media' in msg && msg.media?.type === 'document' && (
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
                      {hasContent && parsed!.content!.trim().toLowerCase().startsWith('comprobante de pago recibido en formato pdf') ? (
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
                          {parsed!.content}
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
  }, [selectedSessionId, selectedSession, sessionMessages, sessionWindowDays, sessionIsLoadingMore, handleLoadMore, botStates, isMobile, botToggling, setBotStateForSession]);

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
        return (
          <ChatComposer
            key={selectedSessionId}
            isMobile={isMobile}
            isBotActive={isBotActive}
            disabledByWindow={false}
            supportsAttachments={channelConfig.supportsAttachments}
            onSend={sendHumanMessage}
          />
        );
      })()}
    </div>
  ) : chatMessagesContent;

  const remarketingControls = channelConfig.supportsRemarketing ? (
    remarketingMode ? (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={cancelRemarketing}
          disabled={isSendingRemarketing}
          className={cn(isMobile && "h-8 text-xs px-2")}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={sendRemarketing}
          disabled={selectedForRemarketing.size === 0 || isSendingRemarketing}
          className={cn(
            "bg-primary hover:bg-primary/90",
            isMobile ? "h-8 text-xs px-2" : "ml-2"
          )}
        >
          {isSendingRemarketing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Enviar ({selectedForRemarketing.size})
        </Button>
      </>
    ) : (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRemarketingMode(true)}
        className={cn(isMobile && "h-8 text-xs px-2")}
      >
        <Megaphone className="h-4 w-4 mr-1" />
        Remarketing
      </Button>
    )
  ) : null;

  return (
    <>
      <div className={cn(
        "flex flex-col flex-1 min-h-0",
        isMobile && "h-[calc(100dvh-3.5rem-5rem)] -m-4 md:m-0 overflow-hidden"
      )}>
        {isMobile && !selectedSessionId && (
          <div className="px-4 pt-2 pb-3 -mx-4 md:mx-0 shrink-0">
            <PageHeader
              title="Chats"
              subtitle="Conversaciones en tiempo real"
              className="mb-3"
              actions={remarketingControls ?? undefined}
            />
            {onChannelChange && (
              <ChatChannelTabs value={channel} onChange={onChannelChange} />
            )}
          </div>
        )}

        {!isMobile && remarketingControls && (
          <div className="flex items-center justify-end mb-4 gap-2">
            {remarketingControls}
          </div>
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
    </>
  );
}
