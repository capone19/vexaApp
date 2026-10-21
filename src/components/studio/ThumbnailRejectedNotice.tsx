import { Download, ExternalLink, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/studio/thumbnails";
import { studioEditUrl } from "@/lib/studio/video-tasks";
import { SHORT_THUMBNAIL_REJECTED } from "@/lib/studio/youtube-draft";
import { cn } from "@/lib/utils";

/** YouTube no aceptó la miniatura del Short: link directo a YouTube Studio y la imagen lista para subir a mano */
export function ThumbnailRejectedNotice({
  videoId,
  file,
  title,
  onDismiss,
  className,
}: {
  videoId: string;
  file: File;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:flex-row sm:items-center", className)}>
      <p className="flex min-w-0 flex-1 items-start gap-2 text-amber-200">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {title && <strong className="text-foreground">{title}: </strong>}
          {SHORT_THUMBNAIL_REJECTED}
        </span>
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="sm" variant="secondary" className="gap-1.5" asChild>
          <a href={studioEditUrl(videoId)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir en YouTube Studio
          </a>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadFile(file, file.name)}>
          <Download className="h-4 w-4" />
          Bajar miniatura
        </Button>
        {onDismiss && (
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onDismiss} aria-label="Cerrar aviso">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
