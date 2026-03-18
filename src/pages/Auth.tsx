import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { login, register, signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/shared/Logo";
import { isAdminEmail } from "@/lib/admin-config";

type AuthMode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Focus states for premium input effects
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Verificar si ya está autenticado
  useEffect(() => {
    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          const email = session.user.email || '';
          if (isAdminEmail(email)) {
            navigate("/admin");
          } else {
            navigate("/");
          }
        }
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const email = session.user.email || '';
        if (isAdminEmail(email)) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        const result = await login({ email: formData.email, password: formData.password });
        
        if (result.success) {
          toast.success("¡Bienvenido de vuelta!");
          setIsLoading(false);
          // Navegación: onAuthStateChange en esta página + AuthContext (isLoading durante resolveUser)
        } else {
          toast.error(result.error || "Error al iniciar sesión");
          setIsLoading(false);
        }
      } else {
        const result = await register(formData.name, formData.email, formData.password);
        
        if (result.success) {
          toast.success("¡Cuenta creada exitosamente!");
          // Navigation will happen via onAuthStateChange
        } else {
          toast.error(result.error || "Error al crear cuenta");
          setIsLoading(false);
        }
      }
    } catch (error) {
      toast.error("Ha ocurrido un error inesperado");
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    const result = await signInWithGoogle();
    if (!result.success) {
      toast.error(result.error || "Error al iniciar sesión con Google");
      setIsLoading(false);
    }
    // On success, the user will be redirected by OAuth flow
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Animated Background - Light theme with subtle dark accents */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient - light */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        
        {/* Subtle animated orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-slate-200/50 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-slate-300/40 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-100/50 rounded-full blur-[100px]" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating particles - dark */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-slate-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Card with premium shadow */}
        <div className="relative group">
          {/* Deep shadow layers for depth */}
          <div className="absolute -inset-2 bg-black/5 rounded-3xl blur-2xl" />
          <div className="absolute -inset-1 bg-black/10 rounded-2xl blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20 rounded-2xl blur-lg translate-y-4" />
          
          {/* Card */}
          <div className="relative bg-white border border-black/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_10px_25px_-10px_rgba(0,0,0,0.2)] p-8 md:p-10 transition-shadow duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35),0_15px_30px_-10px_rgba(0,0,0,0.25)]">
            
            {/* Logo Section - Using exact same Logo component as sidebar */}
            <div className="flex flex-col items-center mb-8">
              {/* Logo - Same as sidebar with color="dark" */}
              <div className="mb-4">
                <Logo variant="full" color="dark" className="h-10" />
              </div>
              
              {/* Platform description - Sin sparkles */}
              <p className="text-sm font-medium text-primary tracking-wide uppercase mb-2">
                Chatbots IA & Automatización
              </p>
              
              <p className="text-muted-foreground text-sm text-center">
                Inicia sesión para acceder a tu dashboard
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="relative flex p-1 mb-8 bg-secondary rounded-xl border border-border">
              {/* Animated background indicator */}
              <div 
                className={cn(
                  "absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-primary rounded-lg transition-all duration-300 ease-out shadow-sm",
                  mode === "login" ? "left-1" : "left-[calc(50%+2px)]"
                )}
              />
              
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "relative flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 z-10",
                  mode === "login" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={cn(
                  "relative flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 z-10",
                  mode === "register" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Registrarse
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field (Register only) */}
              {mode === "register" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="name" className="text-foreground text-sm font-medium">
                    Nombre Completo
                  </Label>
                  <div className="relative group">
                    <div className={cn(
                      "absolute -inset-0.5 rounded-lg transition-opacity duration-300",
                      focusedField === "name" 
                        ? "bg-gradient-to-r from-primary/30 to-primary/20 opacity-100" 
                        : "bg-transparent opacity-0"
                    )} />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      className="relative bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-lg focus:border-primary focus:ring-primary/20 transition-all duration-200"
                      required={mode === "register"}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm font-medium">
                  Email
                </Label>
                <div className="relative group">
                  <div className={cn(
                    "absolute -inset-0.5 rounded-lg transition-opacity duration-300",
                    focusedField === "email" 
                      ? "bg-gradient-to-r from-primary/30 to-primary/20 opacity-100" 
                      : "bg-transparent opacity-0"
                  )} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="relative bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-lg focus:border-primary focus:ring-primary/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative group">
                  <div className={cn(
                    "absolute -inset-0.5 rounded-lg transition-opacity duration-300",
                    focusedField === "password" 
                      ? "bg-gradient-to-r from-primary/30 to-primary/20 opacity-100" 
                      : "bg-transparent opacity-0"
                  )} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="relative bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-lg pr-12 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] group"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "login" ? "Iniciar Sesión" : "Registrarse"}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="px-4 text-xs text-muted-foreground uppercase tracking-wider">
                O continúa con
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Google Auth */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full h-12 bg-secondary border-border text-foreground hover:bg-secondary/80 hover:border-foreground/20 rounded-lg transition-all duration-200 group"
            >
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="group-hover:text-foreground transition-colors">Continuar con Google</span>
            </Button>

            {/* Legal Text */}
            <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
              Al continuar, aceptas nuestros{" "}
              <a href="#" className="text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline">
                Términos de Servicio
              </a>{" "}
              y{" "}
              <a href="#" className="text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline">
                Política de Privacidad
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.5;
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
