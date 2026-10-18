import { useEffect, useState } from "react";
import { Info, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_IDS, PLATFORMS } from "@/lib/studio/platforms";
import { OAUTH_ERROR_MESSAGES, OAUTH_PLATFORMS, startYouTubeConnect } from "@/lib/studio/connections";
import { sendStudioEvent } from "@/lib/studio/n8n";
import type { PlatformId } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { useEffectiveTenant } from "@/hooks/use-effective-tenant";

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlatform?: PlatformId;
}

export function ConnectAccountDialog({ open, onOpenChange, defaultPlatform = "youtube" }: ConnectAccountDialogProps) {
  const { addAccount } = useStudio();
  const { toast } = useToast();
  const { tenantId } = useEffectiveTenant();
  const [platform, setPlatform] = useState<PlatformId>(defaultPlatform);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPlatform(defaultPlatform);
      setHandle("");
    }
  }, [open, defaultPlatform]);

  const usesOAuth = OAUTH_PLATFORMS.includes(platform);

  const handleOAuth = async () => {
    if (!tenantId) return;
    setSaving(true);
    const returnTo = `${window.location.origin}/studio/cuentas`;
    const result = await startYouTubeConnect(tenantId, returnTo);
    if (result.ok && result.url) {
      // Google pide elegir cuenta/canal y vuelve a /studio/cuentas
      window.location.assign(result.url);
      return;
    }
    setSaving(false);
    toast({
      title: "No se pudo conectar YouTube",
      description: OAUTH_ERROR_MESSAGES[result.code ?? ""] ?? result.code,
      variant: "destructive",
    });
  };

  const handleConnect = async () => {
    if (usesOAuth) return handleOAuth();
    const clean = handle.trim().replace(/^@?/, "@");
    if (clean.length < 2) return;
    setSaving(true);
    const account = addAccount({
      platform,
      handle: clean,
      displayName: clean.slice(1),
      followers: 0,
      status: "pendiente",
      managed: true,
    });
    // n8n inicia el OAuth de la plataforma y actualiza el estado de la cuenta
    const result = await sendStudioEvent({
      event: `${platform}.account.connect`,
      tenant_id: tenantId,
      platform,
      account_ids: [account.id],
      data: { handle: clean },
    });
    setSaving(false);
    toast({
      title: `${PLATFORMS[platform].name}: ${clean} agregada`,
      description: result.notConfigured
        ? "Queda pendiente hasta conectar el OAuth (webhook de n8n sin configurar)."
        : result.success
          ? "Solicitud de conexión enviada a n8n."
          : `No se pudo avisar a n8n: ${result.error}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar cuenta</DialogTitle>
          <DialogDescription>Puedes conectar varias cuentas de cada plataforma y elegir cuáles gestionar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {PLATFORM_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlatform(id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all",
                  platform === id
                    ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", PLATFORMS[id].chipClassName)}>
                  <PlatformIcon platform={id} />
                </span>
                {PLATFORMS[id].name}
              </button>
            ))}
          </div>

          {usesOAuth ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Inicio de sesión seguro con Google
              </div>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Elige la cuenta de Google y el canal (o cuenta de marca) que quieres conectar.</li>
                <li>VEXA solo pide permiso para ver tu canal y subir videos.</li>
                <li>Repite el proceso para sumar más canales. Puedes desconectarlos cuando quieras.</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="studio-handle">Usuario o cuenta</Label>
                <Input
                  id="studio-handle"
                  placeholder="@miusuario"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  autoFocus
                />
              </div>

              <div className="flex gap-2 rounded-xl bg-info-soft p-3 text-xs text-info-soft-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  El inicio de sesión con {PLATFORMS[platform].name} todavía no está activo. Mientras tanto la cuenta
                  queda como <b>pendiente</b>.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConnect}
            disabled={saving || (usesOAuth ? !tenantId : handle.trim().length < 2)}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {usesOAuth ? "Continuar con Google" : `Conectar ${PLATFORMS[platform].name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
