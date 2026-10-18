// ============================================
// VEXA - Página de Créditos de Mensajería
// ============================================

import { useNavigate } from 'react-router-dom';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMessagingCredits } from "@/hooks/use-messaging-credits";
import { MESSAGE_PRICES, MESSAGE_PRICE_LABELS, formatPrice } from "@/lib/messaging-pricing";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Gift,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketingCredits() {
  const navigate = useNavigate();
  const {
    balance,
    totalPurchased,
    totalConsumed,
    transactions,
    monthlyStats,
    isLoading,
    isLoadingStats,
    refetchAll,
  } = useMessagingCredits();

  // Determinar color del saldo
  const getBalanceColor = () => {
    if (balance >= 50) return "text-green-500";
    if (balance >= 10) return "text-yellow-500";
    return "text-red-500";
  };

  const getBalanceBg = () => {
    if (balance >= 50) return "from-green-500/10 to-green-500/5";
    if (balance >= 10) return "from-yellow-500/10 to-yellow-500/5";
    return "from-red-500/10 to-red-500/5";
  };

  // Icono según tipo de transacción
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "consumption":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case "refund":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "bonus":
        return <Gift className="h-4 w-4 text-purple-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "deposit":
        return "Depósito";
      case "consumption":
        return "Consumo";
      case "refund":
        return "Reembolso";
      case "bonus":
        return "Bonificación";
      default:
        return type;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <PageHeader
          title="Créditos de Mensajería"
          subtitle="Administra tu saldo para envío de mensajes WhatsApp"
        />

        {/* Dashboard de Créditos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Saldo Actual */}
          <Card className={cn("bg-gradient-to-br border-0", getBalanceBg())}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tu Saldo Actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-32" />
              ) : (
                <div className="space-y-2">
                  <p className={cn("text-4xl font-bold", getBalanceColor())}>
                    ${balance.toFixed(2)}
                    <span className="text-lg font-normal text-muted-foreground ml-1">USD</span>
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate('/marketing/comprar-creditos')}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    ¿Cómo agregar créditos?
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Comprado */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Total Depositado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-semibold text-green-600">
                  +${totalPurchased.toFixed(2)} USD
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Consumido */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Total Consumido
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-semibold text-red-600">
                  -${totalConsumed.toFixed(2)} USD
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Precios y Uso del Mes */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tabla de Precios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Precios por Mensaje
              </CardTitle>
              <CardDescription>
                Costo por cada mensaje enviado según su categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Mensaje</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(MESSAGE_PRICES).map(([key, price]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        {MESSAGE_PRICE_LABELS[key] || key}
                      </TableCell>
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

          {/* Uso Este Mes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Uso Este Mes
              </CardTitle>
              <CardDescription>
                Resumen de mensajes enviados en el período actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : monthlyStats ? (
                <div className="space-y-4">
                  {/* Marketing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-sm">Marketing</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{monthlyStats.marketing.count} mensajes</span>
                      <span className="text-muted-foreground ml-2">
                        (${monthlyStats.marketing.cost.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Utility */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm">Utilidad</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{monthlyStats.utility.count} mensajes</span>
                      <span className="text-muted-foreground ml-2">
                        (${monthlyStats.utility.cost.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm">Autenticación</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{monthlyStats.authentication.count} mensajes</span>
                      <span className="text-muted-foreground ml-2">
                        (${monthlyStats.authentication.cost.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total del mes</span>
                      <div>
                        <span>{monthlyStats.totalMessages} mensajes</span>
                        <span className="text-red-600 ml-2">
                          (-${monthlyStats.totalSpent.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay datos de uso para este mes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historial de Transacciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>
                Registro de todos los movimientos de créditos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchAll()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay transacciones registradas</p>
                <p className="text-sm mt-1">
                  Los movimientos de créditos aparecerán aquí
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {format(new Date(tx.created_at), "d MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          <span className="text-sm">{getTransactionLabel(tx.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            tx.type === "consumption" ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {tx.type === "consumption" ? "-" : "+"}${Math.abs(tx.amount_usd).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description || (
                          tx.message_count
                            ? `${tx.message_count} mensaje${tx.message_count > 1 ? "s" : ""} ${tx.message_type || ""}`
                            : "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${tx.balance_after.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info de cómo agregar créditos */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">¿Cómo agregar créditos?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recarga tu saldo para enviar mensajes de WhatsApp a tus clientes.
                  Los créditos no expiran y puedes usarlos cuando quieras.
                </p>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/marketing/comprar-creditos')}
                >
                  Comprar Créditos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
