import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Shield } from "lucide-react";
import type { PoliciesSettings } from "@/lib/types";

interface PoliciesSectionProps {
  settings: PoliciesSettings;
  onChange: (settings: PoliciesSettings) => void;
}

export function PoliciesSection({ settings, onChange }: PoliciesSectionProps) {
  const handleChange = (field: keyof Omit<PoliciesSettings, "lastModified">, value: string) => {
    onChange({
      ...settings,
      [field]: value,
      lastModified: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Tip */}
      <Alert className="bg-primary/5 border-primary/20">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Consejo:</strong> Mantén tus políticas claras y concisas. Evita textos legales complejos 
          que puedan confundir al cliente. El agente usará esta información para responder consultas.
        </AlertDescription>
      </Alert>

      {/* Políticas generales */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Políticas y servicios
          </CardTitle>
          <CardDescription>
            Reglas generales que el agente debe comunicar a los clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={settings.generalPolicies}
            onChange={(e) => handleChange("generalPolicies", e.target.value)}
            placeholder="Escribe las políticas principales de tu negocio...

Ejemplos:
- Tiempo de espera máximo antes de perder la cita
- Requisitos para acceder al servicio
- Reglas de comportamiento
- Políticas de precios"
            className="min-h-[180px] bg-muted/30 border-border"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sé claro y directo</span>
            <span>{settings.generalPolicies.length} / 2000 caracteres</span>
          </div>
        </CardContent>
      </Card>

      {/* Garantías */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Garantías de satisfacción</CardTitle>
          <CardDescription>
            Define qué garantías ofreces a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={settings.guarantees}
            onChange={(e) => handleChange("guarantees", e.target.value)}
            placeholder="Describe las garantías que ofreces...

Ejemplos:
- Política de devolución o reembolso
- Correcciones gratuitas
- Tiempo de garantía
- Condiciones para aplicar la garantía"
            className="min-h-[150px] bg-muted/30 border-border"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Genera confianza siendo transparente</span>
            <span>{settings.guarantees.length} / 1500 caracteres</span>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ejemplo de respuesta del agente</CardTitle>
          <CardDescription>
            Así usará el agente esta información
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                <p className="text-sm">¿Qué pasa si no quedo satisfecho con el servicio?</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                <p className="text-sm">
                  ¡Buena pregunta! 😊 {settings.guarantees 
                    ? settings.guarantees.slice(0, 200) + (settings.guarantees.length > 200 ? "..." : "")
                    : "Ofrecemos garantía de satisfacción en todos nuestros servicios. Si no quedas conforme, trabajaremos para solucionarlo."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
