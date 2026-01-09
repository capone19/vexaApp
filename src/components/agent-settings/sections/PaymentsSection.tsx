import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, QrCode, Banknote, Link as LinkIcon, Wallet } from "lucide-react";
import type { PaymentSettings, PaymentMethod } from "@/lib/types";

interface PaymentsSectionProps {
  settings: PaymentSettings;
  onChange: (settings: PaymentSettings) => void;
}

const paymentMethodConfig: Record<
  PaymentMethod["type"],
  { label: string; icon: React.ElementType; description: string }
> = {
  qr: { label: "Código QR", icon: QrCode, description: "Pago escaneando QR" },
  transferencia: { label: "Transferencia", icon: Wallet, description: "Transferencia bancaria" },
  efectivo: { label: "Efectivo", icon: Banknote, description: "Pago en efectivo" },
  tarjeta: { label: "Tarjeta", icon: CreditCard, description: "Débito o crédito" },
  link: { label: "Link de pago", icon: LinkIcon, description: "Enlace para pagar online" },
  otro: { label: "Otro", icon: Wallet, description: "Otro método" },
};

const defaultMethods: PaymentMethod[] = [
  { type: "qr", enabled: false },
  { type: "transferencia", enabled: true, details: "Banco Estado - Cta. Vista 123456789" },
  { type: "efectivo", enabled: true },
  { type: "tarjeta", enabled: true },
  { type: "link", enabled: false },
  { type: "otro", enabled: false },
];

// Mock services for restrictions
const mockServices = [
  { id: "svc-001", name: "Corte de cabello" },
  { id: "svc-002", name: "Tinte completo" },
  { id: "svc-003", name: "Manicure" },
  { id: "svc-004", name: "Pedicure" },
  { id: "svc-005", name: "Tratamiento capilar" },
];

export function PaymentsSection({ settings, onChange }: PaymentsSectionProps) {
  // Initialize methods if empty
  const methods = settings.methods.length > 0 ? settings.methods : defaultMethods;

  const handleMethodToggle = (type: PaymentMethod["type"], enabled: boolean) => {
    const newMethods = methods.map((m) =>
      m.type === type ? { ...m, enabled } : m
    );
    onChange({ ...settings, methods: newMethods, lastModified: new Date() });
  };

  const handleMethodDetails = (type: PaymentMethod["type"], details: string) => {
    const newMethods = methods.map((m) =>
      m.type === type ? { ...m, details } : m
    );
    onChange({ ...settings, methods: newMethods, lastModified: new Date() });
  };

  const handleInstructionsChange = (instructions: string) => {
    onChange({ ...settings, instructions, lastModified: new Date() });
  };

  const handleRestrictionChange = (
    serviceId: string,
    methodType: PaymentMethod["type"],
    allowed: boolean
  ) => {
    const currentRestriction = settings.restrictions.find((r) => r.serviceId === serviceId);
    let newRestrictions = [...settings.restrictions];

    if (currentRestriction) {
      const newAllowedMethods = allowed
        ? [...currentRestriction.allowedMethods, methodType]
        : currentRestriction.allowedMethods.filter((m) => m !== methodType);

      newRestrictions = newRestrictions.map((r) =>
        r.serviceId === serviceId ? { ...r, allowedMethods: newAllowedMethods } : r
      );
    } else {
      newRestrictions.push({
        serviceId,
        allowedMethods: allowed ? [methodType] : [],
      });
    }

    onChange({ ...settings, restrictions: newRestrictions, lastModified: new Date() });
  };

  const isMethodAllowedForService = (serviceId: string, methodType: PaymentMethod["type"]) => {
    const restriction = settings.restrictions.find((r) => r.serviceId === serviceId);
    if (!restriction) return true; // If no restriction, all methods allowed
    return restriction.allowedMethods.includes(methodType);
  };

  const enabledMethods = methods.filter((m) => m.enabled);

  return (
    <div className="space-y-6">
      {/* Métodos de pago */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Métodos de pago aceptados
          </CardTitle>
          <CardDescription>
            Selecciona los métodos de pago que aceptas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((method) => {
            const config = paymentMethodConfig[method.type];
            const Icon = config.icon;

            return (
              <div
                key={method.type}
                className={`rounded-lg border p-4 transition-colors ${
                  method.enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      method.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{config.label}</h4>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={(checked) => handleMethodToggle(method.type, checked)}
                      />
                    </div>
                    {method.enabled && method.type !== "efectivo" && (
                      <Input
                        value={method.details || ""}
                        onChange={(e) => handleMethodDetails(method.type, e.target.value)}
                        placeholder={
                          method.type === "qr"
                            ? "URL de la imagen del QR"
                            : method.type === "transferencia"
                            ? "Datos bancarios (banco, tipo cuenta, número)"
                            : method.type === "link"
                            ? "URL del link de pago"
                            : "Detalles adicionales"
                        }
                        className="bg-muted/30 border-border"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Restricciones por servicio */}
      {enabledMethods.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Restricciones por servicio</CardTitle>
            <CardDescription>
              Define qué métodos de pago están disponibles para cada servicio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Servicio</TableHead>
                  {enabledMethods.map((method) => (
                    <TableHead key={method.type} className="text-center">
                      {paymentMethodConfig[method.type].label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockServices.map((service) => (
                  <TableRow key={service.id} className="border-border">
                    <TableCell className="font-medium">{service.name}</TableCell>
                    {enabledMethods.map((method) => (
                      <TableCell key={method.type} className="text-center">
                        <Checkbox
                          checked={isMethodAllowedForService(service.id, method.type)}
                          onCheckedChange={(checked) =>
                            handleRestrictionChange(service.id, method.type, checked as boolean)
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">
              Deja todos marcados si no hay restricciones
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones generales */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Instrucciones de pago</CardTitle>
          <CardDescription>
            Información adicional que el agente debe comunicar sobre pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="Ej: El pago debe realizarse antes del servicio. Para transferencias, enviar comprobante por WhatsApp..."
            className="min-h-[120px] bg-muted/30 border-border"
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ejemplo de respuesta del agente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                <p className="text-sm">¿Cómo puedo pagar?</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                <p className="text-sm">
                  ¡Claro! Aceptamos los siguientes métodos de pago: {" "}
                  {enabledMethods.length > 0
                    ? enabledMethods.map((m) => paymentMethodConfig[m.type].label).join(", ")
                    : "Consulta nuestros métodos disponibles"
                  }.
                  {settings.instructions && (
                    <> {settings.instructions.slice(0, 100)}{settings.instructions.length > 100 ? "..." : ""}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
