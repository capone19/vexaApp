import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Mapeo de estados YCloud -> VEXA
const STATUS_MAP: Record<string, string> = {
  'PENDING': 'pending',
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
  'PAUSED': 'rejected',
  'DISABLED': 'rejected',
  'IN_APPEAL': 'pending',
  'DELETED': 'rejected',
};

// Mapeo de categorías YCloud -> VEXA
const CATEGORY_MAP: Record<string, string> = {
  'MARKETING': 'marketing',
  'UTILITY': 'utility',
  'AUTHENTICATION': 'authentication',
};

interface YCloudTemplate {
  officialTemplateId?: string;
  wabaId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  qualityRating?: string;
  reason?: string;
  components?: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{
      type: string;
      text?: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
  createTime?: string;
  updateTime?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ycloud-templates-sync] Starting sync...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[ycloud-templates-sync] Auth error:', authError);
      throw new Error('User not authenticated');
    }

    console.log('[ycloud-templates-sync] User authenticated:', user.id);

    // Get tenant ID
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole?.tenant_id) {
      console.error('[ycloud-templates-sync] Role error:', roleError);
      throw new Error('No tenant found for user');
    }

    const tenantId = userRole.tenant_id;
    console.log('[ycloud-templates-sync] Tenant ID:', tenantId);

    // Get YCloud config
    const { data: ycloudConfig, error: configError } = await supabase
      .from('tenant_ycloud_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (configError || !ycloudConfig) {
      console.error('[ycloud-templates-sync] Config error:', configError);
      throw new Error('YCloud not configured. Please configure your API key first.');
    }

    console.log('[ycloud-templates-sync] YCloud config found, WABA ID:', ycloudConfig.waba_id);

    // Fetch templates from YCloud
    const ycloudUrl = `https://api.ycloud.com/v2/whatsapp/templates?wabaId=${ycloudConfig.waba_id}&limit=100`;
    console.log('[ycloud-templates-sync] Fetching from YCloud:', ycloudUrl);

    const ycloudResponse = await fetch(ycloudUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': ycloudConfig.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!ycloudResponse.ok) {
      const errorText = await ycloudResponse.text();
      console.error('[ycloud-templates-sync] YCloud API error:', ycloudResponse.status, errorText);
      throw new Error(`YCloud API error: ${ycloudResponse.status} - ${errorText}`);
    }

    const ycloudData = await ycloudResponse.json();
    const templates: YCloudTemplate[] = ycloudData.items || ycloudData.data || [];
    
    console.log('[ycloud-templates-sync] Fetched', templates.length, 'templates from YCloud');

    // Process and upsert templates
    let synced = 0;
    let errors = 0;

    for (const template of templates) {
      try {
        // Extract components
        const headerComponent = template.components?.find(c => c.type === 'HEADER');
        const bodyComponent = template.components?.find(c => c.type === 'BODY');
        const footerComponent = template.components?.find(c => c.type === 'FOOTER');
        const buttonsComponent = template.components?.find(c => c.type === 'BUTTONS');

        const templateData = {
          tenant_id: tenantId,
          name: template.name,
          wa_template_id: template.officialTemplateId || null,
          wa_template_name: template.name,
          language: template.language || 'es',
          category: CATEGORY_MAP[template.category] || 'utility',
          status: STATUS_MAP[template.status] || 'pending',
          header_type: headerComponent?.format || null,
          header_content: headerComponent?.text || null,
          body_text: bodyComponent?.text || '',
          footer_text: footerComponent?.text || null,
          buttons: buttonsComponent?.buttons || [],
          variables: [],
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Upsert by name and tenant
        const { error: upsertError } = await supabase
          .from('whatsapp_templates')
          .upsert(templateData, {
            onConflict: 'tenant_id,name',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          // If conflict column doesn't exist, try insert with select first
          const { data: existing } = await supabase
            .from('whatsapp_templates')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('name', template.name)
            .single();

          if (existing) {
            // Update existing
            await supabase
              .from('whatsapp_templates')
              .update(templateData)
              .eq('id', existing.id);
          } else {
            // Insert new
            await supabase
              .from('whatsapp_templates')
              .insert(templateData);
          }
        }

        synced++;
        console.log('[ycloud-templates-sync] Synced template:', template.name);
      } catch (err) {
        console.error('[ycloud-templates-sync] Error syncing template:', template.name, err);
        errors++;
      }
    }

    // Update last_synced_at in config
    await supabase
      .from('tenant_ycloud_config')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    console.log('[ycloud-templates-sync] Sync complete. Synced:', synced, 'Errors:', errors);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        errors,
        total: templates.length,
        message: `Sincronizados ${synced} templates de ${templates.length}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ycloud-templates-sync] Error:', error);
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
