// ============================================
// VEXA - Label Filter Bar
// ============================================

import { ChatLabel } from "@/hooks/use-chat-labels";
import { LabelBadge } from "./LabelBadge";
import { cn } from "@/lib/utils";

interface LabelFilterBarProps {
  labels: ChatLabel[];
  selectedLabelIds: string[];
  onToggleFilter: (labelId: string) => void;
  className?: string;
}

export function LabelFilterBar({
  labels,
  selectedLabelIds,
  onToggleFilter,
  className,
}: LabelFilterBarProps) {
  if (labels.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-xs text-muted-foreground">Filtrar por etiqueta</span>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const isSelected = selectedLabelIds.includes(label.id);
          
          return (
            <button
              key={label.id}
              onClick={() => onToggleFilter(label.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all",
                isSelected
                  ? "ring-2 ring-primary ring-offset-1"
                  : "opacity-70 hover:opacity-100"
              )}
              style={{
                backgroundColor: isSelected ? label.color : 'transparent',
                borderColor: label.color,
                color: isSelected ? getContrastColor(label.color) : label.color,
              }}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isSelected && "hidden"
                )}
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Determinar si el color es claro u oscuro para el texto
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
