import { format, isSameDay } from 'date-fns';
import { Ban } from 'lucide-react';
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
    endDrag,
    isDragging,
  } = useBlockingMode();

  const blocked = isDateBlocked(day);
  const selectedForBlock = isDateSelected(day);

  const handleClick = () => {
    if (isBlockingMode) {
      if (!blocked) {
        toggleBlockDay(day);
      }
    } else {
      onSelect(day);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isBlockingMode && !blocked) {
      e.preventDefault();
      startDrag(day);
    }
  };

  const handleMouseEnter = () => {
    if (isBlockingMode && isDragging && !blocked) {
      endDrag(day);
    }
  };

  const handleMouseUp = () => {
    if (isBlockingMode && isDragging) {
      endDrag(day);
    }
  };

  // Base classes
  const baseClasses = "aspect-square p-1 rounded-lg text-sm transition-all duration-200 relative select-none";
  
  // Determine the visual state
  let stateClasses = "";
  
  if (blocked) {
    // Blocked day - gray, striped pattern
    stateClasses = cn(
      "bg-slate-100 dark:bg-slate-800",
      "text-slate-400 dark:text-slate-500",
      "cursor-default",
      !isBlockingMode && "hover:bg-slate-200 dark:hover:bg-slate-700"
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
      disabled={blocked && !isBlockingMode}
    >
      <span className="block">{format(day, 'd')}</span>
      
      {/* Blocked indicator */}
      {blocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Ban className="h-6 w-6 text-slate-300 dark:text-slate-600 opacity-50" />
        </div>
      )}
      
      {/* Appointment dots - hidden when blocked */}
      {!blocked && appointments.length > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {appointments.slice(0, 3).map((apt, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                apt.status === 'confirmed' && "bg-success",
                apt.status === 'pending' && "bg-warning",
                apt.status === 'canceled' && "bg-destructive"
              )}
            />
          ))}
        </div>
      )}
    </button>
  );
};
