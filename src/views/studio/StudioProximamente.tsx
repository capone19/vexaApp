import Link from "next/link";
import { notFound, useParams, usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { SoonBadge, StudioCard, StudioPageHeader } from "@/components/studio/StudioUI";
import { isPlatformId, PLATFORMS } from "@/lib/studio/platforms";
import type { PlatformId } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  programar: "Programación",
  analisis: "Análisis",
  rendimiento: "Rendimiento",
};

/** Sección que todavía no está lista: explica qué traerá y lleva a lo que ya funciona */
export function ComingSoon({
  platform,
  section,
  description,
  features,
}: {
  platform: PlatformId;
  section: string;
  description: string;
  features: string[];
}) {
  const meta = PLATFORMS[platform];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StudioPageHeader
        eyebrow={meta.name}
        title={section}
        subtitle={description}
        icon={
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", meta.chipClassName)}>
            <PlatformIcon platform={platform} className="h-7 w-7" />
          </span>
        }
      />
      <StudioCard className={cn("relative overflow-hidden bg-gradient-to-br p-6 md:p-8", meta.gradientClassName)}>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Hourglass className="h-6 w-6" />
          </span>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">Lo estamos preparando</p>
              <SoonBadge />
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </StudioCard>
      {platform === "instagram" && (
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-1.5">
            <Link href="/studio/instagram/programar">
              <CalendarDays className="h-4 w-4" />
              Ir a Programación
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-1.5">
            <Link href="/studio/instagram">
              Volver a Instagram
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** Vista genérica de las plataformas que aún no tienen esta sección */
export default function StudioProximamente() {
  const params = useParams<{ plataforma: string }>();
  const pathname = usePathname() ?? "";
  const platform = params?.plataforma;
  if (!isPlatformId(platform)) notFound();
  const section = SECTION_LABELS[pathname.split("/").pop() ?? ""] ?? "Sección";
  return (
    <ComingSoon
      platform={platform}
      section={section}
      description={`Esta sección de ${PLATFORMS[platform].name} llega pronto al Content Studio.`}
      features={["Mismo diseño que las secciones de YouTube", "Conectada a tus cuentas gestionadas"]}
    />
  );
}
