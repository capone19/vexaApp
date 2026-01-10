import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, AlertTriangle, MessageSquare, UserX } from "lucide-react";
import type { InterventionSettings, InterventionCondition, UnqualifiedLeadHandlingType } from "@/lib/types";

interface InterventionSectionProps {
  settings: InterventionSettings;
  onChange: (settings: InterventionSettings) => void;
}

const defaultConditions: InterventionCondition[] = [
  { id: "explicit_request", label: "El cliente solicita hablar con un humano", enabled: true },
  { id: "complaint", label: "Detecta un reclamo o conflicto", enabled: true },
  { id: "out_of_scope", label: "La consulta está fuera del alcance del agente", enabled: true },
  { id: "priority_client", label: "El cliente es marcado como prioritario", enabled: false },
  { id: "payment_issue", label: "Problemas con pagos o reembolsos", enabled: true },
  { id: "negative_sentiment", label: "Detecta sentimiento negativo persistente", enabled: false },
];

export function InterventionSection({ settings, onChange }: InterventionSectionProps) {
  // Initialize conditions if empty
  const conditions = settings.conditions.length > 0 ? settings.conditions : defaultConditions;

  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...settings,
      enabled,
      conditions: enabled ? conditions : [],
      lastModified: new Date(),
    });
  };

  const handleConditionToggle = (conditionId: string, enabled: boolean) => {
    const newConditions = conditions.map((c) =>
      c.id === conditionId ? { ...c, enabled } : c
    );
    onChange({ ...settings, conditions: newConditions, lastModified: new Date() });
  };

  const handleCustomRulesChange = (customRules: string) => {
    onChange({ ...settings, customRules, lastModified: new Date() });
  };

  const enabledConditionsCount = conditions.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Switch principal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Intervención asistida</CardTitle>
                <CardDescription>
                  Permite que el agente transfiera la conversación a un humano
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>
        </CardHeader>

        {settings.enabled && (
          <CardContent>
            <Alert className="bg-primary/5 border-primary/20">
              <MessageSquare className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Cuando se active la intervención, el chat se marcará como "Intervención humana" 
                en la sección de Chats y recibirás una notificación.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Condiciones */}
      {settings.enabled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Condiciones de activación</CardTitle>
            <CardDescription>
              El agente solicitará intervención humana cuando se cumplan estas condiciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.map((condition) => (
              <div
                key={condition.id}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  condition.enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/10"
                }`}
              >
                <Checkbox
                  id={condition.id}
                  checked={condition.enabled}
                  onCheckedChange={(checked) =>
                    handleConditionToggle(condition.id, checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={condition.id}
                    className={`font-medium cursor-pointer ${
                      condition.enabled ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {condition.label}
                  </Label>
                </div>
              </div>
            ))}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {enabledConditionsCount} condición{enabledConditionsCount !== 1 ? "es" : ""} activa{enabledConditionsCount !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manejo de leads no calificados */}
      {settings.enabled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-warning" />
              Manejo de leads no calificados
            </CardTitle>
            <CardDescription>
              ¿Qué hacer con conversaciones que no cumplen criterios mínimos?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              value={settings.unqualifiedLeadHandling} 
              onValueChange={(v) => onChange({ 
                ...settings, 
                unqualifiedLeadHandling: v as UnqualifiedLeadHandlingType, 
                lastModified: new Date() 
              })}
            >
              <SelectTrigger className="w-full max-w-md bg-muted/30 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responder_cerrar">Responder y cerrar conversación</SelectItem>
                <SelectItem value="ofrecer_alternativa">Ofrecer alternativa o información general</SelectItem>
                <SelectItem value="derivar_humano">Derivar a humano para evaluación</SelectItem>
                <SelectItem value="finalizar_educadamente">Finalizar conversación educadamente</SelectItem>
              </SelectContent>
            </Select>
            <Alert className="bg-info/10 border-info/30">
              <MessageSquare className="h-4 w-4 text-info" />
              <AlertDescription className="text-sm">
                Esto evita escalar conversaciones que no cumplen criterios mínimos de calificación, 
                ahorrando tiempo del equipo humano.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Reglas personalizadas */}
      {settings.enabled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Reglas personalizadas</CardTitle>
            <CardDescription>
              Define reglas adicionales en lenguaje natural
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={settings.customRules}
              onChange={(e) => handleCustomRulesChange(e.target.value)}
              placeholder="Ejemplos:
- Si el cliente menciona 'urgente' más de una vez, solicitar intervención
- Si la conversación supera los 15 mensajes sin resolución, escalar
- Si el cliente menciona problemas legales, transferir inmediatamente"
              className="min-h-[150px] bg-muted/30 border-border"
            />
            <p className="text-xs text-muted-foreground">
              Estas reglas se evaluarán durante la conversación
            </p>
          </CardContent>
        </Card>
      )}

      {/* Advertencia si está desactivado */}
      {!settings.enabled && (
        <Alert className="bg-warning/10 border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>Advertencia:</strong> Con la intervención desactivada, el agente no podrá 
            transferir conversaciones a humanos, incluso si el cliente lo solicita explícitamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {settings.enabled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Ejemplo de intervención</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-end">
                <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                  <p className="text-sm">Esto es inaceptable, quiero hablar con alguien de verdad</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-warning/10 border border-warning/30 rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                  <p className="text-sm">
                    Entiendo tu frustración y lamento que hayas tenido esta experiencia. 
                    Voy a transferir esta conversación a un miembro de nuestro equipo que 
                    podrá ayudarte mejor. Te contactarán en breve. 🙏
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-muted border border-border rounded-full px-4 py-1.5">
                  <p className="text-xs text-muted-foreground">
                    ⚡ Intervención humana activada
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
