import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Unlock, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useBlockingMode } from './BlockingModeContext';
import { cn } from '@/lib/utils';

interface BlockingPanelProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const BlockingPanel = ({ selectedDate, onSelectDate }: BlockingPanelProps) => {
  const {
    isBlockingMode,
    selectedBlockDays,
    blockReason,
    setBlockReason,
    confirmBlock,
    exitBlockingMode,
    showSuccessMessage,
    undoLastBlock,
    lastBlockedRange,
    getBlockedDayInfo,
    isDateBlocked,
    unblockDay,
  } = useBlockingMode();

  // Check if selected date is blocked (for normal mode)
  const blockedInfo = getBlockedDayInfo(selectedDate);
  const isSelectedBlocked = isDateBlocked(selectedDate);

  // Format date range for display
  const getDateRangeText = () => {
    if (selectedBlockDays.length === 0) return null;
    
    const sorted = [...selectedBlockDays].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    if (sorted.length === 1) {
      return format(first, "d 'de' MMMM", { locale: es });
    }
    
    const sameMonth = first.getMonth() === last.getMonth();
    if (sameMonth) {
      return `Del ${format(first, 'd', { locale: es })} al ${format(last, "d 'de' MMMM", { locale: es })}`;
    }
    
    return `Del ${format(first, "d 'de' MMMM", { locale: es })} al ${format(last, "d 'de' MMMM", { locale: es })}`;
  };

  // Success message panel
  if (showSuccessMessage && lastBlockedRange) {
    const rangeText = lastBlockedRange.length === 1
      ? format(lastBlockedRange[0], "d 'de' MMMM", { locale: es })
      : `${lastBlockedRange.length} días`;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <h3 className="font-semibold">Días bloqueados correctamente</h3>
        </div>
        
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-foreground">
            Se han bloqueado {rangeText}
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={undoLastBlock}
          className="w-full"
        >
          Deshacer
        </Button>
      </div>
    );
  }

  // Blocking mode panel - show when in blocking mode
  if (isBlockingMode) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-foreground">Bloquear días</h3>
        </div>
        
        {selectedBlockDays.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecciona los días que deseas bloquear</p>
          </div>
        ) : (
          <>
            {/* Selected range display */}
            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-foreground">
                {getDateRangeText()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedBlockDays.length} {selectedBlockDays.length === 1 ? 'día seleccionado' : 'días seleccionados'}
              </p>
            </div>
            
            {/* Full day checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox id="fullDay" defaultChecked disabled />
              <Label htmlFor="fullDay" className="text-sm text-foreground cursor-pointer">
                Todo el día
              </Label>
            </div>
            
            {/* Reason input */}
            <div className="space-y-2">
              <Label htmlFor="blockReason" className="text-sm text-foreground">
                Motivo del bloqueo (opcional)
              </Label>
              <Textarea
                id="blockReason"
                placeholder="Vacaciones, evento, no atención…"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="resize-none h-20"
              />
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={confirmBlock}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white"
              >
                <Lock className="h-4 w-4 mr-2" />
                Confirmar bloqueo
              </Button>
              <Button
                variant="outline"
                onClick={exitBlockingMode}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Blocked day info panel - show when viewing a blocked day
  if (isSelectedBlocked && blockedInfo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-foreground">Día bloqueado</h3>
        </div>
        
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="font-medium text-foreground">
            {format(blockedInfo.date, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {blockedInfo.reason && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium">Motivo:</span> {blockedInfo.reason}
            </p>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => unblockDay(selectedDate)}
          className="w-full"
        >
          <Unlock className="h-4 w-4 mr-2" />
          Desbloquear día
        </Button>
      </div>
    );
  }

  // Return null - parent component should render normal content
  return null;
};
