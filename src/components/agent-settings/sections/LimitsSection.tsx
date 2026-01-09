import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, X, Plus, AlertTriangle, Ban, MessageSquareOff } from "lucide-react";
import type { LimitsSettings } from "@/lib/types";

interface LimitsSectionProps {
  settings: LimitsSettings;
  onChange: (settings: LimitsSettings) => void;
}

export function LimitsSection({ settings, onChange }: LimitsSectionProps) {
  const [newTopic, setNewTopic] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const handleAddTopic = () => {
    if (newTopic.trim() && !settings.prohibitedTopics.includes(newTopic.trim())) {
      onChange({
        ...settings,
        prohibitedTopics: [...settings.prohibitedTopics, newTopic.trim()],
        lastModified: new Date(),
      });
      setNewTopic("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    onChange({
      ...settings,
      prohibitedTopics: settings.prohibitedTopics.filter((t) => t !== topic),
      lastModified: new Date(),
    });
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !settings.avoidedLanguage.includes(newLanguage.trim())) {
      onChange({
        ...settings,
        avoidedLanguage: [...settings.avoidedLanguage, newLanguage.trim()],
        lastModified: new Date(),
      });
      setNewLanguage("");
    }
  };

  const handleRemoveLanguage = (language: string) => {
    onChange({
      ...settings,
      avoidedLanguage: settings.avoidedLanguage.filter((l) => l !== language),
      lastModified: new Date(),
    });
  };

  const handleProhibitedPromisesChange = (prohibitedPromises: string) => {
    onChange({ ...settings, prohibitedPromises, lastModified: new Date() });
  };

  const handleSensitiveInfoToggle = (enabled: boolean) => {
    onChange({
      ...settings,
      sensitiveInfo: { ...settings.sensitiveInfo, enabled },
      lastModified: new Date(),
    });
  };

  const handleSensitiveInfoDescriptionChange = (description: string) => {
    onChange({
      ...settings,
      sensitiveInfo: { ...settings.sensitiveInfo, description },
      lastModified: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Alerta de importancia */}
      <Alert className="bg-destructive/10 border-destructive/30">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm">
          <strong>Importante:</strong> Configurar límites claros reduce errores y protege 
          la reputación de tu marca. El agente evitará estos temas y comportamientos.
        </AlertDescription>
      </Alert>

      {/* Temas prohibidos */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Temas prohibidos
          </CardTitle>
          <CardDescription>
            El agente no hablará sobre estos temas y redirigirá la conversación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.prohibitedTopics.map((topic) => (
              <Badge
                key={topic}
                variant="destructive"
                className="px-3 py-1.5 gap-2 bg-destructive/20 text-destructive border-destructive/30"
              >
                {topic}
                <button onClick={() => handleRemoveTopic(topic)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {settings.prohibitedTopics.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No hay temas prohibidos configurados
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Ej: Política, Religión, Competencia..."
              className="bg-muted/30 border-border"
              onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
            />
            <Button onClick={handleAddTopic} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promesas prohibidas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Promesas que no puede hacer
          </CardTitle>
          <CardDescription>
            Compromisos que el agente NO debe asumir bajo ninguna circunstancia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.prohibitedPromises}
            onChange={(e) => handleProhibitedPromisesChange(e.target.value)}
            placeholder="Ejemplos:
- No puede prometer descuentos sin autorización
- No puede garantizar resultados específicos
- No puede comprometer tiempos de entrega exactos
- No puede ofrecer reembolsos fuera de política"
            className="min-h-[150px] bg-muted/30 border-border"
          />
        </CardContent>
      </Card>

      {/* Información sensible */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-cyan-500" />
              <div>
                <CardTitle>Protección de información sensible</CardTitle>
                <CardDescription>
                  El agente no solicitará ni almacenará esta información
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.sensitiveInfo.enabled}
              onCheckedChange={handleSensitiveInfoToggle}
            />
          </div>
        </CardHeader>

        {settings.sensitiveInfo.enabled && (
          <CardContent>
            <Textarea
              value={settings.sensitiveInfo.description}
              onChange={(e) => handleSensitiveInfoDescriptionChange(e.target.value)}
              placeholder="Describe qué información es sensible para tu negocio...

Ejemplos:
- Números de tarjeta de crédito completos
- Contraseñas o PINs
- Información médica detallada
- Documentos de identidad"
              className="min-h-[120px] bg-muted/30 border-border"
            />
          </CardContent>
        )}
      </Card>

      {/* Lenguaje a evitar */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareOff className="h-5 w-5 text-orange-500" />
            Lenguaje a evitar
          </CardTitle>
          <CardDescription>
            Palabras o frases que el agente no debe usar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.avoidedLanguage.map((language) => (
              <Badge
                key={language}
                variant="outline"
                className="px-3 py-1.5 gap-2 bg-orange-500/10 text-orange-500 border-orange-500/30"
              >
                {language}
                <button onClick={() => handleRemoveLanguage(language)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {settings.avoidedLanguage.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No hay lenguaje prohibido configurado
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Ej: barato, problema, no podemos..."
              className="bg-muted/30 border-border"
              onKeyDown={(e) => e.key === "Enter" && handleAddLanguage()}
            />
            <Button onClick={handleAddLanguage} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            El agente buscará alternativas más positivas o neutras
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ejemplo de límite en acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                <p className="text-sm">
                  {settings.prohibitedTopics.length > 0
                    ? `¿Qué opinas sobre ${settings.prohibitedTopics[0]}?`
                    : "¿Puedes garantizarme que el resultado será perfecto?"}
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                <p className="text-sm">
                  {settings.prohibitedTopics.length > 0
                    ? `Prefiero no opinar sobre ese tema. 😊 ¿Te puedo ayudar con algo relacionado a nuestros servicios?`
                    : "Nos esforzamos por ofrecer el mejor servicio posible. Aunque no puedo garantizar resultados específicos, nuestro equipo está altamente capacitado y tenemos excelentes comentarios de nuestros clientes. ¿Te gustaría agendar una consulta?"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
