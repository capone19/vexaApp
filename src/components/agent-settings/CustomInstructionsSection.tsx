import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomInstruction, InstructionPriority } from "@/lib/types";

interface CustomInstructionsSectionProps {
  instructions: CustomInstruction[];
  onChange: (instructions: CustomInstruction[]) => void;
  sectionName?: string;
}

const priorityLabels: Record<InstructionPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const priorityColors: Record<InstructionPriority, string> = {
  alta: "text-destructive",
  media: "text-warning",
  baja: "text-muted-foreground",
};

export function CustomInstructionsSection({ 
  instructions, 
  onChange,
  sectionName = "esta sección"
}: CustomInstructionsSectionProps) {
  const [newInstruction, setNewInstruction] = useState("");
  const [newPriority, setNewPriority] = useState<InstructionPriority>("media");

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;

    const instruction: CustomInstruction = {
      id: `inst-${Date.now()}`,
      instruction: newInstruction.trim(),
      priority: newPriority,
    };

    onChange([...instructions, instruction]);
    setNewInstruction("");
    setNewPriority("media");
  };

  const handleDeleteInstruction = (id: string) => {
    onChange(instructions.filter(inst => inst.id !== id));
  };

  const handleUpdateInstruction = (id: string, field: "instruction" | "priority", value: string) => {
    onChange(
      instructions.map(inst =>
        inst.id === id
          ? { ...inst, [field]: value }
          : inst
      )
    );
  };

  return (
    <Card className="bg-card border-border mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Instrucciones personalizadas</CardTitle>
            <CardDescription>
              Agrega indicaciones específicas para {sectionName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header - Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-[1fr_140px_40px] gap-3 px-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Indicación personalizada
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Prioridad
          </span>
          <span></span>
        </div>

        {/* Existing instructions */}
        {instructions.length > 0 && (
          <div className="space-y-3">
            {/* Instruction rows */}
            {instructions.map((inst) => (
              <div
                key={inst.id}
                className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-muted/10 hover:border-primary/30 transition-colors sm:grid sm:grid-cols-[1fr_140px_40px] sm:items-start"
              >
                <Textarea
                  value={inst.instruction}
                  onChange={(e) => handleUpdateInstruction(inst.id, "instruction", e.target.value)}
                  placeholder="Escribe la indicación..."
                  className="min-h-[80px] bg-background border-border resize-none text-sm"
                />
                <div className="flex items-center gap-2 sm:contents">
                  <Select
                    value={inst.priority}
                    onValueChange={(value) => handleUpdateInstruction(inst.id, "priority", value as InstructionPriority)}
                  >
                    <SelectTrigger className={cn("flex-1 sm:flex-none bg-background border-border", priorityColors[inst.priority])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta" className="text-destructive">Alta</SelectItem>
                      <SelectItem value="media" className="text-warning">Media</SelectItem>
                      <SelectItem value="baja" className="text-muted-foreground">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteInstruction(inst.id)}
                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new instruction */}
        <div className={cn(instructions.length > 0 && "pt-2 border-t border-border")}>
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_140px_40px] sm:items-start">
            <Textarea
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)}
              placeholder="Escribe una nueva indicación..."
              className="min-h-[80px] bg-muted/30 border-border border-dashed resize-none text-sm"
            />
            <Select
              value={newPriority}
              onValueChange={(value) => setNewPriority(value as InstructionPriority)}
            >
              <SelectTrigger className="bg-muted/30 border-border border-dashed">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta" className="text-destructive">Alta</SelectItem>
                <SelectItem value="media" className="text-warning">Media</SelectItem>
                <SelectItem value="baja" className="text-muted-foreground">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden sm:block"></div>
          </div>
          
          <Button
            onClick={handleAddInstruction}
            disabled={!newInstruction.trim()}
            variant="outline"
            className="w-full mt-3 gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary"
          >
            <Plus className="h-4 w-4" />
            Agregar indicación personalizada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
