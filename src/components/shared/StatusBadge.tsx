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
    className: "bg-success/10 text-success-soft-foreground",
  },
  pending: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning-soft-foreground",
  },
  canceled: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive",
  },
  completed: {
    label: "Completado",
    className: "bg-primary/10 text-primary",
  },
  no_show: {
    label: "No asistió",
    className: "bg-muted text-muted-foreground",
  },
  // Chat statuses
  active: {
    label: "Activo",
    className: "bg-success/10 text-success-soft-foreground",
  },
  closed: {
    label: "Cerrado",
    className: "bg-secondary text-muted-foreground",
  },
  // Template statuses
  approved: {
    label: "Aprobado",
    className: "bg-success/10 text-success-soft-foreground",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-secondary text-muted-foreground",
  };

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
