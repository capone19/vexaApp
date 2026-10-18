import { useEffect, useState } from "react";
import { Plus, Unplug } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConnectAccountDialog } from "@/components/studio/ConnectAccountDialog";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { AccountStatusBadge, DemoBadge, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { OAUTH_ERROR_MESSAGES } from "@/lib/studio/connections";
import { formatFollowers, isPlatformId, PLATFORM_IDS, PLATFORMS } from "@/lib/studio/platforms";
import type { PlatformId } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export default function StudioCuentas() {
  const { accountsFor, toggleManaged, removeAccount, refreshAccounts } = useStudio();
  const { toast } = useToast();
  const [dialogPlatform, setDialogPlatform] = useState<PlatformId | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Resultado del OAuth: la Edge Function vuelve con ?studio_connected=... o ?studio_error=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("studio_connected");
    const error = url.searchParams.get("studio_error");
    if (!connected && !error) return;

    if (connected) {
      const name = isPlatformId(connected) ? PLATFORMS[connected].name : connected;
      toast({ title: `${name} conectado`, description: url.searchParams.get("studio_account") ?? undefined });
      void refreshAccounts();
    } else if (error) {
      toast({
        title: "No se pudo conectar la cuenta",
        description: OAUTH_ERROR_MESSAGES[error] ?? error,
        variant: "destructive",
      });
    }
    ["studio_connected", "studio_account", "studio_error"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [refreshAccounts, toast]);

  const handleRemove = async (id: string, handle: string) => {
    setRemovingId(id);
    const ok = await removeAccount(id);
    setRemovingId(null);
    if (!ok) toast({ title: `No se pudo desconectar ${handle}`, variant: "destructive" });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <StudioPageHeader
        eyebrow="Conexiones"
        title="Cuentas conectadas"
        subtitle="Conecta todas las cuentas que quieras y activa las que vas a gestionar desde el Studio."
        actions={
          <Button className="gap-2" onClick={() => setDialogPlatform("youtube")}>
            <Plus className="h-4 w-4" />
            Conectar cuenta
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLATFORM_IDS.map((id) => {
          const meta = PLATFORMS[id];
          const list = accountsFor(id);
          return (
            <StudioCard key={id} className="flex flex-col">
              <div className="mb-4 flex items-center gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", meta.chipClassName)}>
                  <PlatformIcon platform={id} />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{meta.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {list.length} {list.length === 1 ? "cuenta" : "cuentas"}
                  </p>
                </div>
              </div>

              <ul className="flex-1 space-y-2">
                {list.length === 0 && (
                  <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Sin cuentas de {meta.name}
                  </li>
                )}
                {list.map((acc) => (
                  <li
                    key={acc.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                      acc.managed ? "border-primary/30 bg-primary/5" : "border-border"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      {acc.avatarUrl && <AvatarImage src={acc.avatarUrl} alt={acc.displayName} />}
                      <AvatarFallback className="bg-secondary text-xs">{acc.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{acc.handle}</p>
                        {acc.demo && <DemoBadge />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <AccountStatusBadge status={acc.status} />
                        <span className="text-[11px] text-muted-foreground">{formatFollowers(acc.followers)} seguidores</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Switch
                        checked={acc.managed}
                        onCheckedChange={() => toggleManaged(acc.id)}
                        aria-label={`Gestionar ${acc.handle}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(acc.id, acc.handle)}
                        disabled={removingId === acc.id}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Unplug className="h-3 w-3" />
                        {acc.remote ? "Desconectar" : "Quitar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <Button variant="secondary" className="mt-4 w-full gap-2" onClick={() => setDialogPlatform(id)}>
                <Plus className="h-4 w-4" />
                Agregar {meta.name}
              </Button>
            </StudioCard>
          );
        })}
      </div>

      <ConnectAccountDialog
        open={dialogPlatform !== null}
        onOpenChange={(open) => !open && setDialogPlatform(null)}
        defaultPlatform={dialogPlatform ?? "youtube"}
      />
    </div>
  );
}
