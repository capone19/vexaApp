import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Info,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYCloudTemplates, type WhatsAppTemplate } from '@/hooks/use-ycloud-templates';
import { useYCloudConfig } from '@/hooks/use-ycloud-config';
import { CreateTemplateDialog } from '@/components/marketing/CreateTemplateDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const categoryLabels: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidad',
  authentication: 'Autenticación',
  service: 'Servicio',
};

const categoryColors: Record<string, string> = {
  marketing: 'bg-pink-50 text-pink-700',
  utility: 'bg-blue-50 text-blue-700',
  authentication: 'bg-purple-50 text-purple-700',
  service: 'bg-green-50 text-green-700',
};

const MarketingTemplates = () => {
  const navigate = useNavigate();
  const { templates, isLoading, syncTemplates, deleteTemplate, isSyncing, isDeleting } = useYCloudTemplates();
  const { isConfigured, isLoading: isConfigLoading } = useYCloudConfig();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.body_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-50 text-green-700 border-0 gap-1">
            <CheckCircle className="h-3 w-3" />
            Aprobado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-0 gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-0 gap-1">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-50 text-gray-700 border-0 gap-1">
            {status}
          </Badge>
        );
    }
  };

  const handleDeleteClick = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    await deleteTemplate.mutateAsync({ templateId: templateToDelete.id, deleteFromYCloud: true });
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  // Loading state
  if (isConfigLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Plantillas" subtitle="Gestiona tus plantillas de WhatsApp Business" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20 mt-2" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not configured state
  if (!isConfigured) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Plantillas" subtitle="Gestiona tus plantillas de WhatsApp Business" />
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">Configura tu cuenta de WhatsApp</p>
                  <p className="text-sm text-amber-700">
                    Conecta tu cuenta de YCloud para gestionar plantillas de WhatsApp Business
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/configuracion?tab=integraciones')} className="gap-2 shrink-0">
                <Settings className="h-4 w-4" />
                Configurar
              </Button>
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
          title="Plantillas"
          subtitle="Gestiona tus plantillas de WhatsApp Business"
          actions={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => syncTemplates.mutate()}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                Sincronizar
              </Button>
              <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Crear template
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="utility">Utilidad</SelectItem>
              <SelectItem value="authentication">Autenticación</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">¿Cómo funcionan las plantillas?</p>
              <p className="text-sm text-blue-700">
                Las plantillas deben ser aprobadas por Meta antes de usarse. 
                Usa variables como <code className="bg-blue-100 px-1 rounded">{"{{1}}"}</code> para personalizar mensajes.
                El tiempo de aprobación es de 24-48 horas.
              </p>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20 mt-2" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map(template => (
              <Card 
                key={template.id} 
                className="border-border hover:shadow-md transition-shadow group"
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {template.name}
                      </p>
                      <Badge className={cn(categoryColors[template.category] || 'bg-gray-50 text-gray-700', 'border-0 text-xs')}>
                        {categoryLabels[template.category] || template.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(template.status)}
                      <button 
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive"
                        onClick={() => handleDeleteClick(template)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {/* WhatsApp Message Preview */}
                  <div className="bg-[#E8F5E9] rounded-lg p-3 space-y-2">
                    {template.header_content && (
                      <p className="text-sm font-semibold text-gray-800">
                        {template.header_content}
                      </p>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed" style={{ fontSize: '13px' }}>
                      {template.body_text.length > 200 
                        ? template.body_text.substring(0, 200) + '...' 
                        : template.body_text}
                    </p>
                    {template.footer_text && (
                      <p className="text-xs text-gray-500">{template.footer_text}</p>
                    )}
                    {Array.isArray(template.buttons) && template.buttons.length > 0 && (
                      <div className="pt-2 border-t border-green-200">
                        {(template.buttons as Array<{ type: string; text: string; url?: string }>).slice(0, 2).map((btn, i) => (
                          <button key={i} className="w-full flex items-center justify-center gap-2 text-[#00A884] text-sm font-medium py-1">
                            {btn.type === 'URL' && <ExternalLink className="h-3.5 w-3.5" />}
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {template.language || 'es'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      12:51 ✓✓
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTemplates.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p>No se encontraron plantillas</p>
                {templates.length === 0 && (
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => syncTemplates.mutate()}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    Sincronizar desde YCloud
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el template "{templateToDelete?.name}" de YCloud y de tu cuenta.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default MarketingTemplates;
