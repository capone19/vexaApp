import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean | null;
  whatsapp_phone_id: string | null;
  created_at: string | null;
  subscriptions: {
    price_usd: number;
    status: string;
  }[] | null;
}

export default function AdminClients() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        
        // Call the edge function to list all tenants (bypasses RLS)
        const { data, error: fnError } = await supabase.functions.invoke('admin-list-tenants');
        
        if (fnError) {
          throw fnError;
        }

        setTenants(data?.tenants || []);
      } catch (err) {
        console.error('[AdminClients] Error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar clientes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'enterprise':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'enterprise':
        return '$499';
      case 'pro':
        return '$199';
      default:
        return '$99';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Todos los clientes registrados en la plataforma
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de Clientes ({tenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                {error}
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                          {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPlanPrice(tenant.plan)}/mes</TableCell>
                      <TableCell>
                        {tenant.is_active ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.whatsapp_phone_id ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Conectado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            No conectado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tenant.created_at
                          ? format(new Date(tenant.created_at), 'd MMM yyyy', { locale: es })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
