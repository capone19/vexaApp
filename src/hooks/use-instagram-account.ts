import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";

const STORAGE_KEY = "vexa_studio_instagram_account";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Cuenta de Instagram elegida en Inicio y Programación (se recuerda en este navegador) */
export function useInstagramAccount() {
  const { accountsFor } = useStudio();
  const all = accountsFor("instagram");
  const accounts = useMemo(
    () => all.filter((a) => a.managed && a.remote),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all.map((a) => `${a.id}:${a.managed}:${a.followers}:${a.status}:${JSON.stringify(a.aiProfile)}:${JSON.stringify(a.publishPlan)}`).join()]
  );
  const [stored, setStored] = useState<string | null>(readStored);
  const account = accounts.find((a) => a.id === stored) ?? accounts[0] ?? null;

  const select = useCallback((id: string) => {
    setStored(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Sin almacenamiento: se recuerda solo mientras la página esté abierta
    }
  }, []);

  return { accounts, account, select };
}
