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
    className: "bg-secondary text-muted-foreground",
  },
  warm: {
    label: "En progreso",
    className: "bg-info/10 text-info",
  },
  hot: {
    label: "Alta intención",
    className: "bg-warning/10 text-warning",
  },
  converted: {
    label: "Conversión",
    className: "bg-success/10 text-success",
  },
};

export function FunnelStageBadge({ stage, className }: FunnelStageBadgeProps) {
  const config = stageConfig[stage];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
