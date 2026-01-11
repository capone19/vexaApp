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
  ExternalLink
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

// Plantillas de ejemplo estilo WhatsApp promocional
const mockWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: 'tpl-001',
    name: 'cyber_promo_1',
    status: 'approved',
    content: `Listo 🔥
Ya empezó el Cyber en PROSA y te juro que las ofertas están demasiado buenas.

(Casi me arrepiento 😅)

Si estabas esperando el momento... es ahora.

Encontrarás nuestros packs de siempre con descuentos de hasta un 50% 🤩

Estoy emocionadísima 🥹
Sé que esta es la oportunidad para muchas de tener sus pestañas más fuertes, naturales y cuidadas 💅
y eso me encanta.

Ah, y porfa: fíjate bien en los descuentos que vienen en algunos packs, son ÚNICOS por poquísimos días...!
No quiero que se te pasen 🥹`,
    hasButton: true,
    buttonText: 'VER OFERTAS',
    buttonUrl: 'https://prosachile.cl/cyber',
    category: 'promocion'
  },
  {
    id: 'tpl-002',
    name: 'cyber_promo_2',
    status: 'approved',
    content: `Listo 🔥
Ya empezó el Cyber en PROSA y te juro que las ofertas están demasiado buenas.

(Casi me arrepiento 😅)

Si estabas esperando el momento... es ahora.

Encontrarás nuestros packs de siempre con descuentos de hasta un 50% 🤩

Estoy emocionadísima 🥹
Sé que esta es la oportunidad para muchas de tener sus pestañas más fuertes, naturales y cuidadas 💅
y eso me encanta.

Ah, y porfa: fíjate bien en los descuentos que vienen en algunos packs. Son ÚNICOS por estos días.. No quiero que se te pasen 🥹`,
    hasButton: false,
    category: 'promocion'
  },
  {
    id: 'tpl-003',
    name: 'recuperacion_diego',
    status: 'approved',
    content: `¿Viste que dejaste tu pedido sin completar?

No sé si te pasó algo o te distrajiste (yo soy la reina de eso 👸),
pero te juro que vale la pena rescatarlo.

Es de esos maquillajes que te hacen la vida más fácil al tiro:

✨ Fortalece tus pestañas mientras duermes
✨ Te ahorra tiempo en la mañana
✨ Y sí, también te ves más despierta sin tanto maquillaje

👉 https://prosachile.cl

Y que tú, lo recupero ahora antes de que me distraiga con otra cosa.

Y si necesitas ayuda para elegir, dime tú...
feliz te guío 💬`,
    hasButton: true,
    buttonText: 'IR AL PEDIDO',
    buttonUrl: 'https://prosachile.cl/recuperar',
    category: 'recuperacion'
  },
  {
    id: 'tpl-004',
    name: 'cyber_prosa_final',
    status: 'approved',
    content: `Listo 🔥
Ya empezó el Cyber en PROSA y te juro que las ofertas están demasiado buenas.

(Casi me arrepiento 😅)

Si estabas esperando el momento... es ahora.

Encontrarás nuestros packs de siempre con descuentos de hasta un 50% 🤩

👉 https://prosachile.cl

Estoy emocionadísima 🥹
Sé que esta es la oportunidad para muchas de tener sus pestañas más fuertes, naturales y cuidadas 💅
y eso me encanta.

Ah, y porfa: fíjate bien en los regalitos que vienen en algunos packs.
No quiero que se te pasen 🥹`,
    hasButton: true,
    buttonText: 'RECUPERAR PEDIDO',
    buttonUrl: 'https://prosachile.cl',
    category: 'promocion'
  },
  {
    id: 'tpl-005',
    name: 'bienvenida_nueva',
    status: 'approved',
    content: `¡Hola! 👋

Bienvenida a nuestra comunidad 💕

Soy tu asistente virtual y estoy aquí para ayudarte con todo lo que necesites.

¿Qué te gustaría saber?
• Nuestros productos
• Promociones activas
• Estado de tu pedido
• Métodos de pago

Solo escríbeme y con gusto te ayudo ✨`,
    hasButton: false,
    category: 'bienvenida'
  },
  {
    id: 'tpl-006',
    name: 'seguimiento_post_compra',
    status: 'pending',
    content: `¡Hola! 🌟

¿Cómo te fue con tu compra?

Quería saber si ya recibiste todo bien y si tienes alguna duda sobre cómo usar los productos.

Recuerda que estoy aquí para lo que necesites 💬

¡Un abrazo!`,
    hasButton: true,
    buttonText: 'NECESITO AYUDA',
    buttonUrl: 'https://wa.me/+59171234567',
    category: 'seguimiento'
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

        {/* WhatsApp number indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-green-700 font-medium">+59171234567</span>
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

