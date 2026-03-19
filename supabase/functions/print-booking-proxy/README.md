# print-booking-proxy

Reenvía el JSON del botón **Imprimir** (Calendario → compra producto) al webhook de n8n, evitando CORS del navegador.

## Variables de entorno (Supabase Dashboard → Edge Functions → Secrets)

| Variable | Descripción |
|----------|-------------|
| `N8N_PRINT_WEBHOOK_URL` | URL completa del webhook (por defecto: `https://n8ninnovatec-n8n.t0bgq1.easypanel.host/webhook/imprimir`) |

## Despliegue

```bash
npx supabase functions deploy print-booking-proxy
```

`verify_jwt` está en `false` en `config.toml` (mismo criterio que `human-message-proxy`). Para exigir sesión, cambia a `true` y despliega de nuevo.
