import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Target } from "lucide-react";
import type { PersonalitySettings } from "@/lib/types";
import { CustomInstructionsSection } from "../CustomInstructionsSection";
import { SalesFlowSection } from "../SalesFlowSection";

interface PersonalitySectionProps {
  settings: PersonalitySettings;
  onChange: (settings: PersonalitySettings) => void;
}

const formalityLabels = ["Muy informal", "Informal", "Neutral", "Formal", "Muy formal"];
const formalityValues: PersonalitySettings["formality"][] = ["muy_informal", "informal", "neutral", "formal", "muy_formal"];

const empathyLabels = ["Baja", "Media", "Alta"];
const empathyValues: PersonalitySettings["empathy"][] = ["baja", "media", "alta"];

const humorLabels = ["Ausente", "Sutil", "Moderado", "Marcado"];
const humorValues: PersonalitySettings["humor"][] = ["ausente", "sutil", "moderado", "marcado"];

const emojiLabels = ["Nunca", "Ocasional", "Frecuente"];
const emojiValues: PersonalitySettings["emojis"][] = ["nunca", "ocasional", "frecuente"];

const responseLengthLabels = ["Corta", "Media", "Extensa"];
const responseLengthDescriptions = ["1-2 párrafos", "3-4 párrafos", "4+ párrafos"];
const responseLengthValues: PersonalitySettings["responseLength"][] = ["corta", "media", "extensa"];

const objectiveLabels: Record<PersonalitySettings["primaryObjective"], string> = {
  agendar: "Agendar citas",
  vender: "Vender servicios",
  calificar: "Calificar leads",
  informar: "Informar / Soporte",
  mixto: "Mixto",
};

// Generate preview responses based on personality settings
const getPreviewResponses = (settings: PersonalitySettings): string[] => {
  const { formality, empathy, humor, emojis, primaryObjective } = settings;
  
  const emoji = emojis === "frecuente" ? " 😊💅✨" : emojis === "ocasional" ? " 😊" : "";
  const greeting = formality === "muy_formal" ? "Estimado/a cliente" 
    : formality === "formal" ? "Buen día"
    : formality === "neutral" ? "Hola"
    : formality === "informal" ? "¡Hola!"
    : "¡Hey! ¿Qué tal?";
  
  const empathyPhrase = empathy === "alta" 
    ? "Entiendo perfectamente tu situación y me encantaría ayudarte."
    : empathy === "media"
    ? "Claro, puedo ayudarte con eso."
    : "Puedo asistirte.";

  const humorPhrase = humor === "marcado"
    ? " ¡Prometemos dejarte guapísimo/a!"
    : humor === "moderado"
    ? " ¡Te va a encantar!"
    : humor === "sutil"
    ? " Estoy seguro/a de que quedarás satisfecho/a."
    : "";

  // Closing based on objective
  let closing = "";
  if (primaryObjective === "agendar") {
    closing = "¿Te gustaría que agendemos tu cita ahora?";
  } else if (primaryObjective === "vender") {
    closing = "¿Te gustaría conocer más sobre este servicio?";
  } else if (primaryObjective === "calificar") {
    closing = "¿Me compartes tu nombre y número para contactarte?";
  } else {
    closing = "¿Hay algo más en lo que pueda ayudarte?";
  }

  return [
    `${greeting}, bienvenido/a a nuestro servicio.${emoji} ¿En qué puedo ayudarte hoy?`,
    `${empathyPhrase} Tenemos disponibilidad mañana a las 10:00 y 15:00.${humorPhrase}${emoji}`,
    `${closing}${emoji}`,
  ];
};

export function PersonalitySection({ settings, onChange }: PersonalitySectionProps) {
  const [previewMessages, setPreviewMessages] = useState<string[]>([]);

  useEffect(() => {
    setPreviewMessages(getPreviewResponses(settings));
  }, [settings]);

  const handleSliderChange = (
    key: keyof Pick<PersonalitySettings, "formality" | "empathy" | "humor" | "emojis" | "responseLength">,
    values: typeof formalityValues | typeof empathyValues | typeof humorValues | typeof emojiValues | typeof responseLengthValues,
    sliderValue: number[]
  ) => {
    const newValue = values[sliderValue[0]];
    onChange({
      ...settings,
      [key]: newValue,
      lastModified: new Date(),
    });
  };

  const handleObjectiveChange = (value: PersonalitySettings["primaryObjective"]) => {
    onChange({ ...settings, primaryObjective: value, lastModified: new Date() });
  };

  return (
    <div className="space-y-6">
      {/* Objetivo del agente */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivo del agente
          </CardTitle>
          <CardDescription>
            Define qué debe priorizar tu agente en cada conversación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Objetivo principal</Label>
            <RadioGroup
              value={settings.primaryObjective}
              onValueChange={handleObjectiveChange}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {(Object.keys(objectiveLabels) as PersonalitySettings["primaryObjective"][]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`obj-${key}`} />
                  <Label htmlFor={`obj-${key}`} className="font-normal cursor-pointer">
                    {objectiveLabels[key]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Flujo de venta */}
      <SalesFlowSection
        steps={settings.salesFlowSteps || []}
        onChange={(salesFlowSteps) => onChange({ ...settings, salesFlowSteps, lastModified: new Date() })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controles de personalidad */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Tono de comunicación</CardTitle>
            <CardDescription>
              Ajusta cómo se comunica tu agente con los clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Formalidad */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Formalidad</Label>
                <span className="text-sm text-primary font-medium">
                  {formalityLabels[formalityValues.indexOf(settings.formality)]}
                </span>
              </div>
              <Slider
                value={[formalityValues.indexOf(settings.formality)]}
                onValueChange={(v) => handleSliderChange("formality", formalityValues, v)}
                max={4}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Casual</span>
                <span>Profesional</span>
              </div>
            </div>

            {/* Empatía */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Empatía</Label>
                <span className="text-sm text-primary font-medium">
                  {empathyLabels[empathyValues.indexOf(settings.empathy)]}
                </span>
              </div>
              <Slider
                value={[empathyValues.indexOf(settings.empathy)]}
                onValueChange={(v) => handleSliderChange("empathy", empathyValues, v)}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Directo</span>
                <span>Comprensivo</span>
              </div>
            </div>

            {/* Humor */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Humor</Label>
                <span className="text-sm text-primary font-medium">
                  {humorLabels[humorValues.indexOf(settings.humor)]}
                </span>
              </div>
              <Slider
                value={[humorValues.indexOf(settings.humor)]}
                onValueChange={(v) => handleSliderChange("humor", humorValues, v)}
                max={3}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Serio</span>
                <span>Divertido</span>
              </div>
            </div>

            {/* Emojis */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Uso de emojis</Label>
                <span className="text-sm text-primary font-medium">
                  {emojiLabels[emojiValues.indexOf(settings.emojis)]}
                </span>
              </div>
              <Slider
                value={[emojiValues.indexOf(settings.emojis)]}
                onValueChange={(v) => handleSliderChange("emojis", emojiValues, v)}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sin emojis</span>
                <span>Expresivo</span>
              </div>
            </div>

            {/* Extensión de respuesta */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Extensión de respuesta</Label>
                <span className="text-sm text-primary font-medium">
                  {responseLengthDescriptions[responseLengthValues.indexOf(settings.responseLength || 'media')]}
                </span>
              </div>
              <Slider
                value={[responseLengthValues.indexOf(settings.responseLength || 'media')]}
                onValueChange={(v) => handleSliderChange("responseLength", responseLengthValues, v)}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Corta</span>
                <span>Extensa</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista previa dinámica */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Vista previa</CardTitle>
            </div>
            <CardDescription>
              Así responderá tu agente con la configuración actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              {previewMessages.map((message, index) => (
                <div
                  key={index}
                  className="bg-primary/10 border border-primary/20 rounded-lg rounded-bl-none p-3 max-w-[90%]"
                >
                  <p className="text-sm text-foreground">{message}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Los mensajes se actualizan en tiempo real según tus ajustes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instrucciones personalizadas */}
      <CustomInstructionsSection
        instructions={settings.customInstructions || []}
        onChange={(customInstructions) => onChange({ ...settings, customInstructions, lastModified: new Date() })}
        sectionName="personalidad del agente"
      />
    </div>
  );
}
