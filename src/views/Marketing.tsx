import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  Send,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Crown,
  Sparkles
} from 'lucide-react';
import { mockTemplates } from '@/lib/mock/data';
import type { Template, TemplateCategory, TemplateStatus } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { isPremiumPlan, onPlanChange, getCurrentPlan, type PlanId } from '@/lib/plan';

const categoryLabels: Record<TemplateCategory, string> = {
  followup: 'Seguimiento',
  reminder: 'Recordatorio',
  reactivation: 'Reactivación',
  postservice: 'Post-servicio',
  promotion: 'Promoción',
};

const categoryColors: Record<TemplateCategory, string> = {
  followup: 'bg-blue-50 text-blue-700 border-blue-200',
  reminder: 'bg-amber-50 text-amber-700 border-amber-200',
  reactivation: 'bg-purple-50 text-purple-700 border-purple-200',
  postservice: 'bg-green-50 text-green-700 border-green-200',
  promotion: 'bg-pink-50 text-pink-700 border-pink-200',
};

const Marketing = () => {
  const navigate = useNavigate();
  const [hasPremium, setHasPremium] = useState(isPremiumPlan());
  const [currentPlan, setCurrentPlanState] = useState<PlanId>(getCurrentPlan());
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);

  // Listen for plan changes
  useEffect(() => {
    const unsubscribe = onPlanChange((plan) => {
      setHasPremium(isPremiumPlan());
      setCurrentPlanState(plan);
    });
    return unsubscribe;
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'reminder' as TemplateCategory,
    content: '',
    hasButton: false,
    buttonText: '',
    buttonUrl: '',
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status === 'approved').length,
    pending: templates.filter(t => t.status === 'pending').length,
    rejected: templates.filter(t => t.status === 'rejected').length,
  };

  const handleCreate = () => {
    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: formData.name,
      status: 'pending',
      category: formData.category,
      content: formData.content,
      variables: formData.content.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [],
      hasButton: formData.hasButton,
      buttonText: formData.buttonText,
      buttonUrl: formData.buttonUrl,
      createdAt: new Date(),
    };
    setTemplates([newTemplate, ...templates]);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!editingTemplate) return;
    setTemplates(templates.map(t => 
      t.id === editingTemplate.id 
        ? {
            ...t,
            name: formData.name,
            category: formData.category,
            content: formData.content,
            variables: formData.content.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [],
            hasButton: formData.hasButton,
            buttonText: formData.buttonText,
            buttonUrl: formData.buttonUrl,
            status: 'pending' as TemplateStatus,
          }
        : t
    ));
    setEditingTemplate(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleDuplicate = (template: Template) => {
    const duplicate: Template = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (copia)`,
      status: 'pending',
      createdAt: new Date(),
      lastUsedAt: undefined,
    };
    setTemplates([duplicate, ...templates]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'reminder',
      content: '',
      hasButton: false,
      buttonText: '',
      buttonUrl: '',
    });
  };

  const openEditDialog = (template: Template) => {
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content,
      hasButton: template.hasButton,
      buttonText: template.buttonText || '',
      buttonUrl: template.buttonUrl || '',
    });
    setEditingTemplate(template);
  };

  const getStatusIcon = (status: TemplateStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  // If not premium, show locked state
  if (!hasPremium) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader
            title="Marketing"
            subtitle="Gestiona tus plantillas de WhatsApp Business"
          />

          {/* Upgrade Banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Desbloquea WhatsApp Marketing
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Crea campañas outbound, gestiona plantillas de WhatsApp Business 
                      y automatiza seguimientos con tu audiencia.
                    </p>
                  </div>
                </div>
                <Button className="gap-2 shrink-0" onClick={() => navigate('/facturacion')}>
                  <Sparkles className="h-4 w-4" />
                  Actualizar a Pro
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-border opacity-60">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Plantillas WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Crea y gestiona plantillas aprobadas por WhatsApp Business</p>
                <div className="mt-4">
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Pro
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border opacity-60">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Send className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Campañas Outbound</h3>
                <p className="text-sm text-muted-foreground">Envía campañas masivas a tus contactos segmentados</p>
                <div className="mt-4">
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Pro
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border opacity-60">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Métricas de Campañas</h3>
                <p className="text-sm text-muted-foreground">Analiza el rendimiento de tus campañas en tiempo real</p>
                <div className="mt-4">
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Pro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature List */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Funcionalidades de Marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Crear y gestionar plantillas de WhatsApp Business',
                  'Campañas de seguimiento automáticas',
                  'Segmentación de audiencia por comportamiento',
                  'Métricas de apertura y respuesta',
                  'Automatización de reactivación de leads',
                  'Integración con el funnel de ventas'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Marketing"
          subtitle="Gestiona tus plantillas de WhatsApp Business"
          actions={
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Plantilla
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Aprobadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rechazadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className="border-border hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setViewingTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium line-clamp-1">
                      {template.name}
                    </CardTitle>
                    <Badge variant="outline" className={categoryColors[template.category]}>
                      {categoryLabels[template.category]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(template.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="bg-secondary rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.content}
                  </p>
                  {template.hasButton && template.buttonText && (
                    <div className="mt-2 flex justify-center">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        {template.buttonText}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Variables */}
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(v => (
                      <Badge key={v} variant="secondary" className="text-xs">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Meta & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {template.lastUsedAt 
                      ? `Usado ${format(template.lastUsedAt, 'dd MMM', { locale: es })}`
                      : 'Sin usar'
                    }
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(template); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron plantillas</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Recordatorio 24h"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v as TemplateCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escribe tu mensaje aquí. Usa {variable} para campos dinámicos."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Variables detectadas: {formData.content.match(/\{(\w+)\}/g)?.join(', ') || 'ninguna'}
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary border border-border">
              <Switch
                checked={formData.hasButton}
                onCheckedChange={(checked) => setFormData({ ...formData, hasButton: checked })}
              />
              <Label>Incluir botón de acción</Label>
            </div>

            {formData.hasButton && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Texto del botón</Label>
                  <Input
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="AGENDAR AHORA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL del botón</Label>
                  <Input
                    value={formData.buttonUrl}
                    onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="bg-[#0B141A] rounded-lg p-4 max-w-sm mx-auto">
                <div className="bg-[#005C4B] rounded-lg p-3 text-white text-sm">
                  <p className="whitespace-pre-wrap">{formData.content || 'Tu mensaje aparecerá aquí...'}</p>
                  {formData.hasButton && formData.buttonText && (
                    <div className="mt-2 pt-2 border-t border-white/20 text-center">
                      <span className="text-[#53BDEB] text-sm">{formData.buttonText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              setEditingTemplate(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={editingTemplate ? handleEdit : handleCreate}>
              {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-lg">
          {viewingTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle>{viewingTemplate.name}</DialogTitle>
                  <StatusBadge status={viewingTemplate.status} />
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <Badge variant="outline" className={categoryColors[viewingTemplate.category]}>
                  {categoryLabels[viewingTemplate.category]}
                </Badge>

                <div className="bg-[#0B141A] rounded-lg p-4">
                  <div className="bg-[#005C4B] rounded-lg p-3 text-white text-sm">
                    <p className="whitespace-pre-wrap">{viewingTemplate.content}</p>
                    {viewingTemplate.hasButton && viewingTemplate.buttonText && (
                      <div className="mt-2 pt-2 border-t border-white/20 text-center">
                        <span className="text-[#53BDEB] text-sm">{viewingTemplate.buttonText}</span>
                      </div>
                    )}
                  </div>
                </div>

                {viewingTemplate.variables.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingTemplate.variables.map(v => (
                        <Badge key={v} variant="secondary">{`{${v}}`}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Creada: {format(viewingTemplate.createdAt, 'dd/MM/yyyy', { locale: es })}</span>
                  {viewingTemplate.lastUsedAt && (
                    <span>Último uso: {format(viewingTemplate.lastUsedAt, 'dd/MM/yyyy', { locale: es })}</span>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  openEditDialog(viewingTemplate);
                  setViewingTemplate(null);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                {viewingTemplate.status === 'approved' && (
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Campaña
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Marketing;