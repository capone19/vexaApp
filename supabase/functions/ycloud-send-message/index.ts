import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  to: string; // Phone number with country code
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
    
    console.log('[ycloud-send-message] Mode:', isBulk ? 'bulk' : 'single');

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

    console.log('[ycloud-send-message] Using template:', template.name);

    const sendMessage = async (
      to: string,
      headerParams?: TemplateParameter[],
      bodyParams?: TemplateParameter[]
    ) => {
      // Build template components for YCloud
      const components: Array<Record<string, unknown>> = [];

      // Header parameters
      if (headerParams && headerParams.length > 0) {
        components.push({
          type: 'header',
          parameters: headerParams,
        });
      }

      // Body parameters
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

    if (isBulk) {
      // Bulk send
      const bulkInput = input as SendBulkInput;
      const results = [];
      let successCount = 0;
      let errorCount = 0;

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

      return new Response(
        JSON.stringify({
          success: true,
          sent: successCount,
          failed: errorCount,
          total: bulkInput.recipients.length,
          results,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Single send
      const singleInput = input as SendMessageInput;
      const result = await sendMessage(
        singleInput.to,
        singleInput.headerParameters,
        singleInput.bodyParameters
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          messageId: result.messageId,
          message: 'Mensaje enviado correctamente',
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
