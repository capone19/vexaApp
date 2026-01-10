import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos
type TicketStatus = 'open' | 'in-progress' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high';
type MessageSender = 'user' | 'support';

interface TicketMessage {
  id: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  hasAttachments: boolean;
  attachmentCount?: number;
  messages: TicketMessage[];
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
}

// Mock de tickets con mensajes
const mockTickets: Ticket[] = [
  {
    id: 'ticket-001',
    title: 'No me descarga la factura',
    description: 'No me deja descargar la factura en la parte de facturación',
    status: 'open',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    hasAttachments: false,
    messages: [],
  },
  {
    id: 'ticket-002',
    title: 'Problemas con Dashboard',
    description: 'No me muestra métricas principales',
    status: 'in-progress',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
    hasAttachments: true,
    attachmentCount: 2,
    messages: [
      {
        id: 'msg-001',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: 'Hola, gracias por contactarnos. Estamos revisando el problema con las métricas del dashboard. ¿Podrías indicarnos qué navegador estás utilizando?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        id: 'msg-002',
        sender: 'user',
        senderName: 'Patricio Araya',
        content: 'Estoy usando Google Chrome versión 120',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        id: 'msg-003',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: 'Perfecto, hemos identificado el problema. Estamos trabajando en una solución que estará disponible en las próximas horas. Te notificaremos cuando esté resuelto.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
      },
    ],
  },
  {
    id: 'ticket-003',
    title: 'Problemas con la sección de facturación',
    description: 'No me deja pagar la factura cuando aprieto el botón de pagar',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    hasAttachments: true,
    attachmentCount: 1,
    messages: [
      {
        id: 'msg-004',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: 'Hola, lamentamos los inconvenientes. ¿Podrías enviarnos una captura de pantalla del error que aparece?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
      },
    ],
  },
  {
    id: 'ticket-004',
    title: 'Error al agendar citas',
    description: 'El calendario no carga correctamente en horarios de tarde',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    hasAttachments: false,
    messages: [
      {
        id: 'msg-005',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: 'Hemos detectado un problema con la zona horaria. Nuestro equipo técnico está trabajando en la corrección.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: 'msg-006',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: 'Actualización: El problema ha sido identificado y estamos implementando la solución. Estimamos tenerlo resuelto en 24-48 horas.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ],
  },
  {
    id: 'ticket-005',
    title: 'Consulta sobre integración WhatsApp',
    description: '¿Cómo puedo conectar mi número de WhatsApp Business?',
    status: 'resolved',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    hasAttachments: false,
    messages: [
      {
        id: 'msg-007',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: '¡Hola! Para conectar tu WhatsApp Business, sigue estos pasos:\n\n1. Ve a Configuración > Integraciones\n2. Selecciona "WhatsApp Business"\n3. Escanea el código QR con tu teléfono\n4. Autoriza la conexión\n\nSi necesitas ayuda adicional, no dudes en escribirnos.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
      {
        id: 'msg-008',
        sender: 'user',
        senderName: 'Patricio Araya',
        content: '¡Muchas gracias! Pude conectarlo sin problemas.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
      },
      {
        id: 'msg-009',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: '¡Excelente! Nos alegra que hayas podido resolverlo. Cerramos el ticket. Si tienes más consultas, no dudes en crear un nuevo ticket. ¡Que tengas un excelente día!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ],
  },
  {
    id: 'ticket-006',
    title: 'Solicitud de nueva funcionalidad',
    description: 'Me gustaría poder exportar los reportes en formato Excel',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    hasAttachments: false,
    messages: [
      {
        id: 'msg-010',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: '¡Gracias por tu sugerencia! Hemos registrado tu solicitud y la enviaremos al equipo de producto para su evaluación. Te mantendremos informado sobre cualquier actualización al respecto.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
      },
      {
        id: 'msg-011',
        sender: 'support',
        senderName: 'Equipo de Soporte',
        content: '¡Buenas noticias! La funcionalidad de exportar a Excel ha sido agregada a nuestro roadmap y estará disponible en la próxima actualización. Gracias por ayudarnos a mejorar.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
    ],
  },
];

// Helpers
const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case 'open':
      return {
        label: 'Abierto',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: AlertCircle,
      };
    case 'in-progress':
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
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Métricas
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = [];
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (let i = 0; i < files.length && attachedFiles.length + newFiles.length < maxFiles; i++) {
      const file = files[i];
      if (file.size <= maxSize) {
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
        });
      }
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleCreateTicket = () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;

    const ticket: Ticket = {
      id: `ticket-${Date.now()}`,
      title: newTicket.title,
      description: newTicket.description,
      status: 'open',
      priority: newTicket.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      hasAttachments: attachedFiles.length > 0,
      attachmentCount: attachedFiles.length || undefined,
      messages: [],
    };

    setTickets(prev => [ticket, ...prev]);
    setNewTicket({ title: '', description: '', priority: 'medium' });
    setAttachedFiles([]);
    setIsModalOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTicket({ title: '', description: '', priority: 'medium' });
    setAttachedFiles([]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const message: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      senderName: 'Patricio Araya',
      content: newMessage,
      timestamp: new Date(),
    };

    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          messages: [...t.messages, message],
          updatedAt: new Date(),
        };
      }
      return t;
    }));

    // Actualizar el ticket seleccionado
    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message],
      updatedAt: new Date(),
    } : null);

    setNewMessage('');
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
        <div className="space-y-6">
          {/* Header con botón volver */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setSelectedTicket(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>

          {/* Información del ticket */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Creado el {format(selectedTicket.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>

                {/* Estado visual (solo lectura) */}
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <span className={cn(
                    "text-sm font-medium",
                    selectedTicket.status === 'open' && "text-blue-600",
                    selectedTicket.status === 'in-progress' && "text-amber-600",
                    selectedTicket.status === 'resolved' && "text-emerald-600",
                  )}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversación del ticket */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensajes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Conversación del ticket
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Lista de mensajes */}
              <ScrollArea className="h-[350px] px-6">
                {selectedTicket.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No hay mensajes aún. Sé el primero en escribir.</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {selectedTicket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.sender === 'user' && "flex-row-reverse"
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          message.sender === 'support' 
                            ? "bg-primary/10" 
                            : "bg-secondary"
                        )}>
                          {message.sender === 'support' ? (
                            <Headset className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Mensaje */}
                        <div className={cn(
                          "flex-1 max-w-[80%]",
                          message.sender === 'user' && "flex flex-col items-end"
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs font-medium",
                              message.sender === 'support' ? "text-primary" : "text-foreground"
                            )}>
                              {message.senderName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(message.timestamp, "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                          </div>
                          <div className={cn(
                            "rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                            message.sender === 'support' 
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
              <div className="p-4 border-t border-border">
                <div className="flex items-end gap-3">
                  <Textarea
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[60px] max-h-[120px] resize-none border-border"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
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
      <div className="space-y-6">
        <PageHeader
          title="Soporte"
          subtitle="Solicitudes y tickets de soporte"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tickets Abiertos</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{openTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{inProgressTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Siendo atendidos</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resueltos</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{resolvedTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA - ¿Necesitas ayuda? */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">¿Necesitas ayuda?</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea un nuevo ticket y nuestro equipo te responderá lo antes posible
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Nuevo Ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Listado de Tickets */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Mis Tickets
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Historial y estado de tus solicitudes
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Headphones className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">No tienes tickets creados</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setIsModalOpen(true)}
                >
                  Crear tu primer ticket
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const priorityConfig = getPriorityConfig(ticket.priority);

                  return (
                    <div
                      key={ticket.id}
                      className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2">
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
                        {ticket.hasAttachments && (
                          <Badge variant="outline" className="text-xs font-medium gap-1 bg-secondary">
                            <Paperclip className="h-3 w-3" />
                            {ticket.attachmentCount}
                          </Badge>
                        )}
                        {ticket.messages.length > 0 && (
                          <Badge variant="outline" className="text-xs font-medium gap-1 bg-secondary">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length}
                          </Badge>
                        )}
                      </div>

                      {/* Título y descripción */}
                      <h4 className="font-medium text-foreground">{ticket.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ticket.description}
                      </p>

                      {/* Fechas */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>
                          Creado: {format(ticket.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                        <span>•</span>
                        <span>
                          Actualizado: {format(ticket.updatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal - Crear Nuevo Ticket */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Crear Nuevo Ticket</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Describe tu problema o consulta y nuestro equipo te responderá pronto
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Resumen breve del problema"
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                className="border-border focus:border-primary"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe detalladamente tu problema o consulta"
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px] border-border focus:border-primary resize-none"
              />
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridad</Label>
              <Select
                value={newTicket.priority}
                onValueChange={(value: TicketPriority) => 
                  setNewTicket(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Archivos adjuntos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Archivos adjuntos <span className="text-muted-foreground">(opcional)</span>
              </Label>
              
              <div className="space-y-3">
                {/* Botón para adjuntar */}
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Adjuntar archivos ({attachedFiles.length}/5)
                  </span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileAttach}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Máximo 5 archivos, 10MB por archivo
                </p>

                {/* Lista de archivos adjuntos */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTicket}
              disabled={!newTicket.title.trim() || !newTicket.description.trim()}
            >
              Crear Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
