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
  type BedMood,
  type SfxKind,
} from "@/lib/studio/shorts";
import { previewSound } from "@/lib/studio/shorts-audio";
import { MUSIC_LIBRARY, SFX_LIBRARY } from "@/lib/studio/shorts-library";

type Row = { kind: "music"; tag: BedMood } | { kind: "sfx"; tag: SfxKind };

const ROWS: Row[] = [...MUSIC_MOODS.map((tag) => ({ kind: "music" as const, tag })), ...SFX_KINDS.map((tag) => ({ kind: "sfx" as const, tag }))];

function PlayButton({ active, loading, onClick, title }: { active: boolean; loading: boolean; onClick: () => void; title: string }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClick} title={title}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
  );
}

/** Biblioteca de sonidos: la música y los efectos incluidos; los archivos propios los reemplazan */
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
            Vienen incluidas música y efectos de la Biblioteca de audio de YouTube (licencia YouTube, sin atribución). Cada Short usa una canción del ánimo
            que eligió la IA; puedes cambiarla en el Short. Si subes tus propios archivos, se usan esos en su lugar (quedan guardados en este navegador). Si
            el video ya trae música, elige &quot;{MOOD_LABELS.original}&quot;. No uses esta música en anuncios pagados de Meta.
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
                const variants = row.kind === "sfx" ? (SFX_LIBRARY[row.tag] ?? 0) : 0;
                return (
                  <div key={key} className="rounded-xl bg-secondary/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {row.kind === "sfx" &&
                        (variants > 1 ? (
                          Array.from({ length: variants }, (_, i) => (
                            <PlayButton
                              key={i}
                              active={playing === `${key}:${i + 1}`}
                              loading={loading === `${key}:${i + 1}`}
                              onClick={() => void play(`${key}:${i + 1}`, { kind: "sfx", type: row.tag, variant: i + 1 })}
                              title={`Escuchar la versión ${i + 1}`}
                            />
                          ))
                        ) : (
                          <PlayButton
                            active={playing === key}
                            loading={loading === key}
                            onClick={() => void play(key, { kind: "sfx", type: row.tag })}
                            title="Escuchar el incluido"
                          />
                        ))}
                      <span className="flex-1 text-sm font-medium">{row.kind === "music" ? MOOD_LABELS[row.tag] : SFX_LABELS[row.tag]}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {own.length ? `${own.length} propio${own.length > 1 ? "s" : ""}` : row.kind === "music" ? `${MUSIC_LIBRARY[row.tag].length} incluidas` : "incluido"}
                      </span>
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
                    {row.kind === "music" &&
                      MUSIC_LIBRARY[row.tag].map((t) => (
                        <div key={t.file} className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <PlayButton
                            active={playing === t.file}
                            loading={loading === t.file}
                            onClick={() => void play(t.file, { kind: "music", mood: row.tag, track: t.file })}
                            title="Escuchar"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {t.title} <span className="opacity-70">· {t.artist}</span>
                          </span>
                        </div>
                      ))}
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
