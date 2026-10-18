import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        {/* VEXA Logo */}
        <div className="flex justify-center mb-8">
          <Logo variant="icon" color="primary" className="h-16 w-16 opacity-20" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">
            Página no encontrada
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          La página que buscas no existe o ha sido movida.
        </p>
        
        <Button asChild className="mt-4">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
