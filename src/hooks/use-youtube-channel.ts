import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";

const STORAGE_KEY = "vexa_studio_youtube_channel";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Canal de YouTube elegido en Análisis y Programación (se recuerda en este navegador) */
export function useYouTubeChannel() {
  const { accountsFor } = useStudio();
  const all = accountsFor("youtube");
  const channels = useMemo(
    () => all.filter((a) => a.managed && a.remote),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all.map((a) => `${a.id}:${a.managed}:${a.followers}:${JSON.stringify(a.aiProfile)}:${JSON.stringify(a.publishPlan)}`).join()]
  );
  const [stored, setStored] = useState<string | null>(readStored);
  const channel = channels.find((a) => a.id === stored) ?? channels[0] ?? null;

  const select = useCallback((id: string) => {
    setStored(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Sin almacenamiento: se recuerda solo mientras la página esté abierta
    }
  }, []);

  return { channels, channel, select };
}
