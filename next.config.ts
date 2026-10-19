import type { NextConfig } from "next";

// Valores públicos del proyecto Supabase (ya viajan en el navegador; los datos los protege RLS).
// Sirven de respaldo para que un clon nuevo arranque sin .env; un .env o las variables de Vercel los reemplazan.
const SUPABASE_PROJECT_ID = "kbgaxpuwfdnbftkfrvkl";
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_o-z7cS_m2uHLj1LjX77O3Q_xwVfDAQq";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || SUPABASE_PROJECT_ID,
    NEXT_PUBLIC_EXTERNAL_SUPABASE_URL: process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || SUPABASE_URL,
    NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || SUPABASE_PUBLISHABLE_KEY,
  },
  // El build de Vite no hacía type-check ni lint; se mantienen como pasos separados
  // (`npx tsc --noEmit`, `npm run lint`) porque hay errores de tipos previos a la migración.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
