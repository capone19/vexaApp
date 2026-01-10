import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin, Phone, Clock, Globe, Users, Sparkles, Instagram, Facebook, Linkedin, Youtube, Link2 } from "lucide-react";
import type { BusinessSettings, Location, DaySchedule, ServiceCoverageType, IdealClientType, SocialLinks } from "@/lib/types";

// TikTok icon component (not in Lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Twitter/X icon
const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface BusinessSectionProps {
  settings: BusinessSettings;
  onChange: (settings: BusinessSettings) => void;
}

const dayLabels: Record<DaySchedule["day"], string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const coverageOptions: { value: ServiceCoverageType; label: string; description: string }[] = [
  { value: "presencial_local", label: "Presencial en local", description: "Clientes vienen a tu ubicación" },
  { value: "domicilio", label: "A domicilio", description: "Vas donde el cliente" },
  { value: "online", label: "Online", description: "Servicios remotos/virtuales" },
  { value: "hibrido", label: "Híbrido", description: "Combinas modalidades" },
];

const clientTypeOptions: { value: IdealClientType; label: string }[] = [
  { value: "personas_naturales", label: "Personas naturales" },
  { value: "empresas", label: "Empresas" },
  { value: "premium", label: "Premium" },
  { value: "masivo", label: "Masivo" },
  { value: "urgente", label: "Urgente" },
  { value: "planificado", label: "Planificado" },
];

export function BusinessSection({ settings, onChange }: BusinessSectionProps) {
  const [newPhone, setNewPhone] = useState("");

  const handleDescriptionChange = (description: string) => {
    onChange({ ...settings, description, lastModified: new Date() });
  };

  const handleTogglePhysicalStore = (hasPhysicalStore: boolean) => {
    onChange({ ...settings, hasPhysicalStore, lastModified: new Date() });
  };

  const handleCoverageChange = (coverage: ServiceCoverageType, checked: boolean) => {
    const newCoverage = checked
      ? [...settings.serviceCoverage, coverage]
      : settings.serviceCoverage.filter((c) => c !== coverage);
    onChange({ ...settings, serviceCoverage: newCoverage, lastModified: new Date() });
  };

  const handleCoverageZonesChange = (coverageZones: string) => {
    onChange({ ...settings, coverageZones, lastModified: new Date() });
  };

  const handleClientTypeChange = (clientType: IdealClientType, checked: boolean) => {
    const newTypes = checked
      ? [...settings.idealClientTypes, clientType]
      : settings.idealClientTypes.filter((t) => t !== clientType);
    onChange({ ...settings, idealClientTypes: newTypes, lastModified: new Date() });
  };

  const handleValuePropositionChange = (valueProposition: string) => {
    onChange({ ...settings, valueProposition, lastModified: new Date() });
  };

  const handleSocialLinkChange = (platform: keyof SocialLinks, value: string) => {
    onChange({
      ...settings,
      socialLinks: { ...settings.socialLinks, [platform]: value },
      lastModified: new Date(),
    });
  };

  const handleWebsiteChange = (website: string) => {
    onChange({ ...settings, website, lastModified: new Date() });
  };

  const handleAddPhone = () => {
    if (newPhone.trim()) {
      onChange({
        ...settings,
        phoneNumbers: [...settings.phoneNumbers, newPhone.trim()],
        lastModified: new Date(),
      });
      setNewPhone("");
    }
  };

  const handleRemovePhone = (index: number) => {
    onChange({
      ...settings,
      phoneNumbers: settings.phoneNumbers.filter((_, i) => i !== index),
      lastModified: new Date(),
    });
  };

  const handleAddLocation = () => {
    const newLocation: Location = {
      id: `loc-${Date.now()}`,
      name: "",
      address: "",
      city: "",
      schedule: [
        { day: "lunes", enabled: true, startTime: "09:00", endTime: "18:00" },
        { day: "martes", enabled: true, startTime: "09:00", endTime: "18:00" },
        { day: "miercoles", enabled: true, startTime: "09:00", endTime: "18:00" },
        { day: "jueves", enabled: true, startTime: "09:00", endTime: "18:00" },
        { day: "viernes", enabled: true, startTime: "09:00", endTime: "18:00" },
        { day: "sabado", enabled: false, startTime: "", endTime: "" },
        { day: "domingo", enabled: false, startTime: "", endTime: "" },
      ],
    };
    onChange({
      ...settings,
      locations: [...settings.locations, newLocation],
      lastModified: new Date(),
    });
  };

  const handleUpdateLocation = (index: number, updates: Partial<Location>) => {
    const newLocations = [...settings.locations];
    newLocations[index] = { ...newLocations[index], ...updates };
    onChange({ ...settings, locations: newLocations, lastModified: new Date() });
  };

  const handleRemoveLocation = (index: number) => {
    onChange({
      ...settings,
      locations: settings.locations.filter((_, i) => i !== index),
      lastModified: new Date(),
    });
  };

  const handleScheduleChange = (
    locationIndex: number,
    dayIndex: number,
    field: "enabled" | "startTime" | "endTime",
    value: boolean | string
  ) => {
    const newLocations = [...settings.locations];
    const newSchedule = [...newLocations[locationIndex].schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    newLocations[locationIndex] = { ...newLocations[locationIndex], schedule: newSchedule };
    onChange({ ...settings, locations: newLocations, lastModified: new Date() });
  };

  const showCoverageZones = settings.serviceCoverage.includes("domicilio") || 
                            settings.serviceCoverage.includes("hibrido");

  return (
    <div className="space-y-6">
      {/* Información general */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Información general del negocio</CardTitle>
          <CardDescription>
            Esta información ayuda al agente a responder consultas sobre tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe tu negocio, qué servicios ofreces, qué te diferencia..."
            className="min-h-[120px] bg-muted/30 border-border"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {settings.description.length} / 1000 caracteres
          </p>
        </CardContent>
      </Card>

      {/* Propuesta de valor */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Propuesta de valor
          </CardTitle>
          <CardDescription>
            Resume en una frase qué hace único a tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={settings.valueProposition}
            onChange={(e) => handleValuePropositionChange(e.target.value)}
            placeholder="Ej: Atención rápida y profesional con foco en experiencia premium."
            className="bg-muted/30 border-border"
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {settings.valueProposition.length} / 150 caracteres
          </p>
        </CardContent>
      </Card>

      {/* Cobertura del servicio */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Cobertura del servicio
          </CardTitle>
          <CardDescription>
            ¿Cómo entregas tus servicios?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coverageOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors cursor-pointer ${
                  settings.serviceCoverage.includes(option.value)
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/10 hover:border-primary/20"
                }`}
                onClick={() => handleCoverageChange(option.value, !settings.serviceCoverage.includes(option.value))}
              >
                <Checkbox
                  checked={settings.serviceCoverage.includes(option.value)}
                  onCheckedChange={(checked) => handleCoverageChange(option.value, checked as boolean)}
                />
                <div>
                  <Label className="font-medium cursor-pointer">{option.label}</Label>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>

          {showCoverageZones && (
            <div className="pt-4 space-y-2">
              <Label>Zonas de cobertura</Label>
              <Textarea
                value={settings.coverageZones}
                onChange={(e) => handleCoverageZonesChange(e.target.value)}
                placeholder="Describe las zonas donde ofreces servicio a domicilio o híbrido. Ej: Santiago Centro, Providencia, Las Condes, Ñuñoa..."
                className="min-h-[80px] bg-muted/30 border-border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tipo de cliente ideal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tipo de cliente ideal (ICP)
          </CardTitle>
          <CardDescription>
            ¿A quién va dirigido principalmente tu servicio?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {clientTypeOptions.map((option) => (
              <Badge
                key={option.value}
                variant={settings.idealClientTypes.includes(option.value) ? "default" : "outline"}
                className={`cursor-pointer transition-all px-3 py-1.5 ${
                  settings.idealClientTypes.includes(option.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() => handleClientTypeChange(option.value, !settings.idealClientTypes.includes(option.value))}
              >
                {option.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Selecciona todos los que apliquen. Esto ayuda al agente a personalizar la comunicación.
          </p>
        </CardContent>
      </Card>

      {/* Redes sociales y página web */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Redes sociales y página web
          </CardTitle>
          <CardDescription>
            El agente puede compartir estos enlaces cuando los clientes pregunten por tus redes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Página web */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Página web
            </Label>
            <Input
              value={settings.website || ""}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              placeholder="https://www.tunegocio.com"
              className="bg-muted/30 border-border"
            />
          </div>

          {/* Grid de redes sociales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram
              </Label>
              <Input
                value={settings.socialLinks?.instagram || ""}
                onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                placeholder="https://instagram.com/tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </Label>
              <Input
                value={settings.socialLinks?.facebook || ""}
                onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                placeholder="https://facebook.com/tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TikTokIcon className="h-4 w-4" />
                TikTok
              </Label>
              <Input
                value={settings.socialLinks?.tiktok || ""}
                onChange={(e) => handleSocialLinkChange("tiktok", e.target.value)}
                placeholder="https://tiktok.com/@tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn
              </Label>
              <Input
                value={settings.socialLinks?.linkedin || ""}
                onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                placeholder="https://linkedin.com/company/tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube
              </Label>
              <Input
                value={settings.socialLinks?.youtube || ""}
                onChange={(e) => handleSocialLinkChange("youtube", e.target.value)}
                placeholder="https://youtube.com/@tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <XTwitterIcon className="h-4 w-4" />
                X (Twitter)
              </Label>
              <Input
                value={settings.socialLinks?.twitter || ""}
                onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                placeholder="https://x.com/tunegocio"
                className="bg-muted/30 border-border"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Solo completa las redes que uses activamente. El agente solo compartirá los enlaces que configures.
          </p>
        </CardContent>
      </Card>

      {/* Tienda física */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Tienda física
              </CardTitle>
              <CardDescription>
                Configura tus ubicaciones físicas si las tienes
              </CardDescription>
            </div>
            <Switch
              checked={settings.hasPhysicalStore}
              onCheckedChange={handleTogglePhysicalStore}
            />
          </div>
        </CardHeader>

        {settings.hasPhysicalStore && (
          <CardContent className="space-y-4">
            {settings.locations.map((location, locIndex) => (
              <div
                key={location.id}
                className="border border-border rounded-lg p-4 space-y-4 bg-muted/10"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Sede {locIndex + 1}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLocation(locIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={location.name}
                      onChange={(e) => handleUpdateLocation(locIndex, { name: e.target.value })}
                      placeholder="Ej: Sede Centro"
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={location.address}
                      onChange={(e) => handleUpdateLocation(locIndex, { address: e.target.value })}
                      placeholder="Ej: Av. Principal 123"
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={location.city}
                      onChange={(e) => handleUpdateLocation(locIndex, { city: e.target.value })}
                      placeholder="Ej: Santiago"
                      className="bg-muted/30 border-border"
                    />
                  </div>
                </div>

                {/* Horarios */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horarios
                  </Label>
                  <div className="space-y-2">
                    {location.schedule.map((day, dayIndex) => (
                      <div key={day.day} className="flex items-center gap-3">
                        <Switch
                          checked={day.enabled}
                          onCheckedChange={(checked) =>
                            handleScheduleChange(locIndex, dayIndex, "enabled", checked)
                          }
                        />
                        <span className="w-24 text-sm">{dayLabels[day.day]}</span>
                        {day.enabled ? (
                          <>
                            <Input
                              type="time"
                              value={day.startTime}
                              onChange={(e) =>
                                handleScheduleChange(locIndex, dayIndex, "startTime", e.target.value)
                              }
                              className="w-28 bg-muted/30 border-border"
                            />
                            <span className="text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={day.endTime}
                              onChange={(e) =>
                                handleScheduleChange(locIndex, dayIndex, "endTime", e.target.value)
                              }
                              className="w-28 bg-muted/30 border-border"
                            />
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Cerrado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={handleAddLocation} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Agregar sede
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Teléfonos */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Atención telefónica
          </CardTitle>
          <CardDescription>
            Números donde los clientes pueden contactarte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.phoneNumbers.map((phone, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-3 py-1.5 gap-2 bg-muted/50"
              >
                {phone}
                <button
                  onClick={() => handleRemovePhone(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="bg-muted/30 border-border"
            />
            <Button onClick={handleAddPhone} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
