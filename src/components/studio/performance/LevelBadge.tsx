import { Flame, Minus, Rocket, TrendingDown, Clock } from "lucide-react";
import { LEVEL_LABELS, ratioLabel, type PerformanceLevel } from "@/lib/studio/performance";
import { cn } from "@/lib/utils";

const STYLES: Record<PerformanceLevel, { className: string; icon: React.ElementType }> = {
  viral: { className: "bg-amber-500/15 text-amber-300 ring-amber-500/40", icon: Flame },
  sobresaliente: { className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", icon: Rocket },
  normal: { className: "bg-secondary text-muted-foreground ring-border", icon: Minus },
  bajo: { className: "bg-rose-500/10 text-rose-300 ring-rose-500/25", icon: TrendingDown },
  "sin-base": { className: "bg-secondary/60 text-muted-foreground ring-border", icon: Clock },
};

/** Etiqueta de rendimiento: cuántas veces supera lo normal del canal */
export function LevelBadge({ level, ratio, compact }: { level: PerformanceLevel; ratio: number | null; compact?: boolean }) {
  const s = STYLES[level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", s.className)}>
      <s.icon className="h-3 w-3" />
      {ratio !== null && <span className="tabular-nums">{ratioLabel(ratio)}</span>}
      {!compact && <span className="font-medium">{LEVEL_LABELS[level]}</span>}
    </span>
  );
}
