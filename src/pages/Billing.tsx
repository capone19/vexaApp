import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  CreditCard, 
  Download, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Building,
  Receipt,
  Shield,
  Users,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { mockBilling } from '@/lib/mock/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCurrentPlan, setCurrentPlan, type PlanId } from '@/lib/plan';

interface BillingInfoData {
  companyName: string;
  taxId: string;
  address: string;
  billingEmail: string;
}

const BILLING_INFO_STORAGE_KEY = 'vexa_billing_info';

const defaultBillingInfo: BillingInfoData = {
  companyName: 'Beauty Salon Pro SpA',
  taxId: '76.543.210-K',
  address: 'Av. Providencia 1234, Santiago',
  billingEmail: 'facturas@beautysalonpro.cl',
};

const getStoredBillingInfo = (): BillingInfoData => {
  try {
    const stored = localStorage.getItem(BILLING_INFO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading billing info:', e);
  }
};

const plans: Array<{
  id: PlanId;
  name: string;
  price: number;
  onboarding: number;
  currency: string;
  description: string;
  features: string[];
  popular: boolean;
}> = [
  {
    id: 'basic',
    name: 'Básico',
    price: 99,
    onboarding: 150,
    currency: 'USD',
    description: 'Ideal para usuarios básicos',
    features: [
      'Hasta 300 conversaciones al mes',
      'Conversación adicional: +$0.30 USD',
      'Soporte regular',
      '1 número de WhatsApp conectado',
      'Modelo 4.1 mini, OpenAI',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    onboarding: 250,
    currency: 'USD',
    description: 'Para usuarios avanzados',
    features: [
      'Hasta 1,000 conversaciones al mes',
      'Conversación adicional: $0.30 USD',
      'Soporte personalizado',
      'Módulo de WhatsApp Marketing (campañas outbound)',
      '3 números de WhatsApp conectados',
      'Acceso a todos los modelos OpenAI',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    onboarding: 550,
    currency: 'USD',
    description: 'Máximo rendimiento y soporte',
    features: [
      'Hasta 4,000 conversaciones al mes',
      'Conversación adicional: $0.30 USD',
      'Integraciones personalizadas',
      'Asesoría publicitaria',
      'Todo lo incluido en el plan Pro',
      'Números de WhatsApp: ilimitados',
      'Acceso a todos los modelos OpenAI',
    ],
    popular: false,
  },
];

const Billing = () => {
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const [isBillingInfoOpen, setIsBillingInfoOpen] = useState(false);
  const [currentPlan, setCurrentPlanState] = useState<PlanId>(getCurrentPlan());
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(getCurrentPlan());
  const [billingInfo, setBillingInfo] = useState<BillingInfoData>(getStoredBillingInfo);
  const [editingBillingInfo, setEditingBillingInfo] = useState<BillingInfoData>(billingInfo);
  const isMobile = useIsMobile();

  // Update selected plan when opening modal
  useEffect(() => {
    if (isChangePlanOpen) {
      setSelectedPlan(currentPlan);
    }
  }, [isChangePlanOpen, currentPlan]);

  const handleSaveBillingInfo = () => {
    try {
      localStorage.setItem(BILLING_INFO_STORAGE_KEY, JSON.stringify(editingBillingInfo));
      setBillingInfo(editingBillingInfo);
      setIsBillingInfoOpen(false);
      toast.success('Información de facturación guardada');
    } catch (e) {
      console.error('Error saving billing info:', e);
      toast.error('Error al guardar la información');
    }
  };

  const currentPlanData = plans.find(p => p.id === currentPlan) || plans[0];

  // Handle plan change confirmation
  const handleConfirmPlanChange = () => {
    if (selectedPlan !== currentPlan) {
      setCurrentPlan(selectedPlan);
      setCurrentPlanState(selectedPlan);
      const newPlanData = plans.find(p => p.id === selectedPlan);
      toast.success(`Plan actualizado a ${newPlanData?.name || selectedPlan}`);
    }
    setIsChangePlanOpen(false);
  };

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null) return 'A medida';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
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

  // Plan selection content - reused in both dialog and sheet
  const PlanSelector = () => (
    <div className="space-y-4 py-4">
      {/* Grid de planes */}
      <div className={cn(
        "gap-4",
        isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-3"
      )}>
        {isMobile ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "relative rounded-xl border-2 cursor-pointer transition-all min-w-[280px] shrink-0 overflow-hidden",
                    selectedPlan === plan.id
                      ? "border-primary bg-card"
                      : "border-border bg-card active:border-primary/50",
                    plan.popular && "ring-2 ring-primary/20"
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">
                      Popular
                    </Badge>
                  )}
                  
                  {/* Header del plan */}
                  <div className="p-4 pb-3">
                    <h4 className="font-bold text-lg text-foreground">{plan.name}</h4>
                  </div>
                  
                  {/* Sección de precios */}
                  <div className="px-4 py-3 bg-muted/30 border-y border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Mes 1</span>
                      <span className="font-semibold text-foreground">{formatCurrency(plan.onboarding, plan.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-primary">
                      <span className="text-xs uppercase tracking-wide font-medium">Mes 2 en adelante</span>
                      <span className="font-bold text-lg">{formatCurrency(plan.price, plan.currency)}<span className="text-xs font-normal">/mes</span></span>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Incluye</p>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {currentPlan === plan.id && (
                    <div className="px-4 pb-4">
                      <Badge variant="outline" className="w-full justify-center">
                        Plan Actual
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
                selectedPlan === plan.id
                  ? "border-primary bg-card shadow-lg"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-md",
                plan.popular && "ring-2 ring-primary/20"
              )}
            >
              {plan.popular && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">
                  Popular
                </Badge>
              )}
              
              {/* Header del plan */}
              <div className="p-5 pb-3">
                <h4 className="font-bold text-xl text-foreground">{plan.name}</h4>
              </div>
              
              {/* Sección de precios - Estilo similar a la imagen */}
              <div className="mx-4 mb-4 rounded-lg bg-muted/40 border border-border overflow-hidden">
                <div className="p-3 border-b border-border flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mes 1</p>
                    <p className="text-[10px] text-muted-foreground">Implementación</p>
                  </div>
                  <p className="font-bold text-foreground">{formatCurrency(plan.onboarding, plan.currency)}</p>
                </div>
                <div className="p-3 bg-primary/5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Mes 2 en adelante</p>
                    <p className="text-[10px] text-muted-foreground">Precio regular</p>
                  </div>
                  <p className="font-bold text-xl text-primary">{formatCurrency(plan.price, plan.currency)}<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                </div>
              </div>
              
              {/* Features */}
              <div className="px-5 pb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Funciones incluidas</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {currentPlan === plan.id && (
                <div className="px-5 pb-5">
                  <Badge variant="outline" className="w-full justify-center py-2">
                    Plan Actual
                  </Badge>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Nota explicativa sobre el onboarding - Expandida */}
      <div className={cn(
        "rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-4",
        isMobile ? "" : "col-span-3"
      )}>
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm mb-2">¿Cómo funciona el pago?</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-[100px]">Mes 1:</span>
                <span>Pagas solo la implementación (incluye configuración, entrenamiento del agente y soporte inicial).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-[100px]">Mes 2 en adelante:</span>
                <span>Se cobra únicamente la cuota mensual regular.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-[100px]">Upgrades:</span>
                <span>Si cambias a un plan superior, no pagas implementación adicional.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Facturación"
          subtitle={isMobile ? undefined : "Gestiona tu plan y métodos de pago"}
        />

        {/* Usage Summary - Primero para visibilidad */}
        <Card className="border-border">
          <CardHeader className={cn(isMobile && "pb-3")}>
            <CardTitle className="text-sm md:text-base flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4" />
              Uso del Período Actual
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Período: {format(new Date(), 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className={cn("rounded-lg bg-secondary", isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm text-muted-foreground">Conversaciones</span>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={cn("font-semibold text-foreground", isMobile ? "text-xl" : "text-2xl")}>684</p>
                <div className="mt-2">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">68% de 1,000</p>
                </div>
              </div>
              <div className={cn("rounded-lg bg-secondary", isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm text-muted-foreground">WhatsApp</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={cn("font-semibold text-foreground", isMobile ? "text-xl" : "text-2xl")}>2</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-2">de 3 disponibles</p>
              </div>
              <div className={cn("rounded-lg bg-secondary", isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm text-muted-foreground">Campañas</span>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={cn("font-semibold text-foreground", isMobile ? "text-xl" : "text-2xl")}>4</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-2">Incluido en Pro</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className={cn("p-4 md:p-6", isMobile && "space-y-4")}>
            <div className={cn(
              "flex gap-4 md:gap-6",
              isMobile ? "flex-col" : "flex-row lg:items-center justify-between"
            )}>
              <div className="flex items-start gap-3 md:gap-4">
                <div className={cn("rounded-lg bg-primary/10", isMobile ? "p-2" : "p-3")}>
                  <Zap className={cn("text-primary", isMobile ? "h-5 w-5" : "h-6 w-6")} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={cn("font-semibold text-foreground", isMobile ? "text-base" : "text-xl")}>
                      Plan {currentPlanData?.name}
                    </h3>
                    <Badge className="bg-success/10 text-success">Activo</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm mb-2">
                    {currentPlanData?.description}
                  </p>
                  <div className={cn(
                    "flex items-center gap-2 md:gap-4 text-sm",
                    isMobile && "flex-col items-start"
                  )}>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                      <Calendar className="h-4 w-4" />
                      Próximo cobro: {format(mockBilling.nextBillingDate, 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className={cn("font-semibold text-primary", isMobile ? "text-xl" : "text-2xl")}>
                      {formatCurrency(currentPlanData?.price, currentPlanData?.currency)}
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangePlanOpen(true)}
                  className={cn(isMobile && "h-11")}
                >
                  Cambiar Plan
                </Button>
                <Button 
                  variant="outline" 
                  className={cn("text-destructive hover:text-destructive", isMobile && "h-11")}
                >
                  Cancelar Suscripción
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Payment Method */}
          <Card className="lg:col-span-1 border-border">
            <CardHeader className={cn(isMobile && "pb-3")}>
              <CardTitle className="text-sm md:text-base flex items-center gap-2 text-foreground">
                <CreditCard className="h-4 w-4" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={cn("rounded-lg bg-secondary border border-border", isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-6 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expira 12/26</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Principal</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                className={cn("w-full", isMobile && "h-11")}
                onClick={() => setIsPaymentMethodOpen(true)}
              >
                Cambiar Método
              </Button>
            </CardContent>
          </Card>

          {/* Billing Info */}
          <Card className="lg:col-span-2 border-border">
            <CardHeader className={cn(isMobile && "pb-3")}>
              <CardTitle className="text-sm md:text-base flex items-center gap-2 text-foreground">
                <Building className="h-4 w-4" />
                Información de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Razón Social</p>
                  <p className="text-sm font-medium text-foreground">{billingInfo.companyName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">RUT</p>
                  <p className="text-sm font-medium text-foreground">{billingInfo.taxId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="text-sm font-medium text-foreground">{billingInfo.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email de Facturación</p>
                  <p className="text-sm font-medium text-foreground truncate">{billingInfo.billingEmail}</p>
                </div>
              </div>
              <Button 
                variant="link" 
                className="mt-3 md:mt-4 p-0 h-auto text-primary text-sm"
                onClick={() => {
                  setEditingBillingInfo(billingInfo);
                  setIsBillingInfoOpen(true);
                }}
              >
                Editar información <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Billing History */}
        <Card className="border-border">
          <CardHeader className={cn(isMobile && "pb-3")}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base flex items-center gap-2 text-foreground">
                <Receipt className="h-4 w-4" />
                Historial de Pagos
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {!isMobile && "Exportar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockBilling.history.map((record) => (
                <div 
                  key={record.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg bg-secondary hover:bg-secondary/80 active:bg-secondary transition-colors",
                    isMobile ? "p-3" : "p-4"
                  )}
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="hidden sm:flex w-10 h-10 rounded-lg bg-background items-center justify-center border border-border shrink-0">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Factura #{record.id.replace('inv-', '').padStart(4, '0')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(record.date, isMobile ? 'dd MMM yy' : 'dd MMMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(record.amount, 'USD')}</p>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        {getStatusIcon(record.status)}
                        <span className={cn(
                          record.status === 'paid' ? 'text-success' :
                          record.status === 'pending' ? 'text-warning' : 'text-destructive'
                        )}>
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
      </div>

      {/* Change Plan - Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="text-left mb-2">
              <SheetTitle>Cambiar Plan</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-120px)]">
              <PlanSelector />
            </ScrollArea>
            <SheetFooter className="flex-row gap-3 pt-4 border-t border-border mt-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setIsChangePlanOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-12"
                disabled={selectedPlan === currentPlan}
                onClick={handleConfirmPlanChange}
              >
                {selectedPlan === currentPlan ? 'Plan Actual' : 'Confirmar'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cambiar Plan</DialogTitle>
            </DialogHeader>
            <PlanSelector />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangePlanOpen(false)}>
                Cancelar
              </Button>
              <Button 
                disabled={selectedPlan === currentPlan}
                onClick={handleConfirmPlanChange}
              >
                {selectedPlan === currentPlan ? 'Plan Actual' : 'Confirmar Cambio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Method - Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={isPaymentMethodOpen} onOpenChange={setIsPaymentMethodOpen}>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle>Actualizar Método de Pago</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-4">
              <RadioGroup defaultValue="card" className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-secondary">
                  <RadioGroupItem value="card" id="card-mobile" />
                  <Label htmlFor="card-mobile" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5" />
                    <span>Tarjeta de Crédito/Débito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-secondary">
                  <RadioGroupItem value="transfer" id="transfer-mobile" />
                  <Label htmlFor="transfer-mobile" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Building className="h-5 w-5" />
                    <span>Transferencia Bancaria</span>
                  </Label>
                </div>
              </RadioGroup>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Número de Tarjeta</Label>
                  <Input placeholder="1234 5678 9012 3456" className="h-12" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiración</Label>
                    <Input placeholder="MM/AA" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>CVV</Label>
                    <Input placeholder="123" type="password" className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre en la Tarjeta</Label>
                  <Input placeholder="NOMBRE APELLIDO" className="h-12" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Tu información de pago está protegida con encriptación SSL</span>
              </div>
            </div>
            <SheetFooter className="flex-row gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setIsPaymentMethodOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 h-12" onClick={() => setIsPaymentMethodOpen(false)}>
                Guardar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isPaymentMethodOpen} onOpenChange={setIsPaymentMethodOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actualizar Método de Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup defaultValue="card" className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-secondary">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5" />
                    <span>Tarjeta de Crédito/Débito</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-secondary">
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
      )}

      {/* Edit Billing Info Modal */}
      {isMobile ? (
        <Sheet open={isBillingInfoOpen} onOpenChange={setIsBillingInfoOpen}>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle>Editar Información de Facturación</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Razón Social</Label>
                <Input 
                  value={editingBillingInfo.companyName}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, companyName: e.target.value})}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>RUT / NIT</Label>
                <Input 
                  value={editingBillingInfo.taxId}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, taxId: e.target.value})}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input 
                  value={editingBillingInfo.address}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, address: e.target.value})}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label>Email de Facturación</Label>
                <Input 
                  type="email"
                  value={editingBillingInfo.billingEmail}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, billingEmail: e.target.value})}
                  placeholder="facturas@empresa.com"
                />
              </div>
            </div>
            <SheetFooter className="flex-row gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setIsBillingInfoOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-12"
                onClick={handleSaveBillingInfo}
              >
                Guardar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isBillingInfoOpen} onOpenChange={setIsBillingInfoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Información de Facturación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Razón Social</Label>
                <Input 
                  value={editingBillingInfo.companyName}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, companyName: e.target.value})}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>RUT / NIT</Label>
                <Input 
                  value={editingBillingInfo.taxId}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, taxId: e.target.value})}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input 
                  value={editingBillingInfo.address}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, address: e.target.value})}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label>Email de Facturación</Label>
                <Input 
                  type="email"
                  value={editingBillingInfo.billingEmail}
                  onChange={(e) => setEditingBillingInfo({...editingBillingInfo, billingEmail: e.target.value})}
                  placeholder="facturas@empresa.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBillingInfoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBillingInfo}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
};

export default Billing;
