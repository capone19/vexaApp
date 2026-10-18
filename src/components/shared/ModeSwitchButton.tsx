import Link from "next/link";
import { MessageSquare, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const STUDIO_HOME = "/studio";
export const CHAT_HOME = "/chats";

type Target = "studio" | "chat";

const targets: Record<Target, { href: string; label: string; hint: string; icon: React.ElementType }> = {
  studio: {
    href: STUDIO_HOME,
    label: "Content Studio",
    hint: "Gestiona YouTube, Instagram y TikTok",
    icon: Orbit,
  },
  chat: {
    href: CHAT_HOME,
    label: "VEXA Chat",
    hint: "Volver a chats y agente",
    icon: MessageSquare,
  },
};

interface ModeSwitchButtonProps {
  /** Modo al que lleva el botón */
  to: Target;
  /** icon: botón cuadrado para barras superiores. bar: fila completa para sidebars */
  variant?: "icon" | "bar";
  /** Solo para variant="bar": muestra el texto (sidebar expandido) */
  showLabel?: boolean;
  className?: string;
  onNavigate?: () => void;
}

/**
 * Botón para cambiar entre VEXA Chat (azul) y Content Studio (lila).
 */
export function ModeSwitchButton({ to, variant = "bar", showLabel = true, className, onNavigate }: ModeSwitchButtonProps) {
  const target = targets[to];
  const Icon = target.icon;
  const toStudio = to === "studio";

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={target.href}
            onClick={onNavigate}
            aria-label={target.label}
            className={cn(
              "group relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-95",
              toStudio
                ? "bg-[linear-gradient(135deg,#a78bfa,#e879f9_55%,#22d3ee)] text-white shadow-[0_6px_20px_-6px_rgba(167,139,250,0.8)] hover:shadow-[0_8px_28px_-6px_rgba(232,121,249,0.9)]"
                : "border border-border bg-secondary text-foreground hover:bg-accent",
              className
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", toStudio && "transition-transform duration-500 group-hover:rotate-180")} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">{target.label}</p>
          <p className="text-xs text-muted-foreground">{target.hint}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={target.href}
      onClick={onNavigate}
      title={!showLabel ? target.label : undefined}
      className={cn(
        "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
        showLabel ? "gap-3" : "justify-center",
        toStudio
          ? "bg-[linear-gradient(135deg,#a78bfa,#e879f9_55%,#22d3ee)] text-white shadow-[0_6px_20px_-8px_rgba(167,139,250,0.9)] hover:shadow-[0_10px_30px_-8px_rgba(232,121,249,0.9)]"
          : "border border-border bg-secondary/60 text-foreground hover:bg-accent",
        className
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", toStudio && "transition-transform duration-500 group-hover:rotate-180")} />
      {showLabel && (
        <span className="flex min-w-0 flex-col text-left leading-tight">
          <span className="truncate">{target.label}</span>
          <span className={cn("truncate text-[11px] font-normal", toStudio ? "text-white/80" : "text-muted-foreground")}>
            {target.hint}
          </span>
        </span>
      )}
    </Link>
  );
}
