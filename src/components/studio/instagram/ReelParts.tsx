import { useCallback, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarClock, CheckCircle2, ExternalLink, FileVideo, Loader2, TriangleAlert, UploadCloud, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  hasVideo,
  MAX_CAPTION,
  MAX_HASHTAGS,
  MISSING_VIDEO_MESSAGE,
  normalizeHashtag,
  noticeFailed,
  notifySchedule,
  NOTIFY_FAILED_MESSAGE,
  PUBLISHING_MESSAGE,
  type InstagramPublication,
  type ScheduleNotice,
} from "@/lib/studio/instagram";
import { cn } from "@/lib/utils";

const time = (iso: string) => format(new Date(iso), "HH:mm");

/** Estado de un Reel para el calendario: borrador, programado, subiendo, falta video, publicando, publicado o error */
export function ReelStatusChip({ publication: p, uploading }: { publication: InstagramPublication; uploading?: number | null }) {
  if (uploading !== undefined && uploading !== null) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <UploadCloud className="h-3 w-3" />
          Subiendo video · {Math.round(uploading * 100)}%
        </p>
        <Progress value={uploading * 100} className="h-1" />
      </div>
    );
  }
  switch (p.status) {
    case "borrador":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <FileVideo className="h-3 w-3" />
          Borrador
        </span>
      );
    case "programado":
      return hasVideo(p) ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info-soft-foreground">
          <CalendarClock className="h-3 w-3" />
          Programado {p.scheduledAt ? `· ${time(p.scheduledAt)}` : ""}
        </span>
      ) : (
        <p className="flex items-start gap-1 text-[11px] font-medium text-amber-400" title={MISSING_VIDEO_MESSAGE}>
          <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
          Falta el video
        </p>
      );
    case "publicando":
      return (
        <p className="flex items-center gap-1 text-[11px] font-medium text-primary" title={PUBLISHING_MESSAGE}>
          <Loader2 className="h-3 w-3 animate-spin" />
          Publicando…
        </p>
      );
    case "publicado":
      return p.permalink ? (
        <a
          href={p.permalink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-soft-foreground hover:underline"
        >
          <CheckCircle2 className="h-3 w-3" />
          Publicado
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-soft-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Publicado
        </span>
      );
    case "error":
      return (
        <p className="flex items-start gap-1 text-[11px] font-medium text-red-400" title={p.lastError ?? undefined}>
          <AlertCircle className="mt-px h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{p.lastError || "No se pudo publicar"}</span>
        </p>
      );
  }
}

/** Caption con contador de 2.200 caracteres (contando la línea de hashtags) */
export function CaptionField({
  value,
  onChange,
  extraLength = 0,
  disabled,
  rows = 6,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Lo que suman los hashtags al texto final */
  extraLength?: number;
  disabled?: boolean;
  rows?: number;
  id?: string;
}) {
  const total = value.trim().length + extraLength;
  return (
    <div className="space-y-1">
      <Textarea id={id} value={value} rows={rows} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="resize-y text-sm" />
      <p className={cn("text-right text-[11px] tabular-nums", total > MAX_CAPTION ? "text-red-400" : "text-muted-foreground")}>
        {total.toLocaleString("es-CL")} / {MAX_CAPTION.toLocaleString("es-CL")}
      </p>
    </div>
  );
}

/** Hashtags como chips (máximo 5) */
export function HashtagInput({ value, onChange, disabled }: { value: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tags = draft.split(/[\s,]+/).map(normalizeHashtag).filter(Boolean);
    if (!tags.length) return;
    const next = [...value];
    for (const tag of tags) if (!next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
    onChange(next.slice(0, MAX_HASHTAGS));
    setDraft("");
  };
  const full = value.length >= MAX_HASHTAGS;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Quitar ${tag}`} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">Sin hashtags</span>}
      </div>
      {!disabled && (
        <Input
          value={draft}
          disabled={full}
          placeholder={full ? `Máximo ${MAX_HASHTAGS} hashtags` : "Escribe un hashtag y presiona Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

/**
 * Toast después de programar. Si n8n no recibió el aviso de la hora, el cambio queda guardado igual
 * (el repaso de cada hora lo publica): se muestra un aviso suave con la opción de avisar de nuevo.
 */
export function useScheduleNotice() {
  const { toast } = useToast();
  return useCallback(
    (publicationId: string, notice: ScheduleNotice | null, title: string, description?: string) => {
      if (noticeFailed(notice)) {
        toast({
          title,
          description: NOTIFY_FAILED_MESSAGE,
          action: (
            <ToastAction
              altText="Avisar de nuevo"
              onClick={() => {
                void notifySchedule(publicationId).then((again) =>
                  toast(
                    noticeFailed(again)
                      ? { title: "Sigue sin respuesta", description: "El Reel saldrá igual, con hasta 1 hora de atraso." }
                      : { title: "Listo: hora avisada a Instagram" }
                  )
                );
              }}
            >
              Avisar de nuevo
            </ToastAction>
          ),
        });
        return;
      }
      toast({ title, description });
    },
    [toast]
  );
}

/** "lun 20 oct · 14:00" */
export const whenLabel = (iso: string | Date) => format(new Date(iso), "EEE d MMM · HH:mm", { locale: es });
