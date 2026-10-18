import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStudio } from "@/contexts/StudioContext";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, normalizeProfile, YOUTUBE_CATEGORIES, type ChannelProfile } from "@/lib/studio/ai";
import type { SocialAccount } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

interface ChannelProfileDialogProps {
  account: SocialAccount | null;
  onOpenChange: (open: boolean) => void;
}

/** Perfil de estilo del canal: lo que la IA usa para escribir títulos y descripciones con su voz */
export function ChannelProfileDialog({ account, onOpenChange }: ChannelProfileDialogProps) {
  const { updateAccountProfile } = useStudio();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ChannelProfile>(normalizeProfile(account?.aiProfile));
  const [examples, setExamples] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    const p = normalizeProfile(account.aiProfile);
    setProfile(p);
    setExamples(p.example_titles.join("\n"));
  }, [account]);

  const set = <K extends keyof ChannelProfile>(key: K, value: ChannelProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const toggleLocale = (lang: string) =>
    set("localize_to", profile.localize_to.includes(lang) ? profile.localize_to.filter((l) => l !== lang) : [...profile.localize_to, lang]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const example_titles = examples.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 15);
      await updateAccountProfile(account.id, { ...profile, example_titles, localize_to: profile.localize_to.filter((l) => l !== profile.language) });
      toast({ title: "Perfil del canal guardado" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "No se pudo guardar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Perfil de {account?.handle}</DialogTitle>
          <DialogDescription>
            La IA usa esto para escribir títulos y descripciones con la voz de tu canal. Se guarda una vez y sirve para cada subida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Idioma del canal</Label>
              <Select value={profile.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría en YouTube</Label>
              <Select value={profile.category_id} onValueChange={(v) => set("category_id", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(YOUTUBE_CATEGORIES).map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-niche">De qué trata el canal</Label>
            <Textarea
              id="profile-niche"
              rows={2}
              value={profile.niche}
              onChange={(e) => set("niche", e.target.value)}
              placeholder="Historia ilustrada: cómo vivía (y sufría) la gente común, con un monito como protagonista"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-tone">Tono</Label>
              <Input id="profile-tone" value={profile.tone} onChange={(e) => set("tone", e.target.value)} placeholder="Oscuro, con humor, muy simple" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-audience">Audiencia</Label>
              <Input id="profile-audience" value={profile.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Adultos curiosos de 18 a 44 años" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-cta">Llamado a la acción (va al final de la descripción)</Label>
            <Input id="profile-cta" value={profile.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Subscribe and see what history did to people like you." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-examples">Títulos de ejemplo que funcionaron (uno por línea)</Label>
            <Textarea
              id="profile-examples"
              rows={4}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              placeholder={"What did ancient humans actually do all night?\nWhy ancient humans were the most terrifying animal"}
            />
          </div>
          <div className="space-y-2">
            <Label>Traducir título y descripción a</Label>
            <p className="text-xs text-muted-foreground">
              YouTube mostrará el video con el título traducido a quienes tengan ese idioma.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGUAGES)
                .filter(([code]) => code !== profile.language)
                .map(([code, name]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleLocale(code)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      profile.localize_to.includes(code)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
