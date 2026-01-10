import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Clock, Briefcase, DollarSign, Target, ClipboardList, AlertCircle, Users } from "lucide-react";
import type { ServicesSettings, Service, DaySchedule, ServiceActionType, RequiredDataType, NoAvailabilityActionType } from "@/lib/types";

interface ServicesSectionProps {
  settings: ServicesSettings;
  onChange: (settings: ServicesSettings) => void;
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

const actionObjectiveLabels: Record<ServiceActionType, string> = {
  agendar: "Agendar cita",
  cotizar: "Cotizar",
  informar: "Solo informar",
  derivar_humano: "Derivar a humano",
};

const requiredDataLabels: Record<RequiredDataType, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
  servicio: "Servicio",
  fecha_preferida: "Fecha preferida",
  medio_pago: "Medio de pago",
  observaciones: "Observaciones",
  otros: "Otros (especificar)",
};

const noAvailabilityLabels: Record<NoAvailabilityActionType, string> = {
  lista_espera: "Ofrecer lista de espera",
  sugerir_horario: "Sugerir otro horario",
  derivar_humano: "Derivar a humano",
  solicitar_flexibilidad: "Solicitar flexibilidad al cliente",
};

const emptyService: Omit<Service, "id"> = {
  name: "",
  description: "",
  duration: 60,
  price: 0,
  currency: "CLP",
  actionObjective: "agendar",
  requiredData: ["nombre", "telefono", "fecha_preferida"],
  otherRequiredData: "",
  noAvailabilityAction: "sugerir_horario",
};

export function ServicesSection({ settings, onChange }: ServicesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newRequirement, setNewRequirement] = useState("");
  const [serviceForm, setServiceForm] = useState<Omit<Service, "id">>(emptyService);

  const handleModalityChange = (modality: ServicesSettings["modality"]) => {
    onChange({ ...settings, modality, lastModified: new Date() });
  };

  const handleScheduleChange = (
    dayIndex: number,
    field: "enabled" | "startTime" | "endTime",
    value: boolean | string
  ) => {
    const newSchedule = [...settings.schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    onChange({ ...settings, schedule: newSchedule, lastModified: new Date() });
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      onChange({
        ...settings,
        requirements: [...settings.requirements, newRequirement.trim()],
        lastModified: new Date(),
      });
      setNewRequirement("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    onChange({
      ...settings,
      requirements: settings.requirements.filter((_, i) => i !== index),
      lastModified: new Date(),
    });
  };

  const handlePricingTypeChange = (pricingType: ServicesSettings["pricingType"]) => {
    onChange({ ...settings, pricingType, lastModified: new Date() });
  };

  const handlePricingNoteChange = (pricingNote: string) => {
    onChange({ ...settings, pricingNote, lastModified: new Date() });
  };

  const openAddServiceDialog = () => {
    setEditingService(null);
    setServiceForm(emptyService);
    setIsDialogOpen(true);
  };

  const openEditServiceDialog = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      currency: service.currency,
      actionObjective: service.actionObjective,
      requiredData: service.requiredData,
      capacityPerSlot: service.capacityPerSlot,
      noAvailabilityAction: service.noAvailabilityAction,
    });
    setIsDialogOpen(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name.trim()) return;

    if (editingService) {
      const newServices = settings.services.map((s) =>
        s.id === editingService.id ? { ...s, ...serviceForm } : s
      );
      onChange({ ...settings, services: newServices, lastModified: new Date() });
    } else {
      const newService: Service = {
        id: `svc-${Date.now()}`,
        ...serviceForm,
      };
      onChange({
        ...settings,
        services: [...settings.services, newService],
        lastModified: new Date(),
      });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteService = (serviceId: string) => {
    onChange({
      ...settings,
      services: settings.services.filter((s) => s.id !== serviceId),
      lastModified: new Date(),
    });
  };

  const handleRequiredDataChange = (data: RequiredDataType, checked: boolean) => {
    const newData = checked
      ? [...serviceForm.requiredData, data]
      : serviceForm.requiredData.filter((d) => d !== data);
    setServiceForm({ ...serviceForm, requiredData: newData });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Modalidad */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Modalidad de servicio
          </CardTitle>
          <CardDescription>
            ¿Cómo ofreces tus servicios?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={settings.modality} onValueChange={handleModalityChange}>
            <SelectTrigger className="w-full max-w-xs bg-muted/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="mixta">Mixta (ambas)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horarios de atención
          </CardTitle>
          <CardDescription>
            Define los horarios en que ofreces servicios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.schedule.map((day, index) => (
              <div key={day.day} className="flex items-center gap-3">
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(checked) => handleScheduleChange(index, "enabled", checked)}
                />
                <span className="w-24 text-sm font-medium">{dayLabels[day.day]}</span>
                {day.enabled ? (
                  <>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => handleScheduleChange(index, "startTime", e.target.value)}
                      className="w-28 bg-muted/30 border-border"
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleScheduleChange(index, "endTime", e.target.value)}
                      className="w-28 bg-muted/30 border-border"
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requisitos */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Requisitos para el servicio</CardTitle>
          <CardDescription>
            Condiciones que el cliente debe cumplir antes del servicio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {settings.requirements.map((req, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2"
              >
                <span className="flex-1 text-sm">{req}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRequirement(index)}
                  className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              placeholder="Ej: Llegar 10 minutos antes"
              className="bg-muted/30 border-border"
              onKeyDown={(e) => e.key === "Enter" && handleAddRequirement()}
            />
            <Button onClick={handleAddRequirement} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catálogo de servicios */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Catálogo de servicios</CardTitle>
              <CardDescription>
                Lista de servicios que ofreces con su configuración de agente
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddServiceDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Editar servicio" : "Nuevo servicio"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa la información del servicio y cómo debe manejarlo el agente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Info básica */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre del servicio</Label>
                      <Input
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        placeholder="Ej: Corte de cabello"
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción breve</Label>
                      <Textarea
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                        placeholder="Describe el servicio..."
                        className="bg-muted/30 border-border min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Duración (min)</Label>
                        <Input
                          type="number"
                          value={serviceForm.duration}
                          onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 0 })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio ({serviceForm.currency})</Label>
                        <Input
                          type="number"
                          value={serviceForm.price}
                          onChange={(e) => setServiceForm({ ...serviceForm, price: parseInt(e.target.value) || 0 })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacidad/hora</Label>
                        <Input
                          type="number"
                          value={serviceForm.capacityPerSlot || ""}
                          onChange={(e) => setServiceForm({ ...serviceForm, capacityPerSlot: parseInt(e.target.value) || undefined })}
                          placeholder="Opcional"
                          className="bg-muted/30 border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Configuración del agente */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Comportamiento del agente
                    </h4>

                    <div className="space-y-2">
                      <Label>Acción objetivo del servicio</Label>
                      <Select
                        value={serviceForm.actionObjective}
                        onValueChange={(v) => setServiceForm({ ...serviceForm, actionObjective: v as ServiceActionType })}
                      >
                        <SelectTrigger className="bg-muted/30 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(actionObjectiveLabels) as ServiceActionType[]).map((key) => (
                            <SelectItem key={key} value={key}>{actionObjectiveLabels[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        ¿Qué debe lograr el agente cuando el cliente pregunta por este servicio?
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        Datos mínimos requeridos
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(requiredDataLabels) as RequiredDataType[]).map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={`data-${key}`}
                              checked={serviceForm.requiredData.includes(key)}
                              onCheckedChange={(checked) => handleRequiredDataChange(key, checked as boolean)}
                            />
                            <Label htmlFor={`data-${key}`} className="font-normal cursor-pointer">
                              {requiredDataLabels[key]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {/* Campo de texto condicional para "Otros" */}
                      {serviceForm.requiredData.includes("otros") && (
                        <div className="mt-2">
                          <Input
                            placeholder="Especifica qué otros datos necesitas (ej: RUT, dirección, tipo de mascota...)"
                            value={serviceForm.otherRequiredData || ""}
                            onChange={(e) => setServiceForm({ ...serviceForm, otherRequiredData: e.target.value })}
                            className="bg-muted/30 border-border"
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        El agente no avanzará hasta tener estos datos
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        Cuando NO hay disponibilidad
                      </Label>
                      <Select
                        value={serviceForm.noAvailabilityAction}
                        onValueChange={(v) => setServiceForm({ ...serviceForm, noAvailabilityAction: v as NoAvailabilityActionType })}
                      >
                        <SelectTrigger className="bg-muted/30 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(noAvailabilityLabels) as NoAvailabilityActionType[]).map((key) => (
                            <SelectItem key={key} value={key}>{noAvailabilityLabels[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveService}>
                    {editingService ? "Guardar cambios" : "Agregar servicio"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {settings.services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay servicios configurados</p>
              <p className="text-sm">Agrega tu primer servicio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.services.map((service) => (
                <div 
                  key={service.id} 
                  className="border border-border rounded-lg p-4 bg-muted/10 hover:border-primary/30 transition-colors"
                >
                  {/* Header del servicio */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-foreground">{service.name}</h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {actionObjectiveLabels[service.actionObjective]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditServiceDialog(service)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Info principal en cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">Duración</span>
                      </div>
                      <p className="font-semibold text-foreground">{service.duration} min</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span className="text-xs">Precio</span>
                      </div>
                      <p className="font-semibold text-primary">{formatPrice(service.price, service.currency)}</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs">Capacidad/hora</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {service.capacityPerSlot ? `${service.capacityPerSlot} personas` : "Sin límite"}
                      </p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Sin disponibilidad</span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        {noAvailabilityLabels[service.noAvailabilityAction].replace("Ofrecer ", "").replace("Solicitar ", "")}
                      </p>
                    </div>
                  </div>

                  {/* Datos requeridos para agendar */}
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Datos requeridos para agendar</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {service.requiredData.map((data) => (
                        <Badge key={data} variant="outline" className="bg-background text-foreground">
                          {data === "otros" && service.otherRequiredData 
                            ? `Otros: ${service.otherRequiredData}` 
                            : requiredDataLabels[data]}
                        </Badge>
                      ))}
                      {service.requiredData.length === 0 && (
                        <span className="text-sm text-muted-foreground">Sin requisitos específicos</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tipo de precios */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Política de precios
          </CardTitle>
          <CardDescription>
            ¿Cómo manejas los precios de tus servicios?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.pricingType}
            onValueChange={(value) => handlePricingTypeChange(value as ServicesSettings["pricingType"])}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="fijo" id="fijo" />
              <Label htmlFor="fijo" className="font-normal">
                <span className="font-medium">Precio fijo</span>
                <span className="text-muted-foreground text-sm ml-2">
                  - Los precios son exactos como se muestran
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="variable" id="variable" />
              <Label htmlFor="variable" className="font-normal">
                <span className="font-medium">Precio variable</span>
                <span className="text-muted-foreground text-sm ml-2">
                  - Depende de factores adicionales
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="referencial" id="referencial" />
              <Label htmlFor="referencial" className="font-normal">
                <span className="font-medium">Precio referencial</span>
                <span className="text-muted-foreground text-sm ml-2">
                  - Precios aproximados sujetos a evaluación
                </span>
              </Label>
            </div>
          </RadioGroup>

          {(settings.pricingType === "variable" || settings.pricingType === "referencial") && (
            <div className="pt-4">
              <Label>Nota sobre precios</Label>
              <Textarea
                value={settings.pricingNote || ""}
                onChange={(e) => handlePricingNoteChange(e.target.value)}
                placeholder="Explica cómo varían los precios..."
                className="mt-2 bg-muted/30 border-border min-h-[80px]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
