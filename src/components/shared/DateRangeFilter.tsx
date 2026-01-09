import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRangePreset } from "@/lib/types";

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset, startDate?: Date, endDate?: Date) => void;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "custom", label: "Personalizado" },
];

export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [customRange, setCustomRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {presets.map((preset) =>
        preset.value === "custom" ? (
          <Popover key={preset.value}>
            <PopoverTrigger asChild>
              <Button
                variant={value === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-2",
                  value === "custom" && "bg-primary text-primary-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {customRange.from && customRange.to ? (
                  <>
                    {format(customRange.from, "dd MMM", { locale: es })} -{" "}
                    {format(customRange.to, "dd MMM", { locale: es })}
                  </>
                ) : (
                  preset.label
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: customRange.from,
                  to: customRange.to,
                }}
                onSelect={(range) => {
                  setCustomRange({ from: range?.from, to: range?.to });
                  if (range?.from && range?.to) {
                    onChange("custom", range.from, range.to);
                  }
                }}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            key={preset.value}
            variant={value === preset.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8",
              value === preset.value && "bg-primary text-primary-foreground"
            )}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </Button>
        )
      )}
    </div>
  );
}
