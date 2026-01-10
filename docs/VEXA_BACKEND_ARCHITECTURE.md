# VEXA Backend Architecture

## Database Schema Overview (18 Tables)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TENANCY CORE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  tenants ──────────┬──────────────────────────────────────────────────────  │
│     │              │                                                        │
│     ▼              ▼                                                        │
│  user_roles    agent_prompts (1:1 per tenant)                               │
│     │                                                                       │
│     ▼                                                                       │
│  profiles                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         CHAT & CRM                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  contacts ◄────── chat_sessions ────► chat_messages                         │
│     │                  │                                                    │
│     │                  ▼                                                    │
│     └────────────► bookings                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                      SERVICES & AVAILABILITY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  services ◄────── availability_slots                                        │
│                   blocked_dates                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         MARKETING                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  whatsapp_templates ◄────── campaigns ────► campaign_recipients             │
├─────────────────────────────────────────────────────────────────────────────┤
│                     ANALYTICS & LOGS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  metrics_daily    webhook_logs    notifications    audit_logs               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tables Summary

| Category | Tables |
|----------|--------|
| **Core** | tenants, user_roles, profiles, agent_prompts |
| **Chat/CRM** | contacts, chat_sessions, chat_messages, bookings |
| **Services** | services, availability_slots, blocked_dates |
| **Marketing** | whatsapp_templates, campaigns, campaign_recipients |
| **Analytics** | metrics_daily, webhook_logs, notifications, audit_logs |

---

## 1. API Contracts per Agent Settings Section

Each section in Agent Settings triggers ONE API call that updates ONE column in `agent_prompts`.

### 1.1 Personalidad del Agente → `prompt_personality`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_personality": "Eres un asistente de [negocio]. Tu objetivo principal es [agendar/vender/soporte]. Prioridad de acción: [alta/media/baja]. Cierre preferido: [directo/suave]. Tono: formalidad 7/10, empatía 8/10, humor 3/10, emojis 5/10."
}
```

**UI Fields:**
| Field | Type | Maps to |
|-------|------|---------|
| Objetivo del agente | select | "agendar citas" / "vender" / "soporte" / "mixto" |
| Prioridad de acción | select | "alta" / "media" / "baja" |
| Cierre preferido | select | "directo" / "suave" / "consultivo" |
| Formalidad | slider 0-10 | número |
| Empatía | slider 0-10 | número |
| Humor | slider 0-10 | número |
| Uso de emojis | slider 0-10 | número |

---

### 1.2 Sobre tu Negocio → `prompt_business_context`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_business_context": "Negocio: [nombre]. Descripción: [texto]. Propuesta de valor: [texto]. Ubicaciones: [lista]. Cobertura: [zonas]. Canales de contacto: [whatsapp/email/tel]."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Nombre del negocio | text |
| Descripción | textarea |
| Propuesta de valor | textarea |
| ¿Tiene tienda física? | boolean |
| Ubicaciones | array of { dirección, horarios, teléfono } |
| Zonas de cobertura | text |
| Canales de contacto | multi-select |

---

### 1.3 Políticas Generales → `prompt_policies`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_policies": "Reglas del servicio: [texto]. Garantías: [texto]. Casos especiales: [texto]."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Reglas del servicio | textarea |
| Garantías ofrecidas | textarea |
| Manejo de casos especiales | textarea |

---

### 1.4 Servicios → `prompt_services`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_services": "Catálogo de servicios:\n- Servicio A: $500 MXN, duración 60 min, requisitos: [x]\n- Servicio B: precio variable, consultar. Modalidades: presencial/domicilio/virtual. Horarios: L-V 9-18h."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Modalidad | multi-select: presencial/domicilio/virtual |
| Horarios de operación | schedule picker |
| Servicios | array of { nombre, precio, tipo_precio, duración, requisitos } |
| Política de precios | select: fijo/variable/referencial |

---

### 1.5 Re-agendamientos → `prompt_rescheduling`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_rescheduling": "Política de cancelación: se permite cancelar hasta [X] horas antes. Penalización: [X]% del valor. Reembolsos: [condiciones]. Re-agendamiento: máximo [X] veces."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Ventana de cancelación (horas) | number |
| Penalización (%) | slider 0-100 |
| Política de reembolso | textarea |
| Máximo re-agendamientos | number |

---

### 1.6 Opciones de Pago → `prompt_payments`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_payments": "Métodos de pago aceptados: [lista]. Restricciones: [texto]. Anticipo requerido: [sí/no], monto: [X]%."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Métodos de pago | multi-select + toggle each |
| Detalles por método | text per method |
| Requiere anticipo | boolean |
| Porcentaje de anticipo | slider 0-100 |
| Restricciones por servicio | array of { servicio, restricción } |

---

### 1.7 Intervención Asistida → `prompt_handover`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_handover": "Escalar a humano cuando: [condiciones]. Mensaje de handoff: '[texto]'. Clientes prioritarios: [criterios]."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Habilitar handover | boolean |
| Condiciones predefinidas | checkboxes |
| Condiciones personalizadas | array of text |
| Mensaje de handoff | textarea |
| Criterios de cliente prioritario | textarea |

---

### 1.8 Preguntas Frecuentes → `prompt_faq`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_faq": "FAQ:\nP: ¿Cuál es el horario?\nR: Atendemos de lunes a viernes de 9 a 18h.\n\nP: ¿Hacen envíos?\nR: Sí, a toda la república."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| FAQs | array of { pregunta, respuesta } |

---

### 1.9 Límites del Agente → `prompt_limits`

**Endpoint:** `PATCH /rest/v1/agent_prompts?tenant_id=eq.{tenant_id}`

**Request Body:**
```json
{
  "prompt_limits": "Temas prohibidos: [lista]. Promesas que no puede hacer: [lista]. Información sensible a proteger: [lista]. Lenguaje a evitar: [lista]."
}
```

**UI Fields:**
| Field | Type |
|-------|------|
| Temas prohibidos | tags input |
| Promesas prohibidas | tags input |
| Datos sensibles a proteger | tags input |
| Lenguaje a evitar | tags input |

---

## 2. n8n Integration

### 2.1 Fetching Agent Prompts

n8n should use the **service_role** key to bypass RLS and fetch prompts:

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
WHERE tenant_id = $1
LIMIT 1;
```

### 2.2 Building the System Prompt

```javascript
// In n8n Function node
const prompts = $input.first().json;

const systemPrompt = [
  prompts.prompt_personality,
  prompts.prompt_business_context,
  prompts.prompt_policies,
  prompts.prompt_services,
  prompts.prompt_rescheduling,
  prompts.prompt_payments,
  prompts.prompt_handover,
  prompts.prompt_faq,
  prompts.prompt_limits
].filter(Boolean).join('\n\n---\n\n');

return { systemPrompt };
```

### 2.3 Message Flow

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  WhatsApp    │────►│    n8n      │────►│   Supabase   │
│  Webhook     │     │  Workflow   │     │   (Postgres) │
└──────────────┘     └─────────────┘     └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   OpenAI    │
                    │   / LLM     │
                    └─────────────┘
```

### 2.4 n8n Workflow Structure

1. **Webhook Node** - Receives WhatsApp message
2. **Supabase Node** - Fetch `agent_prompts` by tenant_id
3. **Supabase Node** - Get/Create chat_session
4. **Supabase Node** - Insert incoming message
5. **Supabase Node** - Fetch conversation history (last N messages)
6. **Function Node** - Build system prompt + messages array
7. **HTTP Request Node** - Call LLM API
8. **Supabase Node** - Insert bot response
9. **HTTP Request Node** - Send WhatsApp response
10. **Supabase Node** - Update session (funnel_stage, last_message_at)

---

## 3. Dashboard Queries

### 3.1 KPIs (Last 30 days)

```sql
SELECT 
  SUM(total_sessions) as total_sessions,
  SUM(total_messages) as total_messages,
  SUM(converted_count) as conversions,
  SUM(bookings_confirmed) as bookings,
  SUM(revenue) as revenue,
  AVG(avg_response_time_seconds) as avg_response_time
FROM metrics_daily
WHERE tenant_id = $1
  AND date >= CURRENT_DATE - INTERVAL '30 days';
```

### 3.2 Funnel Distribution

```sql
SELECT 
  SUM(tofu_count) as tofu,
  SUM(mofu_count) as mofu,
  SUM(hot_count) as hot,
  SUM(bofu_count) as bofu,
  SUM(converted_count) as converted,
  SUM(lost_count) as lost
FROM metrics_daily
WHERE tenant_id = $1
  AND date >= CURRENT_DATE - INTERVAL '30 days';
```

### 3.3 Daily Trend

```sql
SELECT 
  date,
  total_sessions,
  total_messages,
  converted_count,
  revenue
FROM metrics_daily
WHERE tenant_id = $1
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date;
```

---

## 4. Chats Module Queries

### 4.1 List Sessions with Filters

```sql
SELECT 
  cs.*,
  (SELECT content FROM chat_messages 
   WHERE session_id = cs.id 
   ORDER BY created_at DESC LIMIT 1) as last_message
FROM chat_sessions cs
WHERE cs.tenant_id = $1
  AND ($2::chat_status IS NULL OR cs.status = $2)
  AND ($3::funnel_stage IS NULL OR cs.funnel_stage = $3)
  AND ($4::boolean IS NULL OR cs.is_handoff = $4)
  AND cs.created_at >= $5
  AND cs.created_at <= $6
ORDER BY cs.last_message_at DESC
LIMIT $7 OFFSET $8;
```

### 4.2 Get Session Messages

```sql
SELECT * FROM chat_messages
WHERE session_id = $1
ORDER BY created_at ASC;
```

---

## 5. Calendar Queries

### 5.1 Bookings by Date Range

```sql
SELECT * FROM bookings
WHERE tenant_id = $1
  AND scheduled_at >= $2
  AND scheduled_at <= $3
  AND ($4::booking_status IS NULL OR status = $4)
ORDER BY scheduled_at;
```

---

## 6. Recommended Folder Structure

```
supabase/
├── functions/
│   ├── update-agent-prompt/     # Updates single prompt column
│   │   └── index.ts
│   ├── get-dashboard-metrics/   # Aggregated metrics for dashboard
│   │   └── index.ts
│   ├── webhook-whatsapp/        # (Optional) If not using n8n
│   │   └── index.ts
│   └── _shared/
│       ├── cors.ts
│       ├── supabase.ts
│       └── types.ts
├── migrations/
│   └── 20260110_initial_schema.sql
└── config.toml

src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── types.ts          # Generated types
│   ├── api/
│   │   ├── agent-prompts.ts  # API functions for agent settings
│   │   ├── dashboard.ts      # Dashboard data fetching
│   │   ├── chats.ts          # Chat sessions & messages
│   │   ├── calendar.ts       # Bookings
│   │   └── metrics.ts        # Metrics queries
│   └── prompt-generators/
│       ├── personality.ts    # Generates prompt_personality text
│       ├── business.ts       # Generates prompt_business_context text
│       ├── policies.ts       # Generates prompt_policies text
│       ├── services.ts       # etc...
│       ├── rescheduling.ts
│       ├── payments.ts
│       ├── handover.ts
│       ├── faq.ts
│       └── limits.ts
├── hooks/
│   ├── useAgentPrompts.ts
│   ├── useDashboardMetrics.ts
│   ├── useChatSessions.ts
│   └── useBookings.ts
└── pages/
    ├── Dashboard.tsx
    ├── Chats.tsx
    ├── Calendar.tsx
    └── AgentSettings.tsx
```

---

## 7. Security Notes

1. **RLS is enforced** on all tables via `user_belongs_to_tenant()` function
2. **Service role** is used by n8n to bypass RLS (uses `SUPABASE_SERVICE_ROLE_KEY`)
3. **Roles are in separate table** (`user_roles`) - never in profiles
4. **Tenant isolation** is guaranteed at database level
5. **No raw SQL** from client - only parameterized queries

---

## 8. Enums Reference

| Enum | Values |
|------|--------|
| `app_role` | owner, admin, agent, viewer |
| `funnel_stage` | tofu, mofu, hot, bofu, converted, lost |
| `booking_status` | pending, confirmed, cancelled, completed, no_show |
| `booking_origin` | chat, campaign, manual, web |
| `chat_status` | active, waiting, resolved, escalated, abandoned |
