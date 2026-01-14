import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import type { TemplateStatus } from '@/lib/types';

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  content: string;
  hasButton: boolean;
  buttonText?: string;
  buttonUrl?: string;
  category: 'promocion' | 'recuperacion' | 'bienvenida' | 'seguimiento';
}

// Plantilla de ejemplo - Los clientes crearán sus propias plantillas
const mockWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: 'tpl-ejemplo',
    name: 'ejemplo_bienvenida',
    status: 'approved',
    content: `¡Hola {{1}}! 👋

Gracias por contactarnos.

Soy el asistente virtual de [Tu Negocio] y estoy aquí para ayudarte.

¿En qué puedo asistirte hoy?
• Información de servicios
• Agendar una cita
• Consultar disponibilidad
• Resolver dudas

Solo escríbeme y con gusto te ayudo ✨`,
    hasButton: true,
    buttonText: 'VER SERVICIOS',
    buttonUrl: 'https://tunegocio.com/servicios',
    category: 'bienvenida'
  },
];

const categoryLabels = {
  promocion: 'Promoción',
  recuperacion: 'Recuperación',
  bienvenida: 'Bienvenida',
  seguimiento: 'Seguimiento',
};

const categoryColors = {
  promocion: 'bg-pink-50 text-pink-700',
  recuperacion: 'bg-amber-50 text-amber-700',
  bienvenida: 'bg-green-50 text-green-700',
  seguimiento: 'bg-blue-50 text-blue-700',
};

const MarketingTemplates = () => {
  const [templates] = useState<WhatsAppTemplate[]>(mockWhatsAppTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: TemplateStatus) => {
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
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plantillas"
          subtitle="Gestiona tus plantillas de WhatsApp Business"
          actions={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Crear nuevo template
            </Button>
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
              <SelectItem value="promocion">Promoción</SelectItem>
              <SelectItem value="recuperacion">Recuperación</SelectItem>
              <SelectItem value="bienvenida">Bienvenida</SelectItem>
              <SelectItem value="seguimiento">Seguimiento</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className="border-border hover:shadow-md transition-shadow cursor-pointer group"
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {template.name}
                    </p>
                    <Badge className={`${categoryColors[template.category]} border-0 text-xs`}>
                      {categoryLabels[template.category]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(template.status)}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* WhatsApp Message Preview */}
                <div className="bg-[#E8F5E9] rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed" style={{ fontSize: '13px' }}>
                    {template.content.length > 300 
                      ? template.content.substring(0, 300) + '...' 
                      : template.content}
                  </p>
                  {template.hasButton && template.buttonText && (
                    <div className="pt-2 border-t border-green-200">
                      <button className="w-full flex items-center justify-center gap-2 text-[#00A884] text-sm font-medium py-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {template.buttonText}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end mt-3 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    12:51 ✓✓
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron plantillas</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MarketingTemplates;

