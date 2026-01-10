import { MousePointer2, MousePointerClick } from 'lucide-react';
import { useBlockingMode } from './BlockingModeContext';
import { cn } from '@/lib/utils';

export const BlockingModeOverlay = () => {
  const { isBlockingMode, selectedBlockDays } = useBlockingMode();

  if (!isBlockingMode) return null;

  // Show helpful hint when no days selected, show count when days are selected
  const showHint = selectedBlockDays.length === 0;

  return (
    <div className={cn(
      "flex items-center justify-center gap-3 py-3 px-4 rounded-lg mb-4",
      "bg-slate-100 dark:bg-slate-800/80",
      "border border-dashed border-slate-300 dark:border-slate-600",
      "text-sm text-slate-600 dark:text-slate-300",
      "animate-fade-in"
    )}>
      {showHint ? (
        <>
          <MousePointerClick className="h-4 w-4 flex-shrink-0" />
          <span className="text-center">
            <span className="font-medium">Clic</span> para un día · <span className="font-medium">Arrastra</span> para varios
          </span>
        </>
      ) : (
        <>
          <MousePointer2 className="h-4 w-4 flex-shrink-0" />
          <span>
            {selectedBlockDays.length} {selectedBlockDays.length === 1 ? 'día seleccionado' : 'días seleccionados'}
          </span>
        </>
      )}
    </div>
  );
};
