import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Play, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  RotateCcw,
  Zap,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WEBHOOKS } from "@/lib/constants";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PlaygroundChatProps {
  tenantId?: string;
}

export function PlaygroundChat({ tenantId }: PlaygroundChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus en input cuando se abre, reset cuando se cierra
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // Reset del chat al cerrar
    if (!isOpen) {
      setMessages([]);
      setInputValue("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // No permitir enviar si no hay tenantId del usuario logueado
    if (!tenantId) {
      console.warn("[Playground] No tenantId disponible - usuario no logueado correctamente");
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "No se pudo identificar tu cuenta. Por favor, recarga la página e intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    console.log("[Playground] Enviando mensaje con tenant_id:", tenantId);

    try {
      const response = await fetch(WEBHOOKS.N8N_AGENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          tenant_id: tenantId,
          session_id: `playground-${Date.now()}`,
          source: "playground",
          timestamp: new Date().toISOString(),
        }),
      });

      let assistantContent = "";

      if (response.ok) {
        const responseText = await response.text();
        console.log("[Playground] Raw response:", responseText);
        
        // Intentar parsear como JSON
        let data: unknown;
        try {
          data = JSON.parse(responseText);
          console.log("[Playground] Parsed JSON:", data);
        } catch {
          // Si no es JSON válido, usar el texto directamente
          assistantContent = responseText;
          console.log("[Playground] Using raw text as response");
        }

        if (data && !assistantContent) {
          // Si es un array, tomar el primer elemento
          const dataObj = Array.isArray(data) ? data[0] : data;
          
          if (typeof dataObj === "string") {
            assistantContent = dataObj;
          } else if (typeof dataObj === "object" && dataObj !== null) {
            // Buscar en campos comunes de respuesta
            const obj = dataObj as Record<string, unknown>;
            assistantContent = 
              (obj.response as string) || 
              (obj.message as string) || 
              (obj.reply as string) || 
              (obj.text as string) || 
              (obj.output as string) || 
              (obj.content as string) ||
              (obj.answer as string) ||
              (obj.respuesta as string) ||
              // Si tiene un campo "data" anidado, buscar ahí
              (obj.data && typeof obj.data === "object" ? 
                ((obj.data as Record<string, unknown>).response as string) || 
                ((obj.data as Record<string, unknown>).message as string) : null) ||
              // Último recurso: convertir todo a string
              JSON.stringify(dataObj);
          }
        }

        // Si aún está vacío, mostrar mensaje genérico
        if (!assistantContent || assistantContent === "{}") {
          assistantContent = "El agente procesó la solicitud pero no envió una respuesta de texto.";
        }
      } else {
        const errorText = await response.text();
        console.error("[Playground] Error response:", response.status, errorText);
        assistantContent = `Error ${response.status}: ${errorText || "No se pudo procesar tu mensaje."}`;
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[Playground] Error:", error);
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "No se pudo conectar con el agente. Verifica que el webhook esté activo.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Probar agente</span>
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-full sm:w-[420px] p-0 flex flex-col bg-gradient-to-b from-background to-muted/20"
      >
        {/* Header del Playground */}
        <SheetHeader className="px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold">Playground</SheetTitle>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-success" />
                  <span className="text-xs text-muted-foreground">Agente activo</span>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Área de mensajes */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Prueba tu agente</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Escribe un mensaje para ver cómo responde el agente con la configuración actual.
              </p>
              
              {/* Recordatorio de guardar */}
              <div className="mt-4 px-4 py-2.5 rounded-lg bg-warning/10 border border-warning/30 max-w-[300px]">
                <p className="text-xs text-warning font-medium flex items-center justify-center gap-1.5">
                  <span>💡</span>
                  Recuerda guardar los cambios y esperar 15 segundos antes de probar para ver las actualizaciones
                </p>
              </div>
              
              {/* Sugerencias de mensajes */}
              <div className="mt-6 space-y-2 w-full max-w-[300px]">
                <p className="text-xs text-muted-foreground mb-2">Prueba con:</p>
                {[
                  "Hola, ¿qué servicios ofrecen?",
                  "Quiero agendar una cita",
                  "¿Cuáles son sus precios?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputValue(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Indicador de escritura */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Anchor para auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input de mensaje */}
        <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-card border-border focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Playground conectado • Los mensajes no se guardan
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

