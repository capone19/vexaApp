import { MousePointer2 } from 'lucide-react';
import { useBlockingMode } from './BlockingModeContext';
import { cn } from '@/lib/utils';

export const BlockingModeOverlay = () => {
  const { isBlockingMode, selectedBlockDays } = useBlockingMode();

  if (!isBlockingMode) return null;

  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-3 px-4 rounded-lg mb-4",
      "bg-slate-100 dark:bg-slate-800/80",
      "border border-dashed border-slate-300 dark:border-slate-600",
      "text-sm text-slate-600 dark:text-slate-300",
      "animate-fade-in"
    )}>
      <MousePointer2 className="h-4 w-4" />
      <span>
        {selectedBlockDays.length === 0 
          ? 'Selecciona uno o más días para bloquear'
          : `${selectedBlockDays.length} ${selectedBlockDays.length === 1 ? 'día seleccionado' : 'días seleccionados'}`
        }
      </span>
    </div>
  );
};
