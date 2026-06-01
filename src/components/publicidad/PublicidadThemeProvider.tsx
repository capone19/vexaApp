import type { ReactNode } from 'react';

interface PublicidadThemeProviderProps {
  children: ReactNode;
}

export function PublicidadThemeProvider({ children }: PublicidadThemeProviderProps) {
  return (
    <div data-theme="publicidad" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
