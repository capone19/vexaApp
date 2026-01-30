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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  X,
  ExternalLink,
  Phone,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYCloudTemplates, type CreateTemplateInput } from '@/hooks/use-ycloud-templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ButtonConfig {
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
  text: string;
  url?: string;
  phone_number?: string;
}

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'es_MX', label: 'Español (México)' },
  { code: 'en', label: 'English' },
  { code: 'pt_BR', label: 'Português (Brasil)' },
];

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing', description: 'Promociones y ofertas' },
  { value: 'utility', label: 'Utilidad', description: 'Actualizaciones y transacciones' },
  { value: 'authentication', label: 'Autenticación', description: 'Códigos de verificación' },
];

export function CreateTemplateDialog({ open, onOpenChange }: Props) {
  const { createTemplate, isCreating } = useYCloudTemplates();
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('marketing');
  const [language, setLanguage] = useState('es');
  const [headerType, setHeaderType] = useState<'none' | 'TEXT'>('none');
  const [headerContent, setHeaderContent] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name) {
      newErrors.name = 'El nombre es requerido';
    } else if (!/^[a-z0-9_]+$/.test(name)) {
      newErrors.name = 'Solo letras minúsculas, números y guión bajo';
    }

    if (!bodyText) {
      newErrors.bodyText = 'El contenido es requerido';
    } else if (bodyText.length > 1024) {
      newErrors.bodyText = 'Máximo 1024 caracteres';
    }

    if (headerType === 'TEXT' && headerContent.length > 60) {
      newErrors.headerContent = 'Máximo 60 caracteres';
    }

    if (footerText.length > 60) {
      newErrors.footerText = 'Máximo 60 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const input: CreateTemplateInput = {
      name,
      category,
      language,
      headerType: headerType === 'none' ? null : headerType,
      headerContent: headerType === 'TEXT' ? headerContent : undefined,
      bodyText,
      footerText: footerText || undefined,
      buttons: buttons.length > 0 ? buttons : undefined,
    };

    await createTemplate.mutateAsync(input);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setCategory('marketing');
    setLanguage('es');
    setHeaderType('none');
    setHeaderContent('');
    setBodyText('');
    setFooterText('');
    setButtons([]);
    setErrors({});
    onOpenChange(false);
  };

  const addButton = (type: ButtonConfig['type']) => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type, text: '' }]);
  };

  const updateButton = (index: number, field: keyof ButtonConfig, value: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Preview render
  const previewBody = bodyText || 'Tu mensaje aparecerá aquí...';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Crear Template de WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre del template <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="mi_template_ejemplo"
                  className={cn(errors.name && 'border-destructive')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Solo letras minúsculas, números y guión bajo (_)
                </p>
              </div>

              {/* Category & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Header */}
              <div className="space-y-2">
                <Label>Encabezado (opcional)</Label>
                <Select value={headerType} onValueChange={(v) => setHeaderType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin encabezado</SelectItem>
                    <SelectItem value="TEXT">Texto</SelectItem>
                  </SelectContent>
                </Select>
                {headerType === 'TEXT' && (
                  <Input
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    placeholder="Texto del encabezado"
                    maxLength={60}
                    className={cn(errors.headerContent && 'border-destructive')}
                  />
                )}
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">
                  Contenido <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder={`Hola {{1}}, ¡gracias por contactarnos!

Tu cita está confirmada para {{2}}.

¿Tienes alguna pregunta?`}
                  rows={6}
                  className={cn(errors.bodyText && 'border-destructive')}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Usa {"{{1}}"}, {"{{2}}"}, etc. para variables</span>
                  <span className={cn(bodyText.length > 1024 && 'text-destructive')}>
                    {bodyText.length}/1024
                  </span>
                </div>
                {errors.bodyText && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.bodyText}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="space-y-2">
                <Label htmlFor="footer">Pie de mensaje (opcional)</Label>
                <Input
                  id="footer"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Responde STOP para cancelar"
                  maxLength={60}
                  className={cn(errors.footerText && 'border-destructive')}
                />
              </div>

              <Separator />

              {/* Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Botones (máximo 3)</Label>
                  {buttons.length < 3 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addButton('URL')}
                        className="gap-1 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addButton('PHONE_NUMBER')}
                        className="gap-1 text-xs"
                      >
                        <Phone className="h-3 w-3" />
                        Teléfono
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addButton('QUICK_REPLY')}
                        className="gap-1 text-xs"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Respuesta
                      </Button>
                    </div>
                  )}
                </div>

                {buttons.map((btn, i) => (
                  <div key={i} className="space-y-2 p-3 border rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {btn.type === 'URL' && 'URL'}
                        {btn.type === 'PHONE_NUMBER' && 'Teléfono'}
                        {btn.type === 'QUICK_REPLY' && 'Respuesta rápida'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeButton(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={btn.text}
                      onChange={(e) => updateButton(i, 'text', e.target.value)}
                      placeholder="Texto del botón"
                      maxLength={25}
                    />
                    {btn.type === 'URL' && (
                      <Input
                        value={btn.url || ''}
                        onChange={(e) => updateButton(i, 'url', e.target.value)}
                        placeholder="https://ejemplo.com"
                      />
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                      <Input
                        value={btn.phone_number || ''}
                        onChange={(e) => updateButton(i, 'phone_number', e.target.value)}
                        placeholder="+521234567890"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Preview */}
          <div className="space-y-3">
            <Label>Vista previa</Label>
            <div className="bg-[#E5DDD5] rounded-lg p-4 min-h-[300px]">
              <div className="bg-white rounded-lg shadow-sm max-w-[280px] ml-auto overflow-hidden">
                {/* Header */}
                {headerType === 'TEXT' && headerContent && (
                  <div className="px-3 pt-2">
                    <p className="font-semibold text-sm">{headerContent}</p>
                  </div>
                )}
                
                {/* Body */}
                <div className="px-3 py-2">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {previewBody}
                  </p>
                </div>

                {/* Footer */}
                {footerText && (
                  <div className="px-3 pb-1">
                    <p className="text-xs text-gray-500">{footerText}</p>
                  </div>
                )}

                {/* Timestamp */}
                <div className="px-3 pb-2 flex justify-end">
                  <span className="text-[10px] text-gray-400">12:00 ✓✓</span>
                </div>

                {/* Buttons */}
                {buttons.length > 0 && (
                  <div className="border-t">
                    {buttons.map((btn, i) => (
                      <button
                        key={i}
                        className="w-full px-3 py-2 text-sm text-[#00A884] font-medium flex items-center justify-center gap-2 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        {btn.type === 'URL' && <ExternalLink className="h-3.5 w-3.5" />}
                        {btn.type === 'PHONE_NUMBER' && <Phone className="h-3.5 w-3.5" />}
                        {btn.text || 'Botón'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Nota:</strong> Meta revisará este template antes de aprobarlo.
                El proceso puede tomar 24-48 horas.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating} className="gap-2">
            {isCreating ? (
              <>
                <Plus className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Crear template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
