import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBlockingMode } from './BlockingModeContext';
import type { Appointment } from '@/lib/types';

interface CalendarDayCellProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: Appointment[];
  onSelect: (date: Date) => void;
}

export const CalendarDayCell = ({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  appointments,
  onSelect,
}: CalendarDayCellProps) => {
  const {
    isBlockingMode,
    isDateBlocked,
    isDateSelected,
    toggleBlockDay,
    startDrag,
    updateDragSelection,
    endDrag,
    isDragging,
  } = useBlockingMode();

  const blocked = isDateBlocked(day);
  const selectedForBlock = isDateSelected(day);

  // Track if we actually dragged to another day
  const handleClick = () => {
    if (isBlockingMode) {
      // Click is handled by mouseDown/mouseUp for blocking mode
      return;
    }
    // Allow clicking on blocked days to show unblock option
    onSelect(day);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isBlockingMode && !blocked) {
      e.preventDefault();
      startDrag(day);
    }
  };

  const handleMouseEnter = () => {
    if (isBlockingMode && isDragging && !blocked) {
      updateDragSelection(day);
    }
  };

  const handleMouseUp = () => {
    if (isBlockingMode && !blocked) {
      // If not dragging (simple click), toggle the day
      if (!isDragging) {
        toggleBlockDay(day);
      } else {
        endDrag();
      }
    }
  };

  // Base classes
  const baseClasses = "aspect-square p-1 rounded-lg text-sm transition-all duration-200 relative select-none overflow-hidden";
  
  // Determine the visual state
  let stateClasses = "";
  
  if (blocked) {
    // Blocked day - with diagonal stripes pattern, but still clickable
    stateClasses = cn(
      "bg-slate-100 dark:bg-slate-800",
      "text-slate-400 dark:text-slate-500",
      "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600"
    );
  } else if (isBlockingMode && selectedForBlock) {
    // Selected for blocking - slate/blue-gray with opacity
    stateClasses = cn(
      "bg-slate-300/70 dark:bg-slate-600/70",
      "text-slate-700 dark:text-slate-200",
      "ring-2 ring-slate-400 dark:ring-slate-500",
      "cursor-pointer"
    );
  } else if (isBlockingMode) {
    // Blocking mode hover state
    stateClasses = cn(
      "cursor-pointer",
      "hover:bg-slate-200/60 dark:hover:bg-slate-700/60",
      "hover:ring-1 hover:ring-dashed hover:ring-slate-400 dark:hover:ring-slate-500",
      !isCurrentMonth && "text-muted-foreground/50"
    );
  } else if (isSelected && !isBlockingMode) {
    // Normal selected day
    stateClasses = "bg-primary text-primary-foreground hover:bg-primary";
  } else {
    // Normal day
    stateClasses = cn(
      "hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50",
      !isCurrentMonth && "text-muted-foreground/50",
      isToday && "ring-1 ring-primary"
    );
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      className={cn(baseClasses, stateClasses)}
    >
      {/* Diagonal stripes pattern for blocked days */}
      {blocked && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              hsl(var(--muted-foreground) / 0.3) 4px,
              hsl(var(--muted-foreground) / 0.3) 6px
            )`
          }}
        />
      )}
      
      <span className={cn("block relative z-10", blocked && "opacity-60")}>
        {format(day, 'd')}
      </span>
      
      {/* Appointment dots - hidden when blocked */}
      {!blocked && appointments.length > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
          {appointments.slice(0, 3).map((apt, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                // Diferentes colores según tipo y status
                apt.type === 'product' 
                  ? "bg-primary" // Productos en color primario
                  : apt.status === 'confirmed' && "bg-success",
                apt.type === 'service' && apt.status === 'pending' && "bg-warning",
                apt.type === 'service' && apt.status === 'canceled' && "bg-destructive"
              )}
            />
          ))}
        </div>
      )}
    </button>
  );
};