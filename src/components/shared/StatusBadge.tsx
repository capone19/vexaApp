import { cn } from "@/lib/utils";
import type { AppointmentStatus, ChatStatus, TemplateStatus } from "@/lib/types";

type Status = AppointmentStatus | ChatStatus | TemplateStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Appointment statuses
  confirmed: {
    label: "Confirmado",
    className: "bg-success/10 text-success border-success/30",
  },
  pending: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  canceled: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  // Chat statuses
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border-success/30",
  },
  closed: {
    label: "Cerrado",
    className: "bg-muted text-muted-foreground border-muted",
  },
  // Template statuses
  approved: {
    label: "Aprobado",
    className: "bg-success/10 text-success border-success/30",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

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
