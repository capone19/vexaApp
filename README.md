# VEXA App

Panel de VEXA (Chatbot AI y automatización) construido con Next.js 15 (App Router), React, TypeScript, Tailwind CSS 3, shadcn/ui, TanStack Query y Supabase.

## Secciones

| Ruta | Sección |
|---|---|
| `/auth` | Inicio de sesión y registro |
| `/ajustes-agente` | Ajustes del Agente |
| `/ajustes-agente/analisis` | Análisis del agente |
| `/chats` | Chats en tiempo real |
| `/marketing/plantillas` | Plantillas de WhatsApp (oculta en el menú; se abre desde Chats) |

`/` redirige a `/chats`. Las rutas protegidas redirigen a `/auth` si no hay sesión.

## Desarrollo local

Requisitos: Node.js 20 o superior.

```sh
npm install
cp .env.example .env   # completar los valores
npm run dev            # http://localhost:3000
```

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: build de producción.
- `npm run start`: sirve el build de producción.
- `npm run lint`: ESLint con la configuración de Next.
- `npm test`: tests con Vitest.

`next build` no hace type-check (igual que el build anterior de Vite). Para revisar tipos: `npx tsc --noEmit`.

## Variables de entorno

Ver [.env.example](.env.example). Todas usan el prefijo `NEXT_PUBLIC_` porque se leen en el navegador. Las de n8n son opcionales.

## Estructura

- `src/app/`: rutas de Next (wrappers delgados que cargan las vistas).
- `src/views/`: componentes de página.
- `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`: UI, hooks, contextos y lógica.
- `src/integrations/supabase/`: clientes de Supabase.
- `supabase/`: migraciones y edge functions.

## Despliegue

En Vercel, con el Framework Preset **Next.js** y las variables de entorno de `.env.example` configuradas.
