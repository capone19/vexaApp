import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Precios por tipo de mensaje (en USD) - debe coincidir con src/lib/messaging-pricing.ts
const MESSAGE_PRICES: Record<string, number> = {
  marketing: 0.15,
  utility: 0.04,
  authentication: 0.04,
  service: 0,
};

interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

interface SendMessageInput {
  templateId: string;
  to: string;
  headerParameters?: TemplateParameter[];
  bodyParameters?: TemplateParameter[];
  buttonParameters?: Array<{ index: number; subType: string; parameters: TemplateParameter[] }>;
}

interface SendBulkInput {
  templateId: string;
  recipients: Array<{
    to: string;
    headerParameters?: TemplateParameter[];
    bodyParameters?: TemplateParameter[];
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ycloud-send-message] Processing request...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const input = await req.json();
    const isBulk = 'recipients' in input;
    const recipientCount = isBulk ? (input as SendBulkInput).recipients.length : 1;
    
    console.log('[ycloud-send-message] Mode:', isBulk ? 'bulk' : 'single', 'Recipients:', recipientCount);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[ycloud-send-message] Auth error:', authError);
      throw new Error('User not authenticated');
    }

    // Get tenant ID
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.tenant_id) {
      throw new Error('No tenant found for user');
    }

    const tenantId = userRole.tenant_id;

    // Get YCloud config
    const { data: ycloudConfig } = await supabase
      .from('tenant_ycloud_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!ycloudConfig) {
      throw new Error('YCloud not configured');
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', input.templateId)
      .eq('tenant_id', tenantId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    if (template.status !== 'approved') {
      throw new Error('Template must be approved before sending messages');
    }

    console.log('[ycloud-send-message] Using template:', template.name, 'Category:', template.category);

    // ========================================
    // SISTEMA DE CRÉDITOS - Verificar saldo
    // ========================================
    const messagePrice = MESSAGE_PRICES[template.category?.toLowerCase()] ?? MESSAGE_PRICES.marketing;
    const estimatedCost = messagePrice * recipientCount;

    console.log('[ycloud-send-message] Price per message:', messagePrice, 'Estimated cost:', estimatedCost);

    // Obtener saldo actual
    const { data: credits, error: creditsError } = await supabase
      .from('tenant_messaging_credits')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('[ycloud-send-message] Error fetching credits:', creditsError);
      throw new Error('Error al verificar saldo de créditos');
    }

    const currentBalance = credits?.balance_usd ?? 0;

    // Verificar si hay saldo suficiente (solo si el mensaje no es gratis)
    if (messagePrice > 0 && currentBalance < estimatedCost) {
      console.log('[ycloud-send-message] Insufficient balance:', currentBalance, 'Required:', estimatedCost);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Saldo insuficiente. Tienes $${currentBalance.toFixed(2)} USD y necesitas $${estimatedCost.toFixed(2)} USD para enviar ${recipientCount} mensaje(s).`,
          balance: currentBalance,
          required: estimatedCost,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // FUNCIÓN DE ENVÍO
    // ========================================
    const sendMessage = async (
      to: string,
      headerParams?: TemplateParameter[],
      bodyParams?: TemplateParameter[]
    ) => {
      const components: Array<Record<string, unknown>> = [];

      if (headerParams && headerParams.length > 0) {
        components.push({
          type: 'header',
          parameters: headerParams,
        });
      }

      if (bodyParams && bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      const payload = {
        from: ycloudConfig.phone_number_id || ycloudConfig.waba_id,
        to: to.startsWith('+') ? to : `+${to}`,
        type: 'template',
        template: {
          name: template.wa_template_name || template.name,
          language: { code: template.language || 'es' },
          components: components.length > 0 ? components : undefined,
        },
      };

      console.log('[ycloud-send-message] Sending to', to);

      const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
        method: 'POST',
        headers: {
          'X-API-Key': ycloudConfig.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[ycloud-send-message] YCloud error:', result);
        return {
          success: false,
          to,
          error: result.message || 'Failed to send message',
        };
      }

      return {
        success: true,
        to,
        messageId: result.id,
      };
    };

    // ========================================
    // ENVÍO DE MENSAJES
    // ========================================
    const results: Array<{ success: boolean; to: string; messageId?: string; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    if (isBulk) {
      const bulkInput = input as SendBulkInput;

      for (const recipient of bulkInput.recipients) {
        const result = await sendMessage(
          recipient.to,
          recipient.headerParameters,
          recipient.bodyParameters
        );
        results.push(result);
        if (result.success) successCount++;
        else errorCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('[ycloud-send-message] Bulk complete. Success:', successCount, 'Errors:', errorCount);
    } else {
      const singleInput = input as SendMessageInput;
      const result = await sendMessage(
        singleInput.to,
        singleInput.headerParameters,
        singleInput.bodyParameters
      );
      results.push(result);
      if (result.success) successCount++;
      else errorCount++;
    }

    // ========================================
    // SISTEMA DE CRÉDITOS - Descontar saldo
    // ========================================
    const actualCost = messagePrice * successCount;

    if (actualCost > 0 && successCount > 0) {
      const newBalance = currentBalance - actualCost;
      
      // Actualizar saldo
      const { error: updateError } = await supabase
        .from('tenant_messaging_credits')
        .upsert({
          tenant_id: tenantId,
          balance_usd: newBalance,
          total_consumed_usd: (credits?.total_consumed_usd ?? 0) + actualCost,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id',
        });

      if (updateError) {
        console.error('[ycloud-send-message] Error updating balance:', updateError);
      }

      // Registrar transacción con los teléfonos destinatarios para atribución
      const successfulRecipients = results
        .filter(r => r.success)
        .map(r => r.to);

      const { error: txError } = await supabase
        .from('messaging_transactions')
        .insert({
          tenant_id: tenantId,
          type: 'consumption',
          amount_usd: -actualCost,
          balance_after: newBalance,
          message_count: successCount,
          message_type: template.category?.toLowerCase() || 'marketing',
          template_id: template.id,
          description: `Envío de ${successCount} mensaje(s) - ${template.name}`,
          metadata: {
            template_name: template.name,
            failed_count: errorCount,
            recipients: successfulRecipients, // Para atribución de ventas
          },
        });

      if (txError) {
        console.error('[ycloud-send-message] Error recording transaction:', txError);
      }

      console.log('[ycloud-send-message] Deducted', actualCost, 'USD. New balance:', newBalance);
    }

    // ========================================
    // RESPUESTA
    // ========================================
    if (isBulk) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: successCount,
          failed: errorCount,
          total: (input as SendBulkInput).recipients.length,
          cost: actualCost,
          newBalance: currentBalance - actualCost,
          results,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      if (!results[0].success) {
        throw new Error(results[0].error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          messageId: results[0].messageId,
          message: 'Mensaje enviado correctamente',
          cost: actualCost,
          newBalance: currentBalance - actualCost,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[ycloud-send-message] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
