import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  deleteAudio,
  listAudio,
  MOOD_LABELS,
  MUSIC_MOODS,
  saveAudio,
  SFX_KINDS,
  SFX_LABELS,
  type AudioAsset,
  type MusicMood,
  type SfxKind,
} from "@/lib/studio/shorts";
import { previewSound } from "@/lib/studio/shorts-audio";

type Row = { kind: "music"; tag: Exclude<MusicMood, "ninguna"> } | { kind: "sfx"; tag: SfxKind };

const ROWS: Row[] = [
  ...MUSIC_MOODS.map((tag) => ({ kind: "music" as const, tag: tag as Exclude<MusicMood, "ninguna"> })),
  ...SFX_KINDS.map((tag) => ({ kind: "sfx" as const, tag })),
];

/** Biblioteca de sonidos: los sintetizados vienen incluidos; los archivos propios los reemplazan */
export function ShortsSoundsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef<Row | null>(null);

  useEffect(() => {
    if (open) void listAudio().then(setAssets).catch(() => setAssets([]));
    return () => stopRef.current?.();
  }, [open]);

  const play = async (key: string, source: Parameters<typeof previewSound>[0]) => {
    stopRef.current?.();
    if (playing === key) {
      setPlaying(null);
      return;
    }
    setLoading(key);
    try {
      const stop = await previewSound(source);
      stopRef.current = () => {
        stop();
        setPlaying(null);
      };
      setPlaying(key);
    } catch {
      toast({ title: "No se pudo reproducir ese archivo", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const upload = async (files: FileList | null) => {
    const row = target.current;
    if (!row || !files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;
      const asset = await saveAudio({ kind: row.kind, tag: row.tag, name: file.name, file });
      setAssets((list) => [...list, asset]);
    }
  };

  const remove = async (id: string) => {
    await deleteAudio(id);
    setAssets((list) => list.filter((a) => a.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sonidos de los Shorts</DialogTitle>
          <DialogDescription>
            Vienen incluidos música y efectos generados por VEXA (sin derechos de autor). Si subes tus propios archivos (por ejemplo de la Biblioteca de
            audio de YouTube o los que usas en tus videos), se usan esos en su lugar. Quedan guardados en este navegador.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="space-y-4">
          {(["music", "sfx"] as const).map((kind) => (
            <div key={kind} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kind === "music" ? "Música de fondo" : "Efectos de sonido"}</p>
              {ROWS.filter((r) => r.kind === kind).map((row) => {
                const key = `${row.kind}:${row.tag}`;
                const own = assets.filter((a) => a.kind === row.kind && a.tag === row.tag);
                const label = row.kind === "music" ? MOOD_LABELS[row.tag] : SFX_LABELS[row.tag];
                return (
                  <div key={key} className="rounded-xl bg-secondary/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void play(key, row.kind === "music" ? { kind: "music", mood: row.tag } : { kind: "sfx", type: row.tag })}
                        title="Escuchar el incluido"
                      >
                        {loading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : playing === key ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <span className="flex-1 text-sm font-medium">{label}</span>
                      <span className="text-[11px] text-muted-foreground">{own.length ? `${own.length} propio${own.length > 1 ? "s" : ""}` : "incluido"}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => {
                          target.current = row;
                          inputRef.current?.click();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Subir
                      </Button>
                    </div>
                    {own.map((a) => (
                      <div key={a.id} className="ml-9 mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <button className="hover:text-foreground" onClick={() => void play(a.id, { file: a.file })}>
                          {playing === a.id ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <button className="hover:text-destructive" onClick={() => void remove(a.id)} title="Quitar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
