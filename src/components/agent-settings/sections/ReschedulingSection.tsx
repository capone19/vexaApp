import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import type { ReschedulingSettings } from "@/lib/types";

interface ReschedulingSectionProps {
  settings: ReschedulingSettings;
  onChange: (settings: ReschedulingSettings) => void;
}

export function ReschedulingSection({ settings, onChange }: ReschedulingSectionProps) {
  const handleChange = <K extends keyof ReschedulingSettings>(
    field: K,
    value: ReschedulingSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value,
      lastModified: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Re-agendamientos */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Re-agendamientos</CardTitle>
                <CardDescription>
                  Permite a los clientes cambiar la fecha de su cita
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.allowRescheduling}
              onCheckedChange={(checked) => handleChange("allowRescheduling", checked)}
            />
          </div>
        </CardHeader>

        {settings.allowRescheduling && (
          <CardContent className="space-y-6">
            {/* Plazo */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Plazo mínimo para reagendar</Label>
                <span className="text-sm text-primary font-medium">
                  {settings.reschedulingDeadline} horas antes
                </span>
              </div>
              <Slider
                value={[settings.reschedulingDeadline]}
                onValueChange={([value]) => handleChange("reschedulingDeadline", value)}
                max={72}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 hora</span>
                <span>24 horas</span>
                <span>48 horas</span>
                <span>72 horas</span>
              </div>
            </div>

            {/* Condiciones */}
            <div className="space-y-2">
              <Label>Condiciones de re-agendamiento</Label>
              <Textarea
                value={settings.reschedulingConditions}
                onChange={(e) => handleChange("reschedulingConditions", e.target.value)}
                placeholder="Describe las condiciones para reagendar..."
                className="min-h-[100px] bg-muted/30 border-border"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cancelaciones */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle>Cancelaciones</CardTitle>
                <CardDescription>
                  Define las reglas para cancelar citas
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.allowCancellation}
              onCheckedChange={(checked) => handleChange("allowCancellation", checked)}
            />
          </div>
        </CardHeader>

        {settings.allowCancellation && (
          <CardContent className="space-y-6">
            {/* Plazo de cancelación */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Plazo mínimo para cancelar</Label>
                <span className="text-sm text-primary font-medium">
                  {settings.cancellationDeadline} horas antes
                </span>
              </div>
              <Slider
                value={[settings.cancellationDeadline]}
                onValueChange={([value]) => handleChange("cancellationDeadline", value)}
                max={72}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Penalización */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Penalización por cancelación tardía</Label>
                <span className="text-sm text-warning font-medium">
                  {settings.cancellationPenalty}%
                </span>
              </div>
              <Slider
                value={[settings.cancellationPenalty]}
                onValueChange={([value]) => handleChange("cancellationPenalty", value)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (sin penalización)</span>
                <span>50%</span>
                <span>100% (cobro total)</span>
              </div>
            </div>

            {settings.cancellationPenalty > 0 && (
              <Alert className="bg-warning/10 border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  Si el cliente cancela con menos de {settings.cancellationDeadline} horas de anticipación,
                  se le cobrará el {settings.cancellationPenalty}% del valor del servicio.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Devoluciones */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-cyan-500" />
              <div>
                <CardTitle>Devoluciones</CardTitle>
                <CardDescription>
                  ¿Aplican devoluciones en caso de cancelación?
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.refundApplies}
              onCheckedChange={(checked) => handleChange("refundApplies", checked)}
            />
          </div>
        </CardHeader>

        {settings.refundApplies && (
          <CardContent>
            <div className="space-y-2">
              <Label>Condiciones de devolución</Label>
              <Textarea
                value={settings.refundConditions}
                onChange={(e) => handleChange("refundConditions", e.target.value)}
                placeholder="Describe cuándo y cómo aplican las devoluciones..."
                className="min-h-[120px] bg-muted/30 border-border"
              />
              <p className="text-xs text-muted-foreground">
                Sé claro sobre plazos, montos y métodos de devolución
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Preview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ejemplo de respuesta del agente</CardTitle>
          <CardDescription>
            Así explicará el agente las políticas de cancelación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                <p className="text-sm">Necesito cancelar mi cita de mañana</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                <p className="text-sm">
                  {settings.allowCancellation
                    ? `Entiendo. ${settings.cancellationPenalty > 0 
                        ? `Ten en cuenta que las cancelaciones con menos de ${settings.cancellationDeadline} horas tienen un cargo del ${settings.cancellationPenalty}% del servicio.`
                        : `Puedes cancelar hasta ${settings.cancellationDeadline} horas antes sin costo.`}
                      ${settings.allowRescheduling ? " ¿Prefieres reagendar para otra fecha?" : ""}`
                    : "Lo siento, actualmente no aceptamos cancelaciones. Te recomiendo comunicarte directamente con nosotros para ver opciones."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
