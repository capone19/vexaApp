import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  User, 
  Shield,
  Building2,
  Clock,
  Tag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Media', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Abierto', className: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En Progreso', className: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resuelto', className: 'bg-purple-100 text-purple-700' },
  closed: { label: 'Cerrado', className: 'bg-gray-100 text-gray-700' },
};

export default function AdminTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTicketData = async () => {
    if (!ticketId) return;
    
    setIsLoading(true);
    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, plan')
        .eq('id', ticketData.tenant_id)
        .single();

      if (!tenantError && tenantData) {
        setTenant(tenantData);
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Error al cargar el ticket');
      navigate('/admin/tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          tenant_id: ticket.tenant_id,
          sender_type: 'admin',
          content: newMessage.trim(),
        });

      if (error) throw error;

      // Update ticket updated_at
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      setNewMessage('');
      toast.success('Mensaje enviado');
      fetchTicketData();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      if (error) throw error;

      setTicket({ ...ticket, status: newStatus });
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM yyyy, HH:mm", { locale: es });
  };

  const formatTicketId = (id: string) => {
    return `#${id.slice(0, 8).toUpperCase()}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Ticket no encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/tickets')}>
            Volver a tickets
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tickets')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{ticket.title}</h1>
                <span className="text-muted-foreground font-mono text-sm">
                  {formatTicketId(ticket.id)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Creado el {formatDate(ticket.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityConfig[ticket.priority]?.className}>
              {priorityConfig[ticket.priority]?.label}
            </Badge>
            <Select 
              value={ticket.status} 
              onValueChange={handleStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Panel */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial de Mensajes</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {/* Ticket description as first message */}
                    {ticket.description && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Cliente</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-sm">
                            {ticket.description}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          message.sender_type === 'admin' 
                            ? "bg-primary/10" 
                            : "bg-blue-100"
                        )}>
                          {message.sender_type === 'admin' ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.sender_type === 'admin' ? 'Soporte VEXA' : 'Cliente'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                          <div className={cn(
                            "rounded-lg p-3 text-sm",
                            message.sender_type === 'admin' 
                              ? "bg-primary/5 border border-primary/10" 
                              : "bg-muted"
                          )}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />

                {/* Reply Input */}
                <div className="p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escribe tu respuesta..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            {/* Client Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{tenant?.name || 'Desconocido'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="font-mono text-sm">{tenant?.slug || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <Badge variant="outline" className="capitalize">{tenant?.plan || '-'}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tenant ID</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {ticket.tenant_id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Detalles del Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge className={statusConfig[ticket.status]?.className}>
                    {statusConfig[ticket.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridad</p>
                  <Badge className={priorityConfig[ticket.priority]?.className}>
                    {priorityConfig[ticket.priority]?.label}
                  </Badge>
                </div>
                {ticket.category && (
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-sm">{ticket.category}</p>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">
                    Última actualización: {formatDate(ticket.updated_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}