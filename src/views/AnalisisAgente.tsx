import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AnalisisSection } from "@/components/analisis-agente/AnalisisSection";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function AnalisisAgente() {
  const isMobile = useIsMobile();

  return (
    <MainLayout>
      <div className={cn("space-y-4", isMobile ? "pb-4" : "")}>
        {!isMobile && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/ajustes-agente"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Ajustes del Agente
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-medium">
                  Análisis del agente
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        <div>
          <h1 className={cn("font-semibold text-foreground", isMobile ? "text-lg" : "text-2xl")}>
            Análisis del agente
          </h1>
          <p className="text-sm text-muted-foreground">
            Qué está pasando en las conversaciones
          </p>
        </div>

        <AnalisisSection />
      </div>
    </MainLayout>
  );
}
