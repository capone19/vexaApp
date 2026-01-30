import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DeleteTemplateInput {
  templateId: string;
  deleteFromYCloud?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ycloud-templates-delete] Deleting template...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const input: DeleteTemplateInput = await req.json();
    console.log('[ycloud-templates-delete] Input:', JSON.stringify(input));

    if (!input.templateId) {
      throw new Error('Missing required field: templateId');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[ycloud-templates-delete] Auth error:', authError);
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

    // Get the template to delete
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', input.templateId)
      .eq('tenant_id', tenantId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found or access denied');
    }

    console.log('[ycloud-templates-delete] Found template:', template.name);

    // Delete from YCloud if requested and has wa_template_name
    if (input.deleteFromYCloud && template.wa_template_name) {
      const { data: ycloudConfig } = await supabase
        .from('tenant_ycloud_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (ycloudConfig) {
        console.log('[ycloud-templates-delete] Deleting from YCloud...');
        
        // YCloud uses DELETE /v2/whatsapp/templates/{wabaId}/{name}
        const deleteUrl = `https://api.ycloud.com/v2/whatsapp/templates/${ycloudConfig.waba_id}/${template.wa_template_name}`;
        
        const ycloudResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'X-API-Key': ycloudConfig.api_key,
            'Content-Type': 'application/json',
          },
        });

        if (!ycloudResponse.ok) {
          const errorText = await ycloudResponse.text();
          console.warn('[ycloud-templates-delete] YCloud delete warning:', errorText);
          // Don't throw error, continue with local deletion
        } else {
          console.log('[ycloud-templates-delete] Deleted from YCloud successfully');
        }
      }
    }

    // Delete from local database
    const { error: deleteError } = await supabase
      .from('whatsapp_templates')
      .delete()
      .eq('id', input.templateId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('[ycloud-templates-delete] Delete error:', deleteError);
      throw new Error('Failed to delete template from database');
    }

    console.log('[ycloud-templates-delete] Template deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Template eliminado correctamente',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ycloud-templates-delete] Error:', error);
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
