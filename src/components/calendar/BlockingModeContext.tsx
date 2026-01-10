import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { isSameDay, eachDayOfInterval, isBefore, isAfter } from 'date-fns';

export interface BlockedDay {
  date: Date;
  reason?: string;
  isFullDay: boolean;
}

interface BlockingModeContextType {
  isBlockingMode: boolean;
  selectedBlockDays: Date[];
  blockedDays: BlockedDay[];
  blockReason: string;
  isDragging: boolean;
  dragStartDate: Date | null;
  setIsBlockingMode: (value: boolean) => void;
  setBlockReason: (value: string) => void;
  toggleBlockDay: (date: Date) => void;
  selectRangeTo: (endDate: Date) => void;
  startDrag: (date: Date) => void;
  updateDragSelection: (date: Date) => void;
  endDrag: () => void;
  clearSelection: () => void;
  confirmBlock: () => void;
  unblockDay: (date: Date) => void;
  isDateBlocked: (date: Date) => boolean;
  isDateSelected: (date: Date) => boolean;
  getBlockedDayInfo: (date: Date) => BlockedDay | undefined;
  exitBlockingMode: () => void;
  showSuccessMessage: boolean;
  undoLastBlock: () => void;
  lastBlockedRange: Date[] | null;
}

const BlockingModeContext = createContext<BlockingModeContextType | undefined>(undefined);

export const useBlockingMode = () => {
  const context = useContext(BlockingModeContext);
  if (!context) {
    throw new Error('useBlockingMode must be used within a BlockingModeProvider');
  }
  return context;
};

interface BlockingModeProviderProps {
  children: ReactNode;
}

export const BlockingModeProvider = ({ children }: BlockingModeProviderProps) => {
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [selectedBlockDays, setSelectedBlockDays] = useState<Date[]>([]);
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [blockReason, setBlockReason] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastBlockedRange, setLastBlockedRange] = useState<Date[] | null>(null);

  const toggleBlockDay = useCallback((date: Date) => {
    setSelectedBlockDays(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) {
        return prev.filter(d => !isSameDay(d, date));
      }
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  }, []);

  const selectRangeTo = useCallback((endDate: Date) => {
    if (selectedBlockDays.length === 0) {
      setSelectedBlockDays([endDate]);
      return;
    }
    
    const startDate = selectedBlockDays[0];
    const [start, end] = isBefore(startDate, endDate) 
      ? [startDate, endDate] 
      : [endDate, startDate];
    
    const range = eachDayOfInterval({ start, end });
    setSelectedBlockDays(range);
  }, [selectedBlockDays]);

  const startDrag = useCallback((date: Date) => {
    setIsDragging(true);
    setDragStartDate(date);
    setSelectedBlockDays([date]);
  }, []);

  // Update selection while dragging (called on mouseEnter)
  const updateDragSelection = useCallback((date: Date) => {
    if (!isDragging || !dragStartDate) return;
    
    const [start, end] = isBefore(dragStartDate, date)
      ? [dragStartDate, date]
      : [date, dragStartDate];
    
    const range = eachDayOfInterval({ start, end });
    setSelectedBlockDays(range);
  }, [isDragging, dragStartDate]);

  // End drag (called on mouseUp)
  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStartDate(null);
  }, [isDragging]);

  const clearSelection = useCallback(() => {
    setSelectedBlockDays([]);
    setBlockReason('');
    setIsDragging(false);
    setDragStartDate(null);
  }, []);

  const confirmBlock = useCallback(() => {
    if (selectedBlockDays.length === 0) return;
    
    const newBlockedDays: BlockedDay[] = selectedBlockDays.map(date => ({
      date,
      reason: blockReason || undefined,
      isFullDay: true,
    }));
    
    setBlockedDays(prev => {
      // Remove any existing blocked days that are being re-blocked
      const filtered = prev.filter(
        bd => !selectedBlockDays.some(sd => isSameDay(bd.date, sd))
      );
      return [...filtered, ...newBlockedDays];
    });
    
    setLastBlockedRange([...selectedBlockDays]);
    setShowSuccessMessage(true);
    setSelectedBlockDays([]);
    setBlockReason('');
    setIsBlockingMode(false);
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000);
  }, [selectedBlockDays, blockReason]);

  const undoLastBlock = useCallback(() => {
    if (!lastBlockedRange) return;
    
    setBlockedDays(prev => 
      prev.filter(bd => !lastBlockedRange.some(lr => isSameDay(bd.date, lr)))
    );
    setLastBlockedRange(null);
    setShowSuccessMessage(false);
  }, [lastBlockedRange]);

  const unblockDay = useCallback((date: Date) => {
    setBlockedDays(prev => prev.filter(bd => !isSameDay(bd.date, date)));
  }, []);

  const isDateBlocked = useCallback((date: Date) => {
    return blockedDays.some(bd => isSameDay(bd.date, date));
  }, [blockedDays]);

  const isDateSelected = useCallback((date: Date) => {
    return selectedBlockDays.some(d => isSameDay(d, date));
  }, [selectedBlockDays]);

  const getBlockedDayInfo = useCallback((date: Date) => {
    return blockedDays.find(bd => isSameDay(bd.date, date));
  }, [blockedDays]);

  const exitBlockingMode = useCallback(() => {
    setIsBlockingMode(false);
    clearSelection();
  }, [clearSelection]);

  return (
    <BlockingModeContext.Provider
      value={{
        isBlockingMode,
        selectedBlockDays,
        blockedDays,
        blockReason,
        isDragging,
        dragStartDate,
        setIsBlockingMode,
        setBlockReason,
        toggleBlockDay,
        selectRangeTo,
        startDrag,
        updateDragSelection,
        endDrag,
        clearSelection,
        confirmBlock,
        unblockDay,
        isDateBlocked,
        isDateSelected,
        getBlockedDayInfo,
        exitBlockingMode,
        showSuccessMessage,
        undoLastBlock,
        lastBlockedRange,
      }}
    >
      {children}
    </BlockingModeContext.Provider>
  );
};
