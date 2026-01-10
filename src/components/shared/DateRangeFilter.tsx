import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import type { DateRangePreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const presets: { value: DateRangePreset; label: string; shortLabel: string }[] = [
  { value: "7d", label: "Últimos 7 días", shortLabel: "7 días" },
  { value: "30d", label: "Últimos 30 días", shortLabel: "30 días" },
  { value: "90d", label: "Últimos 90 días", shortLabel: "90 días" },
  { value: "ytd", label: "Año en curso", shortLabel: "Año" },
  { value: "all", label: "Desde el inicio", shortLabel: "Todo" },
];

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const isMobile = useIsMobile();
  const current = presets.find((p) => p.value === value) || presets[1];

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
      <DropdownMenuContent align="end" className="w-48">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={cn(
              "cursor-pointer",
              preset.value === value && "bg-secondary font-medium"
            )}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
