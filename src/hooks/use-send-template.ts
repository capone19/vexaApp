// ============================================
// VEXA - Hook para envío de mensajes WhatsApp
// ============================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

interface SendSingleInput {
  templateId: string;
  to: string;
  headerParameters?: TemplateParameter[];
  bodyParameters?: TemplateParameter[];
}

interface SendBulkInput {
  templateId: string;
  recipients: Array<{
    to: string;
    headerParameters?: TemplateParameter[];
    bodyParameters?: TemplateParameter[];
  }>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  sent?: number;
  failed?: number;
  total?: number;
  cost?: number;
  newBalance?: number;
  error?: string;
  balance?: number;
  required?: number;
}

export function useSendTemplate() {
  const queryClient = useQueryClient();

  const sendSingleMutation = useMutation({
    mutationFn: async (input: SendSingleInput): Promise<SendResult> => {
      const { data, error } = await supabase.functions.invoke('ycloud-send-message', {
        body: input,
      });

      if (error) {
        throw new Error(error.message || 'Error al enviar mensaje');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al enviar mensaje');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Mensaje enviado correctamente');
      // Invalidar queries de créditos para refrescar el saldo
      queryClient.invalidateQueries({ queryKey: ['messaging-credits'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-transactions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar mensaje');
    },
  });

  const sendBulkMutation = useMutation({
    mutationFn: async (input: SendBulkInput): Promise<SendResult> => {
      const { data, error } = await supabase.functions.invoke('ycloud-send-message', {
        body: input,
      });

      if (error) {
        throw new Error(error.message || 'Error al enviar mensajes');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al enviar mensajes');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.sent && data.sent > 0) {
        toast.success(`${data.sent} mensaje(s) enviado(s) correctamente`);
      }
      if (data.failed && data.failed > 0) {
        toast.warning(`${data.failed} mensaje(s) fallaron`);
      }
      queryClient.invalidateQueries({ queryKey: ['messaging-credits'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-transactions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar mensajes');
    },
  });

  return {
    sendSingle: sendSingleMutation,
    sendBulk: sendBulkMutation,
    isSending: sendSingleMutation.isPending || sendBulkMutation.isPending,
  };
}

/**
 * Parsea una lista de números de teléfono desde texto
 * Soporta: uno por línea, separados por coma, o separados por espacio
 */
export function parsePhoneNumbers(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((num) => num.trim().replace(/\s/g, ''))
    .filter((num) => num.length >= 10)
    .map((num) => (num.startsWith('+') ? num : `+${num}`));
}

/**
 * Extrae las variables de un template ({{1}}, {{2}}, etc.)
 */
export function extractTemplateVariables(bodyText: string): number[] {
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  
  const numbers = matches.map((m) => parseInt(m.replace(/[{}]/g, '')));
  return [...new Set(numbers)].sort((a, b) => a - b);
}
