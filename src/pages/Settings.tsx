import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Mail,
  Phone,
  Briefcase,
  Upload,
  Save,
  CheckCircle,
  ImagePlus,
  X,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CompanyProfile {
  companyName: string;
  email: string;
  phoneNumber: string;
  industry: string;
  logo: string | null;
}

const STORAGE_KEY = 'company_profile';
const PHONE_PREFIX = '+591';

// Función para obtener el perfil guardado o el inicial
const getStoredProfile = (): CompanyProfile => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading profile:', e);
  }
  return {
    companyName: 'Beauty Salon Pro',
    email: 'contacto@beautysalonpro.com',
    phoneNumber: '7123 4567',
    industry: 'Belleza y Estética',
    logo: null,
  };
};

export default function Settings() {
  const [profile, setProfile] = useState<CompanyProfile>(getStoredProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Cargar perfil al montar
  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setShowSuccess(false);
  };

  const handlePhoneChange = (value: string) => {
    // Solo permitir números y espacios
    const cleaned = value.replace(/[^\d\s]/g, '');
    setProfile(prev => ({ ...prev, phoneNumber: cleaned }));
    setShowSuccess(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB');
      return;
    }

    // Convertir a base64 para almacenar en localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfile(prev => ({ ...prev, logo: base64 }));
      setShowSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simular delay de guardado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      console.log('Perfil guardado:', profile);
      
      // Disparar evento para actualizar el TopBar
      window.dispatchEvent(new Event('profile-updated'));
      
      setShowSuccess(true);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving profile:', e);
      alert('Error al guardar los cambios');
    }
    
    setIsSaving(false);
  };

  const initials = profile.companyName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <MainLayout>
      <div className={cn("space-y-4 md:space-y-6", !isMobile && "max-w-3xl")}>
        <PageHeader
          title="Mi Perfil"
          subtitle={isMobile ? undefined : "Gestiona la información de tu negocio y cuenta"}
        />

        {/* Bloque Información de la Empresa */}
        <Card className="border-border">
          <CardHeader className={cn(isMobile && "pb-3")}>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Información de la Empresa
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">
              Actualiza los datos de tu negocio
            </p>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Avatar / Logo de la empresa */}
            <div className={cn(
              "flex gap-4 md:gap-6 pb-2",
              isMobile ? "flex-col items-center text-center" : "items-center"
            )}>
              <div className="relative group">
                <Avatar className={cn(
                  "border-2 border-border",
                  isMobile ? "h-24 w-24" : "h-20 w-20"
                )}>
                  {profile.logo ? (
                    <AvatarImage src={profile.logo} alt={profile.companyName} />
                  ) : null}
                  <AvatarFallback className={cn(
                    "bg-primary/10 text-primary font-semibold",
                    isMobile ? "text-2xl" : "text-xl"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay para cambiar logo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer transition-opacity",
                    isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {isMobile ? (
                    <Camera className="h-6 w-6 text-white" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>
              <div className={cn("space-y-1", isMobile && "w-full")}>
                <p className="font-medium text-foreground">{profile.companyName}</p>
                <p className="text-sm text-muted-foreground">Logo de la empresa</p>
                <div className={cn(
                  "flex items-center gap-2 mt-2",
                  isMobile && "justify-center"
                )}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("gap-2", isMobile && "h-10 flex-1 max-w-[160px]")}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {profile.logo ? 'Cambiar' : 'Subir logo'}
                  </Button>
                  {profile.logo && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "gap-2 text-destructive hover:text-destructive hover:bg-destructive/10",
                        isMobile && "h-10"
                      )}
                      onClick={() => {
                        setProfile(prev => ({ ...prev, logo: null }));
                        setShowSuccess(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      {!isMobile && "Quitar"}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o GIF. Máximo 2MB.
                </p>
              </div>
            </div>

            <Separator />

            {/* Formulario de información editable */}
            <div className="space-y-4 md:space-y-5">
              {/* Nombre de la empresa */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Nombre de la empresa
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Nombre de tu empresa"
                  className={cn("border-border focus:border-primary", isMobile && "h-12")}
                />
              </div>

              {/* Email de contacto */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email de contacto
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contacto@tuempresa.com"
                  className={cn("border-border focus:border-primary", isMobile && "h-12")}
                />
              </div>

              {/* Teléfono de contacto con prefijo fijo */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono de contacto
                </Label>
                <div className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center px-4 bg-secondary border border-r-0 border-border rounded-l-md min-w-[60px]",
                    isMobile ? "h-12" : "h-10"
                  )}>
                    <span className="text-sm text-foreground font-medium">{PHONE_PREFIX}</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="7123 4567"
                    className={cn(
                      "border-border focus:border-primary rounded-l-none flex-1",
                      isMobile && "h-12"
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Número completo: {PHONE_PREFIX} {profile.phoneNumber}
                </p>
              </div>

              {/* Industria */}
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Industria
                </Label>
                <Input
                  id="industry"
                  type="text"
                  value={profile.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  placeholder="Ej: Fitness, Salud, Tecnología, Belleza"
                  className={cn("border-border focus:border-primary", isMobile && "h-12")}
                />
                <p className="text-xs text-muted-foreground">
                  Indica el sector o industria de tu negocio
                </p>
              </div>
            </div>

            <Separator />

            {/* Botón de guardar */}
            <div className={cn(
              "flex items-center pt-2",
              isMobile ? "flex-col-reverse gap-3" : "justify-between"
            )}>
              <div className={cn(
                "flex items-center gap-2 text-sm text-emerald-600 transition-opacity duration-300",
                showSuccess ? "opacity-100" : "opacity-0"
              )}>
                <CheckCircle className="h-4 w-4" />
                Cambios guardados correctamente
              </div>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn("gap-2", isMobile && "w-full h-12")}
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
