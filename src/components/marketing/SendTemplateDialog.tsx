// ============================================
// VEXA - Diálogo para enviar mensajes WhatsApp
// ============================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  User,
  Users,
  AlertTriangle,
  Wallet,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useSendTemplate, parsePhoneNumbers, extractTemplateVariables } from '@/hooks/use-send-template';
import { useMessagingCredits } from '@/hooks/use-messaging-credits';
import { getMessagePrice, formatPrice } from '@/lib/messaging-pricing';
import type { WhatsAppTemplate } from '@/hooks/use-ycloud-templates';
import { cn } from '@/lib/utils';

interface SendTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WhatsAppTemplate | null;
}

export function SendTemplateDialog({ open, onOpenChange, template }: SendTemplateDialogProps) {
  const navigate = useNavigate();
  const { sendSingle, sendBulk, isSending } = useSendTemplate();
  const { balance, isLoading: isLoadingBalance } = useMessagingCredits();

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [singlePhone, setSinglePhone] = useState('');
  const [bulkPhones, setBulkPhones] = useState('');
  const [variables, setVariables] = useState<Record<number, string>>({});

  // Detectar variables en el template
  const templateVariables = useMemo(() => {
    if (!template) return [];
    return extractTemplateVariables(template.body_text);
  }, [template]);

  // Parsear números en modo masivo
  const parsedNumbers = useMemo(() => {
    if (mode === 'single') return singlePhone.trim() ? [singlePhone.trim()] : [];
    return parsePhoneNumbers(bulkPhones);
  }, [mode, singlePhone, bulkPhones]);

  // Calcular costo
  const pricePerMessage = template ? getMessagePrice(template.category) : 0;
  const estimatedCost = parsedNumbers.length * pricePerMessage;
  const balanceAfter = balance - estimatedCost;
  const hasInsufficientBalance = estimatedCost > 0 && balance < estimatedCost;

  // Verificar si se puede enviar
  const canSend = useMemo(() => {
    if (!template) return false;
    if (parsedNumbers.length === 0) return false;
    if (hasInsufficientBalance) return false;
    if (templateVariables.some((v) => !variables[v]?.trim())) return false;
    return true;
  }, [template, parsedNumbers, hasInsufficientBalance, templateVariables, variables]);

  // Reset al cerrar
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode('single');
      setSinglePhone('');
      setBulkPhones('');
      setVariables({});
    }
    onOpenChange(open);
  };

  // Enviar mensajes
  const handleSend = async () => {
    if (!template || !canSend) return;

    const bodyParameters = templateVariables.map((v) => ({
      type: 'text' as const,
      text: variables[v] || '',
    }));

    try {
      if (mode === 'single') {
        await sendSingle.mutateAsync({
          templateId: template.id,
          to: parsedNumbers[0],
          bodyParameters: bodyParameters.length > 0 ? bodyParameters : undefined,
        });
      } else {
        await sendBulk.mutateAsync({
          templateId: template.id,
          recipients: parsedNumbers.map((phone) => ({
            to: phone,
            bodyParameters: bodyParameters.length > 0 ? bodyParameters : undefined,
          })),
        });
      }
      handleOpenChange(false);
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar: {template.name}
          </DialogTitle>
          <DialogDescription>
            Envía mensajes usando esta plantilla aprobada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Modo de envío */}
          <div className="space-y-3">
            <Label>Modo de envío</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as 'single' | 'bulk')}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="mode-single"
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  mode === 'single' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value="single" id="mode-single" />
                <User className="h-5 w-5" />
                <div>
                  <p className="font-medium">Individual</p>
                  <p className="text-xs text-muted-foreground">Un número</p>
                </div>
              </Label>
              <Label
                htmlFor="mode-bulk"
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                  mode === 'bulk' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value="bulk" id="mode-bulk" />
                <Users className="h-5 w-5" />
                <div>
                  <p className="font-medium">Masivo</p>
                  <p className="text-xs text-muted-foreground">Múltiples números</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <Separator />

          {/* Números de teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              {mode === 'single' ? 'Número de WhatsApp' : 'Números de WhatsApp'}
            </Label>
            {mode === 'single' ? (
              <Input
                id="phone"
                placeholder="+52 55 1234 5678"
                value={singlePhone}
                onChange={(e) => setSinglePhone(e.target.value)}
              />
            ) : (
              <>
                <Textarea
                  id="phone"
                  placeholder="+521234567890&#10;+525598765432&#10;+521111111111"
                  value={bulkPhones}
                  onChange={(e) => setBulkPhones(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Ingresa un número por línea o separados por coma.{' '}
                  <span className="font-medium">
                    {parsedNumbers.length} destinatario(s) detectado(s)
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Variables del template */}
          {templateVariables.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Variables del mensaje</Label>
                <p className="text-sm text-muted-foreground">
                  Completa las variables que aparecen en el mensaje
                </p>
                {templateVariables.map((v) => (
                  <div key={v} className="flex items-center gap-3">
                    <Badge variant="outline" className="shrink-0">
                      {`{{${v}}}`}
                    </Badge>
                    <Input
                      placeholder={`Valor para variable ${v}`}
                      value={variables[v] || ''}
                      onChange={(e) =>
                        setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <Separator />

          {/* Resumen de costo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Resumen de costo
            </Label>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  {parsedNumbers.length} mensaje{parsedNumbers.length !== 1 ? 's' : ''} ×{' '}
                  {formatPrice(pricePerMessage)} ({template.category})
                </span>
                <span className="font-medium">{formatPrice(estimatedCost)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tu saldo actual</span>
                <span>{isLoadingBalance ? '...' : formatPrice(balance)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Saldo después del envío</span>
                <span className={hasInsufficientBalance ? 'text-destructive' : 'text-green-600'}>
                  {formatPrice(Math.max(0, balanceAfter))}
                </span>
              </div>
            </div>

            {hasInsufficientBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    Saldo insuficiente. Necesitas {formatPrice(estimatedCost - balance)} más.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleOpenChange(false);
                      navigate('/marketing/comprar-creditos');
                    }}
                  >
                    Agregar créditos
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!canSend || isSending} className="gap-2">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Enviar {parsedNumbers.length > 0 && `(${parsedNumbers.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
