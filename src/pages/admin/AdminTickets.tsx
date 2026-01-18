import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, Eye, Search, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketWithTenant {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  tenant_name?: string;
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

export default function AdminTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      // Fetch tickets with tenant info
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch tenants to get names
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name');

      if (tenantsError) throw tenantsError;

      // Map tenant names to tickets
      const tenantsMap = new Map(tenantsData?.map(t => [t.id, t.name]));
      
      const ticketsWithTenants = (ticketsData || []).map(ticket => ({
        ...ticket,
        tenant_name: tenantsMap.get(ticket.tenant_id) || 'Desconocido',
      }));

      setTickets(ticketsWithTenants);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Error al cargar los tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy', { locale: es });
  };

  const formatTicketId = (id: string) => {
    return `#${id.slice(0, 8).toUpperCase()}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground">
            Gestiona los tickets de soporte de todos los clientes
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, cliente o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchTickets}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Lista de Tickets ({filteredTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron tickets</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTicketId(ticket.id)}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{ticket.tenant_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {ticket.tenant_id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityConfig[ticket.priority]?.className}>
                            {priorityConfig[ticket.priority]?.label || ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[ticket.status]?.className}>
                            {statusConfig[ticket.status]?.label || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(ticket.created_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(ticket.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}