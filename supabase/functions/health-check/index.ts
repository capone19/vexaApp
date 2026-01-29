import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'contacto@vexalatam.com';

// Thresholds for status classification (realistic for edge functions with cold starts)
const HEALTHY_THRESHOLD_MS = 1500;  // Edge functions can take 1-1.5s on cold start
const DEGRADED_THRESHOLD_MS = 3000; // Above 3s is concerning
const TIMEOUT_MS = 8000;            // 8s timeout for cold starts

interface ServiceCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error?: string;
}

interface HealthCheckResult {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'down';
  services: ServiceCheck[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    avg_response_time_ms: number;
  };
}

// Check Lovable Cloud DB (main Supabase)
async function checkLovableCloudDB(supabaseAdmin: any): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - start;
    
    if (error) {
      return {
        name: 'Lovable Cloud DB',
        status: 'down',
        response_time_ms: responseTime,
        error: error.message,
      };
    }
    
    return {
      name: 'Lovable Cloud DB',
      status: responseTime < HEALTHY_THRESHOLD_MS ? 'healthy' : responseTime < DEGRADED_THRESHOLD_MS ? 'degraded' : 'down',
      response_time_ms: responseTime,
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return {
      name: 'Lovable Cloud DB',
      status: 'down',
      response_time_ms: Date.now() - start,
      error: errorMessage,
    };
  }
}

// Check External DB (n8n Supabase)
async function checkExternalDB(): Promise<ServiceCheck> {
  const start = Date.now();
  const externalUrl = 'https://gfltyrhndfuttacrmcjd.supabase.co';
  const externalServiceKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
  
  if (!externalServiceKey) {
    return {
      name: 'External DB (n8n)',
      status: 'down',
      response_time_ms: 0,
      error: 'Missing EXTERNAL_SUPABASE_SERVICE_ROLE_KEY',
    };
  }
  
  try {
    const externalClient = createClient(externalUrl, externalServiceKey);
    const { error } = await externalClient
      .from('n8n_chat_histories')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - start;
    
    if (error) {
      return {
        name: 'External DB (n8n)',
        status: 'down',
        response_time_ms: responseTime,
        error: error.message,
      };
    }
    
    return {
      name: 'External DB (n8n)',
      status: responseTime < HEALTHY_THRESHOLD_MS ? 'healthy' : responseTime < DEGRADED_THRESHOLD_MS ? 'degraded' : 'down',
      response_time_ms: responseTime,
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return {
      name: 'External DB (n8n)',
      status: 'down',
      response_time_ms: Date.now() - start,
      error: errorMessage,
    };
  }
}

// Check Edge Function availability via OPTIONS request
async function checkEdgeFunction(name: string, supabaseUrl: string): Promise<ServiceCheck> {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    
    const status = !res.ok ? 'down' : responseTime < HEALTHY_THRESHOLD_MS ? 'healthy' : responseTime < DEGRADED_THRESHOLD_MS ? 'degraded' : 'down';
    return {
      name: `Edge: ${name}`,
      status,
      response_time_ms: responseTime,
      ...(responseTime > 1000 && responseTime < DEGRADED_THRESHOLD_MS ? { note: 'Cold start detected' } : {}),
    };
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return {
      name: `Edge: ${name}`,
      status: 'down',
      response_time_ms: Date.now() - start,
      error: errorMessage,
    };
  }
}

// Store results in health_checks table
async function storeResults(supabaseAdmin: any, services: ServiceCheck[]): Promise<void> {
  const records = services.map(s => ({
    service_name: s.name,
    status: s.status,
    response_time_ms: s.response_time_ms,
    error_message: s.error || null,
    metadata: {},
  }));
  
  await supabaseAdmin.from('health_checks').insert(records);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Use getClaims for stateless JWT validation
    const { data: claims, error: authError } = await supabaseAdmin.auth.getClaims(token);
    
    if (authError || !claims?.claims?.sub) {
      console.error('[health-check] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userEmail = claims.claims.email as string | undefined;
    
    if (userEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.error('[health-check] Unauthorized access attempt:', userEmail);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[health-check] Initiated by admin: ${userEmail}`);
    
    // Run all checks in parallel
    const edgeFunctions = [
      'save-agent-settings',
      'admin-toggle-tenant-status', 
      'webhook-n8n-proxy',
      'human-message-proxy',
    ];
    
    const [lovableDB, externalDB, ...edgeResults] = await Promise.all([
      checkLovableCloudDB(supabaseAdmin),
      checkExternalDB(),
      ...edgeFunctions.map(name => checkEdgeFunction(name, supabaseUrl)),
    ]);
    
    const services: ServiceCheck[] = [lovableDB, externalDB, ...edgeResults];
    
    // Calculate summary
    const healthy = services.filter(s => s.status === 'healthy').length;
    const degraded = services.filter(s => s.status === 'degraded').length;
    const down = services.filter(s => s.status === 'down').length;
    const avgResponseTime = Math.round(
      services.reduce((sum, s) => sum + s.response_time_ms, 0) / services.length
    );
    
    // Determine overall status
    let overall_status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (down > 0) overall_status = 'down';
    else if (degraded > 0) overall_status = 'degraded';
    
    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      overall_status,
      services,
      summary: {
        total: services.length,
        healthy,
        degraded,
        down,
        avg_response_time_ms: avgResponseTime,
      },
    };
    
    // Store results for historical tracking
    await storeResults(supabaseAdmin, services);
    
    console.log(`Health check completed: ${overall_status} (${healthy}/${services.length} healthy)`);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
