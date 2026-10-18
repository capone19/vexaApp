import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";
import { saveChannelProfile, type ChannelProfile } from "@/lib/studio/ai";
import { savePublishPlan, type PublishPlan } from "@/lib/studio/publish-plan";
import { disconnectAccount, fetchConnectedAccounts, setAccountManaged } from "@/lib/studio/connections";
import { DEFAULT_AUTOMATIONS, DEMO_ACCOUNTS, DEMO_POSTS } from "@/lib/studio/mock";
import type { PlatformId, SocialAccount, StudioAutomation, StudioPost } from "@/lib/studio/types";

// Estado del Studio: las cuentas conectadas por OAuth vienen de Supabase (`remote`);
// demo, cuentas manuales, publicaciones y automatizaciones siguen en localStorage.
const STORAGE_KEY = "vexa_studio_v1";

interface StudioState {
  accounts: SocialAccount[];
  posts: StudioPost[];
  automations: StudioAutomation[];
}

interface StudioContextValue extends StudioState {
  accountsFor: (platform: PlatformId) => SocialAccount[];
  addAccount: (account: Omit<SocialAccount, "id" | "connectedAt">) => SocialAccount;
  removeAccount: (id: string) => Promise<boolean>;
  refreshAccounts: () => Promise<void>;
  accountsLoading: boolean;
  toggleManaged: (id: string) => void;
  /** Guarda el perfil de estilo del canal (solo cuentas conectadas por OAuth) */
  updateAccountProfile: (id: string, profile: ChannelProfile) => Promise<void>;
  /** Guarda la frecuencia de publicación del canal */
  updateAccountPlan: (id: string, plan: PublishPlan) => Promise<void>;
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
  const [remoteAccounts, setRemoteAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const { tenantId } = useEffectiveTenant();

  const refreshAccounts = useCallback(async () => {
    if (!tenantId) {
      setRemoteAccounts([]);
      return;
    }
    setAccountsLoading(true);
    try {
      setRemoteAccounts(await fetchConnectedAccounts(tenantId));
    } catch (err) {
      console.warn("[Studio] No se pudieron cargar las cuentas conectadas:", err);
    } finally {
      setAccountsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const accounts = useMemo(() => [...remoteAccounts, ...state.accounts], [remoteAccounts, state.accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin almacenamiento disponible: el estado vive solo en memoria
    }
  }, [state]);

  const accountsFor = useCallback(
    (platform: PlatformId) => accounts.filter((a) => a.platform === platform),
    [accounts]
  );

  const addAccount = useCallback((account: Omit<SocialAccount, "id" | "connectedAt">) => {
    const created: SocialAccount = { ...account, id: newId(account.platform), connectedAt: new Date().toISOString() };
    setState((s) => ({ ...s, accounts: [...s.accounts, created] }));
    return created;
  }, []);

  const removeAccount = useCallback(
    async (id: string) => {
      const remote = remoteAccounts.find((a) => a.id === id);
      if (remote) {
        // Revoca el acceso en la plataforma y borra la cuenta en Supabase
        if (!(await disconnectAccount(remote))) return false;
        setRemoteAccounts((list) => list.filter((a) => a.id !== id));
      }
      setState((s) => ({
        ...s,
        accounts: s.accounts.filter((a) => a.id !== id),
        posts: s.posts.filter((p) => p.accountId !== id),
      }));
      return true;
    },
    [remoteAccounts]
  );

  const toggleManaged = useCallback(
    (id: string) => {
      const remote = remoteAccounts.find((a) => a.id === id);
      if (remote) {
        const managed = !remote.managed;
        const apply = (value: boolean) =>
          setRemoteAccounts((list) => list.map((a) => (a.id === id ? { ...a, managed: value } : a)));
        apply(managed);
        setAccountManaged(id, managed).catch(() => apply(!managed));
        return;
      }
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) => (a.id === id ? { ...a, managed: !a.managed } : a)),
      }));
    },
    [remoteAccounts]
  );

  const updateAccountProfile = useCallback(async (id: string, profile: ChannelProfile) => {
    await saveChannelProfile(id, profile);
    setRemoteAccounts((list) => list.map((a) => (a.id === id ? { ...a, aiProfile: { ...profile } } : a)));
  }, []);

  const updateAccountPlan = useCallback(async (id: string, plan: PublishPlan) => {
    await savePublishPlan(id, plan);
    setRemoteAccounts((list) => list.map((a) => (a.id === id ? { ...a, publishPlan: { ...plan } } : a)));
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
      accounts,
      accountsFor,
      addAccount,
      removeAccount,
      refreshAccounts,
      accountsLoading,
      toggleManaged,
      updateAccountProfile,
      updateAccountPlan,
      addPost,
      removePost,
      toggleAutomation,
      clearDemoData,
      hasDemoData,
    }),
    [state, accounts, accountsFor, addAccount, removeAccount, refreshAccounts, accountsLoading, toggleManaged, updateAccountProfile, updateAccountPlan, addPost, removePost, toggleAutomation, clearDemoData, hasDemoData]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio debe usarse dentro de StudioProvider");
  return ctx;
}
