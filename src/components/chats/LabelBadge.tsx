// ============================================
// VEXA - Label Badge Component
// ============================================

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface LabelBadgeProps {
  name: string;
  color: string;
  size?: "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

// Determinar si el color es claro u oscuro para el texto
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function LabelBadge({ 
  name, 
  color, 
  size = "sm", 
  onRemove, 
  onClick,
  className 
}: LabelBadgeProps) {
  const textColor = getContrastColor(color);
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      style={{ 
        backgroundColor: color,
        color: textColor,
      }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
        </button>
      )}
    </span>
  );
}
