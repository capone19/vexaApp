import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Phone, Clock } from "lucide-react";
import type { BusinessSettings, Location, DaySchedule } from "@/lib/types";

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

export function BusinessSection({ settings, onChange }: BusinessSectionProps) {
  const [newPhone, setNewPhone] = useState("");

  const handleDescriptionChange = (description: string) => {
    onChange({ ...settings, description, lastModified: new Date() });
  };

  const handleTogglePhysicalStore = (hasPhysicalStore: boolean) => {
    onChange({ ...settings, hasPhysicalStore, lastModified: new Date() });
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
