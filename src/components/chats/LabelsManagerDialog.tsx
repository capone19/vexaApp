// ============================================
// VEXA - Labels Manager Dialog
// ============================================

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tags, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { ChatLabel } from "@/hooks/use-chat-labels";

// Colores predefinidos para etiquetas
const PRESET_COLORS = [
  "#EC4899", // Pink
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#6366F1", // Indigo
];

interface LabelsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: ChatLabel[];
  onCreateLabel: (name: string, color: string) => Promise<any>;
  onUpdateLabel: (id: string, name: string, color: string) => Promise<boolean>;
  onDeleteLabel: (id: string) => Promise<boolean>;
}

export function LabelsManagerDialog({
  open,
  onOpenChange,
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: LabelsManagerDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    setIsSaving(true);
    const result = await onCreateLabel(newName.trim(), newColor);
    setIsSaving(false);
    
    if (result) {
      setNewName("");
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !newName.trim()) return;
    
    setIsSaving(true);
    const success = await onUpdateLabel(editingId, newName.trim(), newColor);
    setIsSaving(false);
    
    if (success) {
      setEditingId(null);
      setNewName("");
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteLabel(id);
  };

  const startEdit = (label: ChatLabel) => {
    setEditingId(label.id);
    setNewName(label.name);
    setNewColor(label.color);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Gestionar Etiquetas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Crea y organiza etiquetas para clasificar tus conversaciones.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Label List */}
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
            >
              {editingId === label.id ? (
                <>
                  <div
                    className="w-5 h-5 rounded-full shrink-0 cursor-pointer border-2 border-background"
                    style={{ backgroundColor: newColor }}
                  />
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 h-8"
                    placeholder="Nombre de etiqueta"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isSaving || !newName.trim()}
                    >
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 font-medium text-foreground">
                    {label.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(label)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(label.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}

          {labels.length === 0 && !isCreating && (
            <div className="text-center py-8 text-muted-foreground">
              <Tags className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay etiquetas creadas</p>
            </div>
          )}

          {/* Create Form */}
          {isCreating && (
            <div className="p-3 border border-border rounded-lg space-y-3">
              <div className="space-y-2">
                <Label htmlFor="label-name">Nombre</Label>
                <Input
                  id="label-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Urgente, VIP, Seguimiento..."
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        newColor === color 
                          ? "ring-2 ring-primary ring-offset-2" 
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCreate}
                  disabled={isSaving || !newName.trim()}
                  className="flex-1"
                >
                  Crear etiqueta
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        {!isCreating && !editingId && (
          <Button 
            onClick={() => {
              setIsCreating(true);
              setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
            }}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva etiqueta
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
