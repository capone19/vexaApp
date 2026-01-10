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
      <div className="space-y-5">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg shadow-slate-500/20">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Día bloqueado</h3>
            <p className="text-xs text-muted-foreground">No se aceptan reservas</p>
          </div>
        </div>
        
        {/* Date card with stripes pattern */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          {/* Decorative stripes */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 8px,
                hsl(var(--foreground)) 8px,
                hsl(var(--foreground)) 10px
              )`
            }}
          />
          
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-foreground capitalize">
                  {format(blockedInfo.date, "EEEE", { locale: es })}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {format(blockedInfo.date, "d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                Bloqueado
              </div>
            </div>
            
            {blockedInfo.reason && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Motivo</p>
                <p className="text-sm text-foreground">{blockedInfo.reason}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Unblock button - premium style */}
        <Button
          onClick={() => unblockDay(selectedDate)}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20 transition-all duration-300"
        >
          <span className="relative flex items-center justify-center gap-2">
            <Unlock className="h-4 w-4 transition-transform group-hover:scale-110" />
            Desbloquear día
          </span>
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Al desbloquear, este día volverá a aceptar reservas
        </p>
      </div>
    );
  }

  // Return null - parent component should render normal content
  return null;
};
