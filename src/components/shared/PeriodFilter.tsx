import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type PeriodPreset = "current" | "previous" | "all";

interface PeriodInfo {
  startDate: Date;
  endDate: Date;
  label: string;
}

const presets: { value: PeriodPreset; label: string; shortLabel: string }[] = [
  { value: "current", label: "Período Actual", shortLabel: "Actual" },
  { value: "previous", label: "Período Anterior", shortLabel: "Anterior" },
  { value: "all", label: "Todo el historial", shortLabel: "Todo" },
];

interface PeriodFilterProps {
  value: PeriodPreset;
  onChange: (value: PeriodPreset) => void;
  periodInfo?: {
    current: { start: Date; end: Date };
    previous: { start: Date; end: Date };
  };
}

export function PeriodFilter({ value, onChange, periodInfo }: PeriodFilterProps) {
  const isMobile = useIsMobile();
  const current = presets.find((p) => p.value === value) || presets[0];

  // Mostrar las fechas del período seleccionado
  const getPeriodDates = () => {
    if (!periodInfo) return null;
    
    if (value === "current") {
      return `${format(periodInfo.current.start, 'd MMM', { locale: es })} - ${format(periodInfo.current.end, 'd MMM', { locale: es })}`;
    }
    if (value === "previous") {
      return `${format(periodInfo.previous.start, 'd MMM', { locale: es })} - ${format(periodInfo.previous.end, 'd MMM', { locale: es })}`;
    }
    return null;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={isMobile ? "sm" : "default"}
          className={cn(
            "gap-2 border-border bg-background",
            isMobile && "text-xs"
          )}
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">{current.label}</span>
          <span className="sm:hidden">{current.shortLabel}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={cn(
              "cursor-pointer flex flex-col items-start",
              preset.value === value && "bg-secondary font-medium"
            )}
          >
            <span>{preset.label}</span>
            {periodInfo && preset.value === "current" && (
              <span className="text-xs text-muted-foreground">
                {format(periodInfo.current.start, 'd MMM', { locale: es })} - {format(periodInfo.current.end, 'd MMM', { locale: es })}
              </span>
            )}
            {periodInfo && preset.value === "previous" && (
              <span className="text-xs text-muted-foreground">
                {format(periodInfo.previous.start, 'd MMM', { locale: es })} - {format(periodInfo.previous.end, 'd MMM', { locale: es })}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Calcula los períodos de facturación basado en la fecha de creación del tenant
 * @param tenantCreatedAt - Fecha de creación del tenant
 * @returns Objeto con período actual y anterior
 */
export function calculatePeriods(tenantCreatedAt: Date | string | null | undefined): {
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
} {
  const now = new Date();
  
  // Si no hay fecha de creación, usar el día 1 del mes
  const creationDate = tenantCreatedAt ? new Date(tenantCreatedAt) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfMonth = creationDate.getDate();
  
  // Calcular inicio del período actual
  let currentStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // Si aún no llegamos a ese día del mes, el período empezó el mes pasado
  if (now.getDate() < dayOfMonth) {
    currentStart.setMonth(currentStart.getMonth() - 1);
  }
  
  // Fin del período actual: un mes después del inicio, menos 1 día
  const currentEnd = new Date(currentStart);
  currentEnd.setMonth(currentEnd.getMonth() + 1);
  currentEnd.setDate(currentEnd.getDate() - 1);
  currentEnd.setHours(23, 59, 59, 999);
  
  // Período anterior: el mes antes del actual
  const previousStart = new Date(currentStart);
  previousStart.setMonth(previousStart.getMonth() - 1);
  
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);
  
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
}

