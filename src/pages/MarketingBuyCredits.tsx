// ============================================
// VEXA - Página de Compra de Créditos
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Wallet,
  MessageSquare,
  Gift,
  ArrowLeft,
  Mail,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { useMessagingCredits } from '@/hooks/use-messaging-credits';
import { MESSAGE_PRICES, MESSAGE_PRICE_LABELS, formatPrice } from '@/lib/messaging-pricing';
import { cn } from '@/lib/utils';

// Paquetes de créditos disponibles
const CREDIT_PACKAGES = [
  { amount: 20, bonus: 0, popular: false },
  { amount: 50, bonus: 0, popular: true },
  { amount: 100, bonus: 0, popular: false },
  { amount: 200, bonus: 10, popular: false }, // 10% bonus
];

export default function MarketingBuyCredits() {
  const navigate = useNavigate();
  const { balance, isLoading } = useMessagingCredits();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');

  // Calcular monto final con bonus
  const getPackageDetails = (amount: number) => {
    const pkg = CREDIT_PACKAGES.find((p) => p.amount === amount);
    const bonus = pkg?.bonus || 0;
    const bonusAmount = (amount * bonus) / 100;
    return {
      base: amount,
      bonus: bonusAmount,
      total: amount + bonusAmount,
      bonusPercent: bonus,
    };
  };

  const currentDetails = selectedAmount
    ? getPackageDetails(selectedAmount)
    : customAmount
    ? { base: parseFloat(customAmount) || 0, bonus: 0, total: parseFloat(customAmount) || 0, bonusPercent: 0 }
    : null;

  // Calcular mensajes aproximados con $0.15 (marketing)
  const estimatedMessages = currentDetails ? Math.floor(currentDetails.total / 0.15) : 0;

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/creditos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title="Comprar Créditos"
            subtitle="Recarga tu saldo para enviar mensajes WhatsApp"
          />
        </div>

        {/* Saldo Actual */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-0">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tu saldo actual</p>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : `$${balance.toFixed(2)} USD`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Selección de Monto */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Selecciona el monto
                </CardTitle>
                <CardDescription>Elige cuánto quieres recargar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paquetes predefinidos */}
                <div className="grid grid-cols-2 gap-3">
                  {CREDIT_PACKAGES.map((pkg) => {
                    const details = getPackageDetails(pkg.amount);
                    return (
                      <button
                        key={pkg.amount}
                        onClick={() => {
                          setSelectedAmount(pkg.amount);
                          setCustomAmount('');
                        }}
                        className={cn(
                          'relative p-4 rounded-lg border-2 text-left transition-all',
                          selectedAmount === pkg.amount
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        )}
                      >
                        {pkg.popular && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                            Popular
                          </Badge>
                        )}
                        {pkg.bonus > 0 && (
                          <Badge className="absolute -top-2 right-2 bg-green-500">
                            +{pkg.bonus}% bonus
                          </Badge>
                        )}
                        <p className="text-2xl font-bold">${pkg.amount}</p>
                        <p className="text-sm text-muted-foreground">USD</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          ~{Math.floor(details.total / 0.15)} mensajes marketing
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Monto personalizado */}
                <div className="pt-4">
                  <p className="text-sm font-medium mb-2">O ingresa otro monto:</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="Monto"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedAmount(null);
                        }}
                        className="pl-7"
                        min={10}
                      />
                    </div>
                    <span className="flex items-center text-muted-foreground">USD</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Mínimo $10 USD</p>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Precios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Precios por mensaje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(MESSAGE_PRICES).map(([key, price]) => (
                      <TableRow key={key}>
                        <TableCell>{MESSAGE_PRICE_LABELS[key] || key}</TableCell>
                        <TableCell className="text-right">
                          {price === 0 ? (
                            <Badge variant="secondary">Gratis</Badge>
                          ) : (
                            <span className="font-mono">{formatPrice(price)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Resumen y Pago */}
          <div className="space-y-6">
            {/* Resumen de compra */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de compra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentDetails && currentDetails.base > 0 ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Monto base</span>
                        <span>${currentDetails.base.toFixed(2)} USD</span>
                      </div>
                      {currentDetails.bonus > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Bonus ({currentDetails.bonusPercent}%)
                          </span>
                          <span>+${currentDetails.bonus.toFixed(2)} USD</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total en créditos</span>
                        <span className="text-primary">${currentDetails.total.toFixed(2)} USD</span>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <p className="font-medium mb-2">Con este saldo podrás enviar aproximadamente:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• {Math.floor(currentDetails.total / 0.15)} mensajes de Marketing</li>
                        <li>• {Math.floor(currentDetails.total / 0.04)} mensajes de Utilidad</li>
                        <li>• Ilimitados mensajes de Servicio</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Créditos sin fecha de expiración
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Selecciona un monto para ver el resumen</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección de Pago - Mercado Pago (Preparado) */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mercado Pago Button Placeholder */}
                <div className="bg-[#00B1EA]/10 border border-[#00B1EA]/30 rounded-lg p-6 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.6.55/mercadopago/logo__large.png"
                      alt="Mercado Pago"
                      className="h-8"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-[#00B1EA] hover:bg-[#0099CC] text-white"
                    disabled={!currentDetails || currentDetails.base < 10}
                  >
                    Pagar ${currentDetails?.base.toFixed(2) || '0.00'} USD
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Próximamente: Pago automático con Mercado Pago
                  </p>
                </div>

                <Separator />

                {/* Método alternativo */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">
                    Por el momento, para agregar créditos:
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </div>
                      <p>
                        Contacta a nuestro equipo indicando el monto que deseas recargar
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </div>
                      <p>Te enviaremos las instrucciones de pago</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </div>
                      <p>Los créditos se acreditan en minutos después del pago</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/soporte')}>
                      <Mail className="h-4 w-4" />
                      Contactar Soporte
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open('https://wa.me/+521234567890', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
