import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountStatus, PostStatus } from "@/lib/studio/types";

export function StudioPageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {icon}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StudioCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("studio-glass rounded-2xl p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      IA
    </span>
  );
}

export function SoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Próximamente
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/40 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Demo
    </span>
  );
}

const accountStatus: Record<AccountStatus, { label: string; className: string }> = {
  conectada: { label: "Conectada", className: "bg-success-soft text-success-soft-foreground" },
  pendiente: { label: "Pendiente", className: "bg-warning-soft text-warning-soft-foreground" },
  error: { label: "Error", className: "bg-error-soft text-error-soft-foreground" },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const s = accountStatus[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", s.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const postStatus: Record<PostStatus, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-secondary text-muted-foreground" },
  programado: { label: "Programado", className: "bg-info-soft text-info-soft-foreground" },
  procesando: { label: "Procesando", className: "bg-primary/15 text-primary" },
  publicado: { label: "Publicado", className: "bg-success-soft text-success-soft-foreground" },
  error: { label: "Error", className: "bg-error-soft text-error-soft-foreground" },
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const s = postStatus[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", s.className)}>{s.label}</span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
