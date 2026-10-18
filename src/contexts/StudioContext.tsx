import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_AUTOMATIONS, DEMO_ACCOUNTS, DEMO_POSTS } from "@/lib/studio/mock";
import type { PlatformId, SocialAccount, StudioAutomation, StudioPost } from "@/lib/studio/types";

// Estado local del Studio (persistido en localStorage).
// Cuando estén listas las tablas en Supabase, este contexto pasa a leer/escribir ahí.
const STORAGE_KEY = "vexa_studio_v1";

interface StudioState {
  accounts: SocialAccount[];
  posts: StudioPost[];
  automations: StudioAutomation[];
}

interface StudioContextValue extends StudioState {
  accountsFor: (platform: PlatformId) => SocialAccount[];
  addAccount: (account: Omit<SocialAccount, "id" | "connectedAt">) => SocialAccount;
  removeAccount: (id: string) => void;
  toggleManaged: (id: string) => void;
  addPost: (post: Omit<StudioPost, "id" | "createdAt">) => StudioPost;
  removePost: (id: string) => void;
  toggleAutomation: (id: string) => void;
  clearDemoData: () => void;
  hasDemoData: boolean;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function loadState(): StudioState {
  const fallback: StudioState = {
    accounts: DEMO_ACCOUNTS,
    posts: DEMO_POSTS,
    automations: DEFAULT_AUTOMATIONS,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StudioState>;
    return {
      accounts: parsed.accounts ?? fallback.accounts,
      posts: parsed.posts ?? fallback.posts,
      automations: parsed.automations ?? fallback.automations,
    };
  } catch {
    return fallback;
  }
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudioState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin almacenamiento disponible: el estado vive solo en memoria
    }
  }, [state]);

  const accountsFor = useCallback(
    (platform: PlatformId) => state.accounts.filter((a) => a.platform === platform),
    [state.accounts]
  );

  const addAccount = useCallback((account: Omit<SocialAccount, "id" | "connectedAt">) => {
    const created: SocialAccount = { ...account, id: newId(account.platform), connectedAt: new Date().toISOString() };
    setState((s) => ({ ...s, accounts: [...s.accounts, created] }));
    return created;
  }, []);

  const removeAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
      posts: s.posts.filter((p) => p.accountId !== id),
    }));
  }, []);

  const toggleManaged = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, managed: !a.managed } : a)),
    }));
  }, []);

  const addPost = useCallback((post: Omit<StudioPost, "id" | "createdAt">) => {
    const created: StudioPost = { ...post, id: newId("post"), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, posts: [created, ...s.posts] }));
    return created;
  }, []);

  const removePost = useCallback((id: string) => {
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  }, []);

  const toggleAutomation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    }));
  }, []);

  const clearDemoData = useCallback(() => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => !a.demo),
      posts: s.posts.filter((p) => !p.demo),
    }));
  }, []);

  const hasDemoData = state.accounts.some((a) => a.demo) || state.posts.some((p) => p.demo);

  const value = useMemo<StudioContextValue>(
    () => ({
      ...state,
      accountsFor,
      addAccount,
      removeAccount,
      toggleManaged,
      addPost,
      removePost,
      toggleAutomation,
      clearDemoData,
      hasDemoData,
    }),
    [state, accountsFor, addAccount, removeAccount, toggleManaged, addPost, removePost, toggleAutomation, clearDemoData, hasDemoData]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio debe usarse dentro de StudioProvider");
  return ctx;
}
