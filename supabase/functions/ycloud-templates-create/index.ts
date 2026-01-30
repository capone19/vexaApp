import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Mapeo de categorías VEXA -> YCloud
const CATEGORY_MAP_REVERSE: Record<string, string> = {
  'marketing': 'MARKETING',
  'utility': 'UTILITY',
  'authentication': 'AUTHENTICATION',
  'service': 'UTILITY',
};

interface CreateTemplateInput {
  name: string;
  category: string;
  language: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Array<{
    type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ycloud-templates-create] Creating template...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const input: CreateTemplateInput = await req.json();
    console.log('[ycloud-templates-create] Input:', JSON.stringify(input));

    // Validate required fields
    if (!input.name || !input.bodyText || !input.category) {
      throw new Error('Missing required fields: name, bodyText, category');
    }

    // Validate name format (lowercase, numbers, underscores only)
    if (!/^[a-z0-9_]+$/.test(input.name)) {
      throw new Error('Template name must contain only lowercase letters, numbers, and underscores');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[ycloud-templates-create] Auth error:', authError);
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
    console.log('[ycloud-templates-create] Tenant ID:', tenantId);

    // Get YCloud config
    const { data: ycloudConfig } = await supabase
      .from('tenant_ycloud_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!ycloudConfig) {
      throw new Error('YCloud not configured. Please configure your API key first.');
    }

    // Build YCloud components array
    const components: Array<Record<string, unknown>> = [];

    // Header component
    if (input.headerType && input.headerContent) {
      components.push({
        type: 'HEADER',
        format: input.headerType,
        text: input.headerType === 'TEXT' ? input.headerContent : undefined,
        example: input.headerType !== 'TEXT' ? { header_url: [input.headerContent] } : undefined,
      });
    }

    // Body component (required)
    const bodyVariables = input.bodyText.match(/\{\{(\d+)\}\}/g) || [];
    components.push({
      type: 'BODY',
      text: input.bodyText,
      example: bodyVariables.length > 0 ? {
        body_text: [bodyVariables.map((_, i) => `ejemplo${i + 1}`)]
      } : undefined,
    });

    // Footer component
    if (input.footerText) {
      components.push({
        type: 'FOOTER',
        text: input.footerText,
      });
    }

    // Buttons component
    if (input.buttons && input.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: input.buttons.map(btn => ({
          type: btn.type,
          text: btn.text,
          url: btn.url,
          phone_number: btn.phone_number,
          example: btn.url?.includes('{{') ? [btn.url.replace(/\{\{.*\}\}/, 'example')] : undefined,
        })),
      });
    }

    // Create template in YCloud
    const ycloudPayload = {
      wabaId: ycloudConfig.waba_id,
      name: input.name,
      language: input.language || 'es',
      category: CATEGORY_MAP_REVERSE[input.category] || 'UTILITY',
      components,
    };

    console.log('[ycloud-templates-create] YCloud payload:', JSON.stringify(ycloudPayload));

    const ycloudResponse = await fetch('https://api.ycloud.com/v2/whatsapp/templates', {
      method: 'POST',
      headers: {
        'X-API-Key': ycloudConfig.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ycloudPayload),
    });

    const ycloudResult = await ycloudResponse.json();
    console.log('[ycloud-templates-create] YCloud response:', JSON.stringify(ycloudResult));

    if (!ycloudResponse.ok) {
      const errorMessage = ycloudResult.message || ycloudResult.error?.message || 'Failed to create template in YCloud';
      throw new Error(errorMessage);
    }

    // Save to local database
    const templateData = {
      tenant_id: tenantId,
      name: input.name,
      wa_template_id: ycloudResult.officialTemplateId || null,
      wa_template_name: input.name,
      language: input.language || 'es',
      category: input.category,
      status: 'pending', // Always starts as pending for Meta approval
      header_type: input.headerType || null,
      header_content: input.headerContent || null,
      body_text: input.bodyText,
      footer_text: input.footerText || null,
      buttons: input.buttons || [],
      variables: [],
      last_synced_at: new Date().toISOString(),
    };

    const { data: savedTemplate, error: insertError } = await supabase
      .from('whatsapp_templates')
      .insert(templateData)
      .select()
      .single();

    if (insertError) {
      console.error('[ycloud-templates-create] Insert error:', insertError);
      throw new Error('Template created in YCloud but failed to save locally');
    }

    console.log('[ycloud-templates-create] Template created successfully:', savedTemplate.id);

    return new Response(
      JSON.stringify({
        success: true,
        template: savedTemplate,
        ycloudResponse: ycloudResult,
        message: 'Template creado y enviado a aprobación de Meta',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ycloud-templates-create] Error:', error);
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
