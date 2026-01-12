import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  GitBranch,
  GripVertical 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesFlowStep } from "@/lib/types";

interface SalesFlowSectionProps {
  steps: SalesFlowStep[];
  onChange: (steps: SalesFlowStep[]) => void;
}

export function SalesFlowSection({ steps, onChange }: SalesFlowSectionProps) {
  const [newStep, setNewStep] = useState("");

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  const handleAddStep = () => {
    if (!newStep.trim()) return;

    const newStepItem: SalesFlowStep = {
      id: `step-${Date.now()}`,
      order: steps.length,
      instruction: newStep.trim(),
    };

    onChange([...steps, newStepItem]);
    setNewStep("");
  };

  const handleUpdateStep = (id: string, instruction: string) => {
    onChange(
      steps.map(step =>
        step.id === id ? { ...step, instruction } : step
      )
    );
  };

  const handleDeleteStep = (id: string) => {
    const filtered = steps.filter(step => step.id !== id);
    // Reorder remaining steps
    const reordered = filtered.map((step, index) => ({ ...step, order: index }));
    onChange(reordered);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...sortedSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    const reordered = newSteps.map((step, i) => ({ ...step, order: i }));
    onChange(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedSteps.length - 1) return;
    const newSteps = [...sortedSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    const reordered = newSteps.map((step, i) => ({ ...step, order: i }));
    onChange(reordered);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Flujo de venta</CardTitle>
            <CardDescription>
              Define los pasos que debe seguir tu agente en cada conversación
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps list */}
        {sortedSteps.length > 0 && (
          <div className="space-y-3">
            {sortedSteps.map((step, index) => (
              <div
                key={step.id}
                className="group relative flex items-start gap-3 p-4 rounded-xl border border-border bg-gradient-to-r from-muted/30 to-transparent hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {/* Step number */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-sm">
                    {index + 1}
                  </div>
                  {/* Connector line */}
                  {index < sortedSteps.length - 1 && (
                    <div className="w-0.5 h-full min-h-[20px] bg-border absolute top-14 left-[30px]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Textarea
                    value={step.instruction}
                    onChange={(e) => handleUpdateStep(step.id, e.target.value)}
                    placeholder="Describe este paso del flujo..."
                    className="min-h-[70px] bg-background/50 border-border resize-none text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-7 w-7"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedSteps.length - 1}
                    className="h-7 w-7"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteStep(step.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {sortedSteps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
            <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No hay pasos definidos</p>
            <p className="text-xs">Agrega los pasos que tu agente debe seguir</p>
          </div>
        )}

        {/* Add new step */}
        <div className={cn(
          "space-y-3 pt-4",
          sortedSteps.length > 0 && "border-t border-border"
        )}>
          <div className="flex items-start gap-3">
            {/* Next step number indicator */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-primary/40 text-primary/60 font-semibold text-sm">
              {sortedSteps.length + 1}
            </div>
            
            <div className="flex-1">
              <Textarea
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Describe el siguiente paso del flujo de conversación..."
                className="min-h-[70px] bg-muted/30 border-border border-dashed resize-none text-sm"
              />
            </div>
          </div>
          
          <Button
            onClick={handleAddStep}
            disabled={!newStep.trim()}
            variant="outline"
            className="w-full gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary"
          >
            <Plus className="h-4 w-4" />
            Agregar paso
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          El agente seguirá estos pasos en orden durante la conversación
        </p>
      </CardContent>
    </Card>
  );
}
