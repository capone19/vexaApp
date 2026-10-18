import { useState, useEffect } from 'react';
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

function randomSlugSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

export default function AdminOnboarding() {
  const { pendingUsers, isLoading: loadingUsers, error: pendingUsersError, refetch } = usePendingUsers();
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
  const [activacionRapida, setActivacionRapida] = useState(false);

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
    setActivacionRapida(false);
  };

  const handleGenerarSlugUnico = () => {
    const base =
      generateSlug(tenantName) ||
      generateSlug(selectedUser?.email?.split('@')[0] || '') ||
      'cliente';
    setTenantSlug(`${base}-${randomSlugSuffix()}`);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error('Selecciona un usuario');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke('admin-onboarding', {
        body: {
          userId: selectedUser.id,
          tenantName: tenantName.trim() || undefined,
          tenantSlug: activacionRapida ? undefined : tenantSlug.trim() || undefined,
          autoSlug: activacionRapida || !tenantSlug.trim(),
          plan,
          timezone,
          channelType,
          channelIdentifier: phoneNumber.trim() || null,
          whatsappPhoneId: metaPhoneId.trim() || null,
          whatsappBusinessId: metaBusinessId.trim() || null,
        },
      });

      const serverError =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error?: string }).error)
          : null;

      if (error) {
        throw new Error(serverError || error.message || 'Error al llamar a la función');
      }

      if (!data?.success) {
        throw new Error(
          serverError || (data as { message?: string })?.message || 'Error al activar cliente'
        );
      }

      const d = data as {
        tenantId?: string;
        tenantSlugUsed?: string;
        tenantNameUsed?: string;
      };
      toast.success('Cliente activado exitosamente', {
        description: `${d.tenantNameUsed || tenantName || 'Cliente'} · slug: ${d.tenantSlugUsed || tenantSlug} · tenant_id: ${d.tenantId || '(ver consola)'}`,
        duration: 12000,
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
      const raw = err instanceof Error ? err.message : String(err);
      const isFnUnreachable =
        /edge function|failed to send|fetch|network|load failed|non-2xx/i.test(raw);
      toast.error('Error al activar cliente', {
        description: isFnUnreachable && !raw.includes('Error creating tenant')
          ? `${raw} — Despliega: npx supabase functions deploy admin-onboarding`
          : raw,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.value === plan);

  useEffect(() => {
    if (pendingUsersError) {
      toast.error('No se pudieron cargar los usuarios pendientes', {
        description: pendingUsersError,
      });
    }
  }, [pendingUsersError]);

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
              {pendingUsersError && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
                  <p className="font-medium text-destructive">Error al cargar la lista</p>
                  <p className="text-muted-foreground mt-1">{pendingUsersError}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Si acabas de actualizar el código, despliega la función{' '}
                    <code className="rounded bg-muted px-1">admin-list-pending-users</code> en Supabase.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                </div>
              )}
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !pendingUsersError && pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay usuarios pendientes</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Incluye cuentas con sesión en Auth pero sin fila en{' '}
                    <code className="rounded bg-muted px-1">user_roles</code>. Si alguien ve &quot;Cuenta en
                    activación&quot; y no aparece aquí, revisa que la edge function esté desplegada y que
                    inicies sesión como <strong>contacto@vexalatam.com</strong> en el panel admin.
                  </p>
                </div>
              ) : pendingUsersError ? null : (
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
                          {user.email && (
                            <p className="text-sm text-primary/90">{user.email}</p>
                          )}
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
                <div className="flex items-start gap-3 rounded-lg border border-border p-3 bg-muted/30">
                  <Checkbox
                    id="activacionRapida"
                    checked={activacionRapida}
                    onCheckedChange={(v) => setActivacionRapida(v === true)}
                    disabled={!selectedUser}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="activacionRapida" className="cursor-pointer font-medium">
                      Activación rápida
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Genera nombre y slug automáticos desde el correo del usuario. Ideal para salir del paso; luego
                      puedes renombrar en administración si hace falta.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantName">Nombre del negocio</Label>
                  <Input
                    id="tenantName"
                    placeholder="Ej: Mi Estética (opcional si activación rápida o se usará el email)"
                    value={tenantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={!selectedUser || activacionRapida}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[180px] space-y-2">
                      <Label htmlFor="tenantSlug">Slug</Label>
                      <Input
                        id="tenantSlug"
                        placeholder="mi-estetica"
                        value={tenantSlug}
                        onChange={(e) => setTenantSlug(e.target.value)}
                        disabled={!selectedUser || activacionRapida}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mb-0.5"
                      onClick={handleGenerarSlugUnico}
                      disabled={!selectedUser || activacionRapida}
                    >
                      Generar slug único
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si el slug ya existe, el servidor añade un sufijo aleatorio. Con activación rápida el slug es
                    totalmente automático.
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
                {selectedUser && (tenantName.trim() || activacionRapida) && (
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
                  disabled={!selectedUser || isSubmitting}
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
