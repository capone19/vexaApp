import { Loader2 } from "lucide-react";

// Componente de loading para Suspense
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
