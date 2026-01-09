import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CreditCard, 
  Download, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Building,
  Receipt,
  Wallet,
  Shield,
  Zap,
  Users,
  MessageSquare,
  BarChart3,
  Headphones,
  ExternalLink
} from 'lucide-react';
import { mockBilling, mockClient } from '@/lib/mock/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const plans = [
  {
    id: 'basic',
    name: 'Básico',
    price: 29990,
    description: 'Para negocios que están comenzando',
    features: [
      '500 mensajes/mes',
      '1 canal (WhatsApp)',
      'Dashboard básico',
      'Soporte por email',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49990,
    description: 'Para negocios en crecimiento',
    features: [
      '5,000 mensajes/mes',
      '3 canales',
      'Reportes avanzados',
      'Plantillas ilimitadas',
      'Soporte prioritario',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99990,
    description: 'Para grandes operaciones',
    features: [
      'Mensajes ilimitados',
      'Todos los canales',
      'API personalizada',
      'Reportes a medida',
      'Manager dedicado',
    ],
    popular: false,
  },
];

const Billing = () => {
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(mockClient.plan);

  const currentPlan = plans.find(p => p.id === mockClient.plan);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Facturación"
          subtitle="Gestiona tu plan y métodos de pago"
        />

        {/* Current Plan Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold">Plan {currentPlan?.name}</h3>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Activo
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    {currentPlan?.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Próximo cobro: {format(mockBilling.nextBillingDate, 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(mockBilling.amount)}
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsChangePlanOpen(true)}>
                  Cambiar Plan
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  Cancelar Suscripción
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Method */}
          <Card className="lg:col-span-1 bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expira 12/26</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Principal</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setIsPaymentMethodOpen(true)}>
                Cambiar Método
              </Button>
            </CardContent>
          </Card>

          {/* Billing Info */}
          <Card className="lg:col-span-2 bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Información de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Razón Social</p>
                  <p className="text-sm font-medium">Beauty Salon Pro SpA</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">RUT</p>
                  <p className="text-sm font-medium">76.543.210-K</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="text-sm font-medium">Av. Providencia 1234, Santiago</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email de Facturación</p>
                  <p className="text-sm font-medium">facturas@beautysalonpro.cl</p>
                </div>
              </div>
              <Button variant="link" className="mt-4 p-0 h-auto text-primary">
                Editar información
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Billing History */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Historial de Pagos
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockBilling.history.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-10 h-10 rounded-lg bg-muted/30 items-center justify-center">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Factura #{record.id.replace('inv-', '').padStart(4, '0')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(record.date, 'dd MMMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(record.amount)}</p>
                      <div className="flex items-center gap-1 text-xs">
                        {getStatusIcon(record.status)}
                        <span className={
                          record.status === 'paid' ? 'text-green-400' :
                          record.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                        }>
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                    </div>
                    {record.invoiceUrl && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Summary */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Uso del Período Actual
            </CardTitle>
            <CardDescription>
              Período: {format(new Date(), 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Mensajes</span>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">2,847</p>
                <div className="mt-2">
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '57%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">57% de 5,000</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Canales Activos</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-muted-foreground mt-2">de 3 disponibles</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Plantillas</span>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-xs text-muted-foreground mt-2">Ilimitadas en Pro</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id as 'basic' | 'pro' | 'enterprise')}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-border'
                } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                    Popular
                  </Badge>
                )}
                <div className="text-center mb-4">
                  <h4 className="font-semibold mb-1">{plan.name}</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                  </p>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {mockClient.plan === plan.id && (
                  <Badge variant="outline" className="w-full mt-4 justify-center">
                    Plan Actual
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePlanOpen(false)}>
              Cancelar
            </Button>
            <Button 
              disabled={selectedPlan === mockClient.plan}
              onClick={() => setIsChangePlanOpen(false)}
            >
              {selectedPlan === mockClient.plan ? 'Plan Actual' : 'Confirmar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={isPaymentMethodOpen} onOpenChange={setIsPaymentMethodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Método de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup defaultValue="card" className="space-y-3">
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5" />
                  <span>Tarjeta de Crédito/Débito</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Building className="h-5 w-5" />
                  <span>Transferencia Bancaria</span>
                </Label>
              </div>
            </RadioGroup>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Número de Tarjeta</Label>
                <Input placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiración</Label>
                  <Input placeholder="MM/AA" />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input placeholder="123" type="password" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre en la Tarjeta</Label>
                <Input placeholder="NOMBRE APELLIDO" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Tu información de pago está protegida con encriptación SSL</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentMethodOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsPaymentMethodOpen(false)}>
              Guardar Método
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Billing;