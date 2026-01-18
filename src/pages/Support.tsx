import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Headphones,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Paperclip,
  X,
  HelpCircle,
  FileText,
  ArrowLeft,
  Send,
  User,
  Headset,
  Loader2,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type MessageSender = 'client' | 'admin';

interface TicketMessage {
  id: string;
  sender_type: MessageSender;
  content: string;
  created_at: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

// Helpers
const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case 'open':
      return {
        label: 'Abierto',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: AlertCircle,
      };
    case 'in_progress':
      return {
        label: 'En proceso',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Clock,
      };
    case 'resolved':
      return {
        label: 'Resuelto',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
      };
    case 'closed':
      return {
        label: 'Cerrado',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: CheckCircle,
      };
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: AlertCircle,
      };
  }
};

const getPriorityConfig = (priority: TicketPriority) => {
  switch (priority) {
    case 'low':
      return {
        label: 'Baja',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'medium':
      return {
        label: 'Media',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'high':
      return {
        label: 'Alta',
        className: 'bg-red-100 text-red-700 border-red-200',
      };
    case 'urgent':
      return {
        label: 'Urgente',
        className: 'bg-red-200 text-red-800 border-red-300',
      };
    default:
      return {
        label: priority,
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
  });
  const isMobile = useIsMobile();

  // Fetch tickets from database
  const fetchTickets = async () => {
    if (!user?.tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Error al cargar los tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for selected ticket
  const fetchMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as TicketMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar los mensajes');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  // Métricas
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim() || !user?.tenantId) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: user.tenantId,
          title: newTicket.title.trim(),
          description: newTicket.description.trim(),
          priority: newTicket.priority,
          status: 'open',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTickets(prev => [data as Ticket, ...prev]);
      setNewTicket({ title: '', description: '', priority: 'medium' });
      setIsModalOpen(false);
      toast.success('Ticket creado exitosamente');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear el ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTicket({ title: '', description: '', priority: 'medium' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user?.tenantId) return;

    setIsSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          tenant_id: user.tenantId,
          sender_type: 'client',
          sender_id: user.id,
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      setMessages(prev => [...prev, data as TicketMessage]);
      setNewMessage('');
      
      // Update the ticket in the list
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id 
          ? { ...t, updated_at: new Date().toISOString() }
          : t
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Vista de detalle del ticket
  if (selectedTicket) {
    const statusConfig = getStatusConfig(selectedTicket.status);
    const priorityConfig = getPriorityConfig(selectedTicket.priority);

    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          {/* Header con botón volver */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-2", isMobile && "h-9 -ml-2")}
              onClick={() => {
                setSelectedTicket(null);
                setMessages([]);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>

          {/* Información del ticket */}
          <Card className="border-border">
            <CardContent className={cn("p-4 md:p-6")}>
              <div className={cn("flex", isMobile ? "flex-col gap-4" : "items-start justify-between")}>
                <div className="flex-1 min-w-0">
                  <h2 className={cn("font-semibold text-foreground", isMobile ? "text-lg" : "text-xl")}>{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs font-medium gap-1", statusConfig.className)}
                    >
                      <statusConfig.icon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs font-medium", priorityConfig.className)}
                    >
                      {priorityConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    Creado el {format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>

                {/* Estado visual (solo lectura) */}
                <div className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2 bg-secondary rounded-lg",
                  isMobile && "self-start"
                )}>
                  <span className="text-xs md:text-sm text-muted-foreground">Estado:</span>
                  <span className={cn(
                    "text-xs md:text-sm font-medium",
                    selectedTicket.status === 'open' && "text-blue-600",
                    selectedTicket.status === 'in_progress' && "text-amber-600",
                    (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && "text-emerald-600",
                  )}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              {selectedTicket.description && (
                <div className="mt-4 md:mt-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">Descripción</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">{selectedTicket.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversación del ticket */}
          <Card className="border-border">
            <CardHeader className={cn("pb-3", isMobile && "px-4")}>
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensajes
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Conversación del ticket
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Lista de mensajes */}
              <ScrollArea className={cn(isMobile ? "h-[calc(100vh-480px)] min-h-[200px]" : "h-[350px]", "px-4 md:px-6")}>
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-12 text-muted-foreground">
                    <MessageSquare className={cn("mb-3 opacity-20", isMobile ? "h-8 w-8" : "h-10 w-10")} />
                    <p className="text-xs md:text-sm text-center">No hay mensajes aún. Sé el primero en escribir.</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4 py-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2 md:gap-3",
                          message.sender_type === 'client' && "flex-row-reverse"
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex-shrink-0 rounded-full flex items-center justify-center",
                          isMobile ? "w-7 h-7" : "w-8 h-8",
                          message.sender_type === 'admin' 
                            ? "bg-primary/10" 
                            : "bg-secondary"
                        )}>
                          {message.sender_type === 'admin' ? (
                            <Headset className={cn("text-primary", isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          ) : (
                            <User className={cn("text-muted-foreground", isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          )}
                        </div>

                        {/* Mensaje */}
                        <div className={cn(
                          "flex-1",
                          isMobile ? "max-w-[85%]" : "max-w-[80%]",
                          message.sender_type === 'client' && "flex flex-col items-end"
                        )}>
                          <div className={cn(
                            "flex items-center gap-2 mb-1",
                            isMobile && "flex-wrap"
                          )}>
                            <span className={cn(
                              "text-xs font-medium",
                              message.sender_type === 'admin' ? "text-primary" : "text-foreground"
                            )}>
                              {message.sender_type === 'admin' ? 'Soporte VEXA' : 'Tú'}
                            </span>
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {format(new Date(message.created_at), isMobile ? "dd/MM HH:mm" : "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                          </div>
                          <div className={cn(
                            "rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-pre-wrap",
                            message.sender_type === 'admin' 
                              ? "bg-primary/5 text-foreground border border-primary/10" 
                              : "bg-secondary text-foreground"
                          )}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input para nuevo mensaje */}
              <div className={cn("p-3 md:p-4 border-t border-border")}>
                <div className="flex items-end gap-2 md:gap-3">
                  <Textarea
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isSendingMessage}
                    className={cn(
                      "resize-none border-border",
                      isMobile ? "min-h-[50px] max-h-[100px]" : "min-h-[60px] max-h-[120px]"
                    )}
                  />
                  <Button
                    size="icon"
                    className={cn("shrink-0", isMobile ? "h-10 w-10" : "h-10 w-10")}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSendingMessage}
                  >
                    {isSendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Vista principal de lista de tickets
  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Soporte"
          subtitle={isMobile ? undefined : "Solicitudes y tickets de soporte"}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-5")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("font-medium text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>Abiertos</p>
                  <p className={cn("font-bold text-foreground mt-1", isMobile ? "text-xl" : "text-3xl")}>{openTickets}</p>
                  {!isMobile && <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>}
                </div>
                <div className={cn("rounded-lg bg-blue-50", isMobile ? "p-1.5" : "p-2")}>
                  <AlertCircle className={cn("text-blue-500", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-5")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("font-medium text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>En Progreso</p>
                  <p className={cn("font-bold text-foreground mt-1", isMobile ? "text-xl" : "text-3xl")}>{inProgressTickets}</p>
                  {!isMobile && <p className="text-xs text-muted-foreground mt-1">Siendo atendidos</p>}
                </div>
                <div className={cn("rounded-lg bg-amber-50", isMobile ? "p-1.5" : "p-2")}>
                  <Clock className={cn("text-amber-500", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className={cn("p-3 md:p-5")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("font-medium text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>Resueltos</p>
                  <p className={cn("font-bold text-foreground mt-1", isMobile ? "text-xl" : "text-3xl")}>{resolvedTickets}</p>
                  {!isMobile && <p className="text-xs text-muted-foreground mt-1">Esta semana</p>}
                </div>
                <div className={cn("rounded-lg bg-emerald-50", isMobile ? "p-1.5" : "p-2")}>
                  <CheckCircle className={cn("text-emerald-500", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action button */}
        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Ticket
          </Button>
        </div>

        {/* Lista de tickets */}
        <Card className="border-border">
          <CardHeader className={cn(isMobile && "px-4")}>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Headphones className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
              Mis Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(isMobile && "px-4")}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-12 text-muted-foreground">
                <Headphones className={cn("mb-3 opacity-20", isMobile ? "h-10 w-10" : "h-12 w-12")} />
                <p className="text-sm md:text-base font-medium">No tienes tickets</p>
                <p className="text-xs md:text-sm text-center mt-1">
                  Crea un nuevo ticket si necesitas ayuda
                </p>
                <Button 
                  className="mt-4 gap-2" 
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Crear Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const priorityConfig = getPriorityConfig(ticket.priority);

                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        "p-3 md:p-4 border border-border rounded-lg cursor-pointer transition-colors hover:bg-secondary/50",
                      )}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className={cn("flex", isMobile ? "flex-col gap-2" : "items-center justify-between")}>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn("font-medium text-foreground truncate", isMobile ? "text-sm" : "text-base")}>
                            {ticket.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] md:text-xs font-medium gap-1", statusConfig.className)}
                            >
                              <statusConfig.icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              {statusConfig.label}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] md:text-xs font-medium", priorityConfig.className)}
                            >
                              {priorityConfig.label}
                            </Badge>
                          </div>
                        </div>
                        <div className={cn("text-muted-foreground", isMobile && "self-end")}>
                          <span className="text-[10px] md:text-xs">
                            {format(new Date(ticket.updated_at), isMobile ? "dd/MM" : "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal para crear ticket */}
        {isMobile ? (
          <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
              <SheetHeader className="pb-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Nuevo Ticket
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="h-[calc(100%-120px)] py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-mobile" className="text-sm font-medium">
                      Título del ticket *
                    </Label>
                    <Input
                      id="title-mobile"
                      placeholder="Ej: Problema con integración WhatsApp"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority-mobile" className="text-sm font-medium">
                      Prioridad
                    </Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value: TicketPriority) => setNewTicket(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger id="priority-mobile">
                        <SelectValue placeholder="Selecciona prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description-mobile" className="text-sm font-medium">
                      Descripción *
                    </Label>
                    <Textarea
                      id="description-mobile"
                      placeholder="Describe tu problema o solicitud con el mayor detalle posible..."
                      value={newTicket.description}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              </ScrollArea>

              <SheetFooter className="pt-4 border-t border-border gap-2">
                <Button 
                  variant="outline" 
                  onClick={closeModal}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTicket}
                  className="flex-1"
                  disabled={!newTicket.title.trim() || !newTicket.description.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Ticket'
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Nuevo Ticket de Soporte
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del ticket *</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Problema con integración WhatsApp"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value: TicketPriority) => setNewTicket(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Selecciona prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe tu problema o solicitud con el mayor detalle posible..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTicket}
                  disabled={!newTicket.title.trim() || !newTicket.description.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Ticket'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}