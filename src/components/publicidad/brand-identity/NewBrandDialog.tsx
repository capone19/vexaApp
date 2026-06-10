import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  isCreating?: boolean;
}

export function NewBrandDialog({ open, onOpenChange, onCreate, isCreating }: NewBrandDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed.toUpperCase());
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva marca</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nombre de marca
            </Label>
            <Input
              id="brand-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. WELL-V"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Este nombre es único y no se puede cambiar después.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="bg-primary"
            >
              {isCreating ? 'Creando...' : 'Crear marca'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
