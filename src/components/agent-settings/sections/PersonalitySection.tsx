import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MessageSquare } from "lucide-react";
import type { PersonalitySettings } from "@/lib/types";

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

// Mock responses based on personality
const getPreviewResponses = (settings: PersonalitySettings): string[] => {
  const { formality, empathy, humor, emojis } = settings;
  
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

  return [
    `${greeting}, bienvenido/a a Beauty Salon Pro.${emoji} ¿En qué puedo ayudarte hoy?`,
    `${empathyPhrase} Tenemos disponibilidad para corte de cabello mañana a las 10:00 y 15:00.${humorPhrase}${emoji}`,
    `¡Perfecto! Tu cita ha sido agendada.${emoji} Te enviaremos un recordatorio 24 horas antes.${humorPhrase}`,
  ];
};

export function PersonalitySection({ settings, onChange }: PersonalitySectionProps) {
  const [previewMessages, setPreviewMessages] = useState<string[]>([]);

  useEffect(() => {
    setPreviewMessages(getPreviewResponses(settings));
  }, [settings]);

  const handleSliderChange = (
    key: keyof Pick<PersonalitySettings, "formality" | "empathy" | "humor" | "emojis">,
    values: typeof formalityValues | typeof empathyValues | typeof humorValues | typeof emojiValues,
    sliderValue: number[]
  ) => {
    const newValue = values[sliderValue[0]];
    onChange({
      ...settings,
      [key]: newValue,
      lastModified: new Date(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controles */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ajustes de personalidad</CardTitle>
          <CardDescription>
            Define cómo se comunica tu agente con los clientes
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
              {formalityLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
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
              {empathyLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
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
              {humorLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
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
              {emojiLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
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
                className="bg-primary/10 border border-primary/20 rounded-lg rounded-bl-none p-3 max-w-[85%]"
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
  );
}
