# n8n Integration Guide for VEXA

## Overview

This guide explains how to integrate n8n with VEXA's Agent Settings system.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  VEXA Frontend  │────►│  Edge Function       │────►│  Supabase   │
│  (React)        │     │  /save-agent-settings│     │  PostgreSQL │
└─────────────────┘     └──────────┬───────────┘     └──────┬──────┘
                                   │                        │
                                   ▼ (webhook)              │
                        ┌──────────────────────┐            │
                        │  n8n Workflow        │◄───────────┘
                        │  (HTTP Request)      │  (direct query)
                        └──────────────────────┘
```

## Option 1: n8n Reads from Database (Recommended)

Your chatbot workflow reads prompts directly from Supabase when a conversation starts.

### n8n Workflow Setup

1. **Add PostgreSQL Node** (or HTTP Request to Supabase REST API)
2. **Configure connection** with your Supabase credentials
3. **Query agent_prompts table**:

```sql
SELECT 
  prompt_personality,
  prompt_business_context,
  prompt_policies,
  prompt_services,
  prompt_rescheduling,
  prompt_payments,
  prompt_handover,
  prompt_faq,
  prompt_limits
FROM agent_prompts
WHERE tenant_id = '{{ $json.tenant_id }}'
LIMIT 1;
```

### Using HTTP Request Node (Alternative)

**Method:** GET

**URL:** 
```
https://ymlvklodwwvkfpnrlfsa.supabase.co/rest/v1/agent_prompts?tenant_id=eq.YOUR_TENANT_ID&select=*
```

**Headers:**
| Header | Value |
|--------|-------|
| apikey | `YOUR_SUPABASE_ANON_KEY` |
| Authorization | `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY` |
| Content-Type | `application/json` |

---

## Option 2: Webhook Notification on Save

If you want n8n to be notified immediately when settings are updated:

### Step 1: Create n8n Webhook

1. In n8n, create a new workflow
2. Add a **Webhook** node as trigger
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `/vexa-settings-updated`
4. Copy the **Production URL** (e.g., `https://your-n8n.app.n8n.cloud/webhook/vexa-settings-updated`)

### Step 2: Add Secret to Lovable Cloud

Add the n8n webhook URL as a secret:

```
N8N_WEBHOOK_URL = https://your-n8n.app.n8n.cloud/webhook/vexa-settings-updated
```

### Step 3: Webhook Payload Structure

When "Guardar cambios" is clicked, n8n receives:

```json
{
  "event": "agent_settings_updated",
  "tenant_id": "uuid-of-tenant",
  "section": "personality",
  "column": "prompt_personality",
  "generated_prompt": "## Personalidad del Agente\n\nTu objetivo principal es agendar citas...",
  "raw_data": {
    "objective": "schedule",
    "actionPriority": "high",
    "closingStyle": "direct",
    "formality": 7,
    "empathy": 8,
    "humor": 3,
    "emojiUsage": 5
  },
  "user_id": "uuid-of-user",
  "timestamp": "2026-01-10T12:00:00.000Z"
}
```

### Step 4: n8n Workflow Example

```
[Webhook] → [IF section == "personality"] → [Update cache/memory]
                                          → [Notify team (Slack)]
                                          → [Log to analytics]
```

---

## Configuring the HTTP Request Node in n8n

Based on your screenshot, here's the exact configuration:

### For Reading Prompts (GET):

| Setting | Value |
|---------|-------|
| **Method** | GET |
| **URL** | `https://ymlvklodwwvkfpnrlfsa.supabase.co/rest/v1/agent_prompts?tenant_id=eq.{{ $json.tenant_id }}&select=*` |
| **Authentication** | Header Auth |
| **Send Headers** | ✅ ON |

**Headers to add:**

| Name | Value |
|------|-------|
| apikey | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key) |
| Authorization | `Bearer YOUR_SERVICE_ROLE_KEY` |

### For Receiving Webhooks (Your current screenshot):

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | Your webhook trigger URL |
| **Send Body** | ✅ ON |
| **Body Content Type** | JSON |

---

## Building the System Prompt in n8n

After fetching prompts, combine them into a single system prompt:

### Function Node Code:

```javascript
const prompts = $input.first().json;

// Combine all non-null prompt sections
const sections = [
  prompts.prompt_personality,
  prompts.prompt_business_context,
  prompts.prompt_policies,
  prompts.prompt_services,
  prompts.prompt_rescheduling,
  prompts.prompt_payments,
  prompts.prompt_handover,
  prompts.prompt_faq,
  prompts.prompt_limits
].filter(Boolean);

const systemPrompt = `Eres un asistente de WhatsApp para un negocio. Sigue estas instrucciones:

${sections.join('\n\n---\n\n')}

REGLAS IMPORTANTES:
- Si no tienes información sobre algo, NO inventes. Ofrece escalar a un humano.
- Mantén las respuestas concisas y claras.
- Usa el tono definido en la personalidad.
`;

return { systemPrompt };
```

---

## Complete n8n Chatbot Workflow

```
[WhatsApp Webhook]
       │
       ▼
[Extract tenant_id from phone]
       │
       ▼
[HTTP Request: GET agent_prompts]
       │
       ▼
[HTTP Request: GET/CREATE chat_session]
       │
       ▼
[HTTP Request: INSERT incoming message]
       │
       ▼
[HTTP Request: GET conversation history]
       │
       ▼
[Function: Build system prompt]
       │
       ▼
[HTTP Request: OpenAI/Anthropic API]
       │
       ▼
[HTTP Request: INSERT bot response]
       │
       ▼
[HTTP Request: Send WhatsApp message]
       │
       ▼
[HTTP Request: UPDATE session (funnel_stage, last_message_at)]
```

---

## Environment Variables Needed

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | `https://ymlvklodwwvkfpnrlfsa.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (for bypassing RLS) |
| `SUPABASE_ANON_KEY` | Your anon/publishable key |
| `N8N_WEBHOOK_URL` | (Optional) Your n8n webhook URL for notifications |

---

## Security Notes

1. **Use Service Role Key in n8n** - This bypasses RLS for backend operations
2. **Never expose Service Role Key in frontend** - Only use in n8n or edge functions
3. **Validate tenant_id** - Always verify the tenant exists before operations
4. **Rate limiting** - Consider adding rate limits to webhook endpoints
