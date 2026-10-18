import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { translateToSpanish, type Translation } from "@/lib/studio/translate";
import { cn } from "@/lib/utils";

interface TranslateHintProps {
  text: string;
  /** Idioma del texto si se conoce; en español no se muestra el botón */
  language?: string;
  className?: string;
}

const SOURCE_LABELS: Record<Translation["source"], string> = {
  navegador: "Traducido por Chrome en tu PC",
  ia: "Traducido con IA",
  original: "El texto ya está en español",
};

/** Ícono de traducción: al hacer clic muestra el texto en español; se cierra al hacer clic afuera */
export function TranslateHint({ text, language, className }: TranslateHintProps) {
  const [result, setResult] = useState<Translation | null>(null);
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!text.trim() || language === "es") return null;

  const handleOpen = async (open: boolean) => {
    if (!open || (result && translatedText === text)) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await translateToSpanish(text, language));
      setTranslatedText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo traducir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover onOpenChange={(open) => void handleOpen(open)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ver en español"
          title="Ver en español"
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
            className
          )}
        >
          <Languages className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 p-3 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">En español</p>
        {loading ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Traduciendo…
          </p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : result ? (
          <>
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap">{result.text}</p>
            <p className="text-[11px] text-muted-foreground">{SOURCE_LABELS[result.source]}</p>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
