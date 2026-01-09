import { cn } from "@/lib/utils";
import type { FunnelStage } from "@/lib/types";

interface FunnelStageBadgeProps {
  stage: FunnelStage;
  className?: string;
}

const stageConfig: Record<
  FunnelStage,
  { label: string; className: string }
> = {
  dead: {
    label: "Sin respuesta",
    className: "bg-muted text-muted-foreground border-muted",
  },
  warm: {
    label: "Warm",
    className: "bg-info/10 text-info border-info/30",
  },
  hot: {
    label: "Hot",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  converted: {
    label: "Convertido",
    className: "bg-success/10 text-success border-success/30",
  },
};

export function FunnelStageBadge({ stage, className }: FunnelStageBadgeProps) {
  const config = stageConfig[stage];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
