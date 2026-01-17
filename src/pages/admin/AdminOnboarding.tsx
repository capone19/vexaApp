import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { usePendingUsers, PendingUser } from '@/hooks/use-pending-users';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Loader2, 
  User, 
  Calendar, 
  Building2,
  CheckCircle,
  Cloud,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Santiago', label: 'Santiago, Chile (GMT-3)' },
  { value: 'America/Lima', label: 'Lima, Perú (GMT-5)' },
  { value: 'America/Bogota', label: 'Bogotá, Colombia (GMT-5)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires, Argentina (GMT-3)' },
];

const PLANS = [
  { value: 'basic', label: 'Basic', price: 99 },
  { value: 'pro', label: 'Pro', price: 199 },
  { value: 'enterprise', label: 'Enterprise', price: 499 },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminOnboarding() {
  const { pendingUsers, isLoading: loadingUsers, refetch } = usePendingUsers();
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [plan, setPlan] = useState('basic');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [channelType, setChannelType] = useState('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');

  const handleNameChange = (value: string) => {
    setTenantName(value);
    setTenantSlug(generateSlug(value));
  };

  const handleSelectUser = (user: PendingUser) => {
    setSelectedUser(user);
    // Reset form
    setTenantName('');
    setTenantSlug('');
    setPlan('basic');
    setTimezone('America/Mexico_City');
    setPhoneNumber('');
    setMetaPhoneId('');
    setMetaBusinessId('');
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error('Selecciona un usuario');
      return;
    }

    if (!tenantName.trim()) {
      toast.error('Ingresa el nombre del negocio');
      return;
    }

    if (!tenantSlug.trim()) {
      toast.error('Ingresa el slug');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke('admin-onboarding', {
        body: {
          userId: selectedUser.id,
          tenantName: tenantName.trim(),
          tenantSlug: tenantSlug.trim(),
          plan,
          timezone,
          channelType,
          channelIdentifier: phoneNumber.trim() || null,
          whatsappPhoneId: metaPhoneId.trim() || null,
          whatsappBusinessId: metaBusinessId.trim() || null,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.message || 'Error al activar cliente');
      }

      toast.success('Cliente activado exitosamente', {
        description: `${tenantName} está listo para usar la plataforma`,
      });

      // Reset form
      setSelectedUser(null);
      setTenantName('');
      setTenantSlug('');
      setPlan('basic');
      setPhoneNumber('');
      setMetaPhoneId('');
      setMetaBusinessId('');

      // Refresh pending users
      refetch();
    } catch (err) {
      console.error('[AdminOnboarding] Error:', err);
      toast.error('Error al activar cliente', {
        description: err instanceof Error ? err.message : 'Intenta nuevamente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.value === plan);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground">
            Activa nuevos clientes en la plataforma
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Usuarios Pendientes
              </CardTitle>
              <CardDescription>
                Usuarios registrados que aún no tienen un negocio asignado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay usuarios pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {user.fullName || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(user.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                        {selectedUser?.id === user.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Activar Cliente
              </CardTitle>
              <CardDescription>
                {selectedUser
                  ? `Configurando: ${selectedUser.fullName || 'Usuario sin nombre'}`
                  : 'Selecciona un usuario para comenzar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Business Info */}
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Nombre del negocio</Label>
                  <Input
                    id="tenantName"
                    placeholder="Ej: Mi Estética"
                    value={tenantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={!selectedUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">Slug</Label>
                  <Input
                    id="tenantSlug"
                    placeholder="mi-estetica"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    disabled={!selectedUser}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único (sin espacios ni caracteres especiales)
                  </p>
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex gap-2">
                    {PLANS.map((p) => (
                      <Button
                        key={p.value}
                        type="button"
                        variant={plan === p.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPlan(p.value)}
                        disabled={!selectedUser}
                        className="flex-1"
                      >
                        {p.label} ${p.price}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select
                    value={timezone}
                    onValueChange={setTimezone}
                    disabled={!selectedUser}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel Config */}
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Configuración de Canal</Label>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="channelType" className="text-muted-foreground text-xs">
                        Tipo de canal
                      </Label>
                      <Select
                        value={channelType}
                        onValueChange={setChannelType}
                        disabled={!selectedUser}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-muted-foreground text-xs">
                        Número de teléfono
                      </Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+56912345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={!selectedUser}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metaPhoneId" className="text-muted-foreground text-xs">
                        Meta Phone ID
                      </Label>
                      <Input
                        id="metaPhoneId"
                        placeholder="123456789"
                        value={metaPhoneId}
                        onChange={(e) => setMetaPhoneId(e.target.value)}
                        disabled={!selectedUser}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metaBusinessId" className="text-muted-foreground text-xs">
                        Meta Business ID
                      </Label>
                      <Input
                        id="metaBusinessId"
                        placeholder="987654321"
                        value={metaBusinessId}
                        onChange={(e) => setMetaBusinessId(e.target.value)}
                        disabled={!selectedUser}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {selectedUser && tenantName && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Se creará automáticamente</Label>
                    <div className="mt-2 p-3 bg-muted rounded-lg text-sm space-y-1">
                      <p><span className="text-muted-foreground">tenant_id:</span> (UUID automático)</p>
                      <p><span className="text-muted-foreground">user_roles:</span> owner</p>
                      <p><span className="text-muted-foreground">subscription:</span> {selectedPlan?.label} ${selectedPlan?.price}/mes</p>
                      <p><span className="text-muted-foreground">agent_prompts:</span> (trigger automático)</p>
                    </div>
                  </div>
                )}

                {/* Sync Indicators */}
                {selectedUser && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Sincronización</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked disabled />
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Lovable Cloud</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked disabled />
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Supabase Externo (tenant_channels)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  className="w-full mt-4"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!selectedUser || !tenantName || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activar Cliente
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
