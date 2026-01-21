// ============================================
// VEXA - Label Selector Popover
// ============================================

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tags, Plus } from "lucide-react";
import { ChatLabel } from "@/hooks/use-chat-labels";
import { LabelBadge } from "./LabelBadge";

interface LabelSelectorProps {
  labels: ChatLabel[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string, isSelected: boolean) => Promise<void>;
  onManageLabels: () => void;
  trigger?: React.ReactNode;
}

export function LabelSelector({
  labels,
  selectedLabelIds,
  onToggleLabel,
  onManageLabels,
  trigger,
}: LabelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleToggle = async (labelId: string) => {
    const isSelected = selectedLabelIds.includes(labelId);
    setIsUpdating(labelId);
    await onToggleLabel(labelId, !isSelected);
    setIsUpdating(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Tags className="h-4 w-4" />
            Etiquetas
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {labels.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No hay etiquetas disponibles
            </div>
          ) : (
            labels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.id);
              const isLoading = isUpdating === label.id;
              
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggle(label.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <Checkbox 
                    checked={isSelected} 
                    className="pointer-events-none"
                  />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left text-sm text-foreground">
                    {label.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
        
        <div className="border-t border-border mt-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => {
              setOpen(false);
              onManageLabels();
            }}
          >
            <Plus className="h-4 w-4" />
            Gestionar etiquetas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
