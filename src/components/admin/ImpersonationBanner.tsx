// ============================================
// VEXA - ImpersonationBanner
// ============================================
// Banner visible cuando el admin está impersonando un cliente
// ============================================

import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedTenant, stopImpersonation } = useImpersonation();
  const { isAdmin } = useAuthContext();
  const navigate = useNavigate();

  // Solo mostrar si es admin y está impersonando
  if (!isAdmin || !isImpersonating || !impersonatedTenant) {
    return null;
  }

  const handleExit = async () => {
    await stopImpersonation();
    navigate('/admin/clientes');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 shadow-lg">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20">
            <Eye className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium text-sm md:text-base">
              Vista ADMIN:
            </span>
            <span className="font-bold text-sm md:text-base">
              {impersonatedTenant.name}
            </span>
            <span className="hidden sm:inline text-xs bg-amber-600/20 px-2 py-0.5 rounded-full">
              {impersonatedTenant.plan}
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExit}
          className="bg-amber-600 hover:bg-amber-700 text-white border-amber-700 gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir de vista cliente</span>
          <span className="sm:hidden">Salir</span>
        </Button>
      </div>
    </div>
  );
}
