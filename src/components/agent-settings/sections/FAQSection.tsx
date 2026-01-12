import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  HelpCircle,
  Lightbulb,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { FAQSettings, FAQItem } from "@/lib/types";
import { CustomInstructionsSection } from "../CustomInstructionsSection";

interface FAQSectionProps {
  settings: FAQSettings;
  onChange: (settings: FAQSettings) => void;
}

const emptyFAQ: Omit<FAQItem, "id" | "order"> = {
  question: "",
  answer: "",
};

export function FAQSection({ settings, onChange }: FAQSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [faqForm, setFaqForm] = useState<Omit<FAQItem, "id" | "order">>(emptyFAQ);

  const sortedItems = [...settings.items].sort((a, b) => a.order - b.order);

  const openAddDialog = () => {
    setEditingItem(null);
    setFaqForm(emptyFAQ);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: FAQItem) => {
    setEditingItem(item);
    setFaqForm({ question: item.question, answer: item.answer });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;

    if (editingItem) {
      // Edit existing
      const newItems = settings.items.map((item) =>
        item.id === editingItem.id
          ? { ...item, question: faqForm.question, answer: faqForm.answer }
          : item
      );
      onChange({ ...settings, items: newItems, lastModified: new Date() });
    } else {
      // Add new
      const newItem: FAQItem = {
        id: `faq-${Date.now()}`,
        question: faqForm.question,
        answer: faqForm.answer,
        order: settings.items.length,
      };
      onChange({
        ...settings,
        items: [...settings.items, newItem],
        lastModified: new Date(),
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (itemId: string) => {
    const newItems = settings.items
      .filter((item) => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index }));
    onChange({ ...settings, items: newItems, lastModified: new Date() });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...sortedItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const reorderedItems = newItems.map((item, i) => ({ ...item, order: i }));
    onChange({ ...settings, items: reorderedItems, lastModified: new Date() });
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedItems.length - 1) return;
    const newItems = [...sortedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const reorderedItems = newItems.map((item, i) => ({ ...item, order: i }));
    onChange({ ...settings, items: reorderedItems, lastModified: new Date() });
  };

  return (
    <div className="space-y-6">
      {/* Tip */}
      <Alert className="bg-primary/5 border-primary/20">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Consejo:</strong> Mantén las respuestas breves y actualizadas. 
          El agente usará estas FAQs para responder consultas frecuentes de forma consistente.
        </AlertDescription>
      </Alert>

      {/* Lista de FAQs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Preguntas frecuentes</CardTitle>
                <CardDescription>
                  {settings.items.length} pregunta{settings.items.length !== 1 ? "s" : ""} configurada{settings.items.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar pregunta
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Editar pregunta" : "Nueva pregunta frecuente"}
                  </DialogTitle>
                  <DialogDescription>
                    Define una pregunta común y su respuesta
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Pregunta</Label>
                    <Input
                      value={faqForm.question}
                      onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      placeholder="Ej: ¿Cuáles son los horarios de atención?"
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Respuesta</Label>
                    <Textarea
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      placeholder="Escribe la respuesta que dará el agente..."
                      className="bg-muted/30 border-border min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {faqForm.answer.length} / 500 caracteres recomendados
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingItem ? "Guardar cambios" : "Agregar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay preguntas frecuentes</p>
              <p className="text-sm">Agrega las consultas más comunes de tus clientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-4 hover:border-primary/30 transition-colors"
                >
                  {/* Drag handle + reorder buttons */}
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <GripVertical className="h-4 w-4 opacity-50" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedItems.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground mb-1">
                      {item.question}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.answer}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {sortedItems.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Ejemplo de uso</CardTitle>
            <CardDescription>
              Así responderá el agente cuando detecte esta pregunta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-end">
                <div className="bg-primary/20 border border-primary/30 rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{sortedItems[0].question}</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                  <p className="text-sm">{sortedItems[0].answer}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones personalizadas */}
      <CustomInstructionsSection
        instructions={settings.customInstructions || []}
        onChange={(customInstructions) => onChange({ ...settings, customInstructions, lastModified: new Date() })}
        sectionName="preguntas frecuentes"
      />
    </div>
  );
}
