import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
