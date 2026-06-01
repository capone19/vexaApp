import { Outlet } from 'react-router-dom';
import { PublicidadThemeProvider } from '@/components/publicidad/PublicidadThemeProvider';
import { PublicidadSidebar } from '@/components/publicidad/PublicidadSidebar';

export default function PublicidadLayout() {
  return (
    <PublicidadThemeProvider>
      <div className="flex h-screen overflow-hidden">
        <PublicidadSidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </PublicidadThemeProvider>
  );
}
