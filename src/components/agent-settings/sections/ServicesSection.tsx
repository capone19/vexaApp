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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Clock, Briefcase, DollarSign } from "lucide-react";
import type { ServicesSettings, Service, DaySchedule } from "@/lib/types";

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

const emptyService: Omit<Service, "id"> = {
  name: "",
  description: "",
  duration: 60,
  price: 0,
  currency: "CLP",
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
    });
    setIsDialogOpen(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name.trim()) return;

    if (editingService) {
      // Edit existing
      const newServices = settings.services.map((s) =>
        s.id === editingService.id ? { ...s, ...serviceForm } : s
      );
      onChange({ ...settings, services: newServices, lastModified: new Date() });
    } else {
      // Add new
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
                Lista de servicios que ofreces
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddServiceDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Editar servicio" : "Nuevo servicio"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa la información del servicio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duración (minutos)</Label>
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
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Servicio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Duración</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.services.map((service) => (
                  <TableRow key={service.id} className="border-border">
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {service.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-muted/30">
                        {service.duration} min
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatPrice(service.price, service.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
