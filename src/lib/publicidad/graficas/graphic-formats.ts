export type GraphicFormat = {
  id: string;
  agentLabel: string;
  nombre: string;
  tagline: string;
  descripcion: string;
  badge?: 'Recomendado' | 'Beta';
};

export const GRAPHIC_FORMATS: GraphicFormat[] = [
  {
    id: 'no-compres-esto',
    agentLabel: 'no compres esto',
    nombre: 'No compres esto',
    tagline: 'EL GANCHO INVERSO',
    descripcion:
      'Decir «no compres» rompe el patrón del feed y dispara la curiosidad: la gente lee para descubrir por qué. Un titular gigante con el producto al frente. Brutal en público frío.',
    badge: 'Recomendado',
  },
  {
    id: 'versus',
    agentLabel: 'versus',
    nombre: 'Versus',
    tagline: 'ESTO VS. LO DE SIEMPRE',
    descripcion:
      'El cerebro decide más rápido cuando ve el contraste. Pone tu producto al lado de «lo de siempre» y la elección se vuelve obvia, sin atacar a ningún competidor.',
    badge: 'Recomendado',
  },
  {
    id: 'beneficios',
    agentLabel: 'beneficios',
    nombre: 'Beneficios',
    tagline: 'PROMESA + RAZONES CLARAS',
    descripcion:
      'El clásico que nunca falla: una promesa fuerte arriba, tres razones escaneables y un cierre. Se entiende de un vistazo. Ideal cuando el cliente ya conoce la categoría.',
    badge: 'Recomendado',
  },
  {
    id: 'lineup',
    agentLabel: 'lineup',
    nombre: 'Lineup',
    tagline: 'TITULAR CON ENERGÍA + ABANICO',
    descripcion:
      'Un titular con actitud y el producto repetido en abanico. Comunica abundancia y deseo al instante; perfecto para lucir diseño, colores o variedad.',
  },
  {
    id: 'busqueda-y-solucion',
    agentLabel: 'búsqueda y solución',
    nombre: 'Búsqueda y solución',
    tagline: 'LO QUE ESTABAS BUSCANDO',
    descripcion:
      'Imita una búsqueda real y conecta con la intención exacta del cliente. Tu producto aparece como «la respuesta». Se siente nativo, no parece anuncio.',
  },
  {
    id: 'resena-real',
    agentLabel: 'reseña real',
    nombre: 'Reseña real',
    tagline: 'PRUEBA SOCIAL AUTÉNTICA',
    descripcion:
      'Reseña estilo UGC: una persona común y real con el producto, no un modelo de stock. Se siente auténtico, y eso es justo lo que hace que la gente confíe y compre.',
    badge: 'Beta',
  },
  {
    id: 'estadistica',
    agentLabel: 'estadística',
    nombre: 'Estadística',
    tagline: 'UN DATO QUE FRENA EL SCROLL',
    descripcion:
      'Un número gigante detiene el dedo y da credibilidad inmediata. Ideal para mostrar un resultado concreto: «92% notó la diferencia». Concreto vende más que adjetivos.',
  },
  {
    id: 'antes-y-despues',
    agentLabel: 'antes y después',
    nombre: 'Antes y Después',
    tagline: 'EL CAMBIO, A LA VISTA',
    descripcion:
      'El contraste visible es de los formatos que más convierten: muestra el resultado y el producto como la causa. (Ojo: revisa las Normas de Meta para tu rubro antes de publicarlo.)',
  },
  {
    id: 'como-funciona',
    agentLabel: 'cómo funciona',
    nombre: 'Cómo funciona',
    tagline: 'FÁCIL EN 3 PASOS',
    descripcion:
      'Bajar la fricción percibida sube la conversión. Tres pasos simples (1-2-3) muestran lo fácil que es usarlo y empujan al «probar». Perfecto para producto nuevo o desconocido.',
  },
  {
    id: 'nosotros-vs-ellos',
    agentLabel: 'nosotros vs ellos',
    nombre: 'Nosotros vs Ellos',
    tagline: 'TÚ GANAS, ELLOS NO',
    descripcion:
      'Posiciona tu producto contra «lo de siempre» en columnas claras: tú con todo ✓, ellos con todo ✗. El contraste hace la elección obvia, sin nombrar a nadie.',
  },
  {
    id: 'tabla-comparativa',
    agentLabel: 'tabla comparativa',
    nombre: 'Tabla comparativa',
    tagline: 'COMPARA Y DECIDE',
    descripcion:
      'Una tabla escaneable de características: tú vs otros. La gente decide más rápido cuando ve los porqués ordenados; un clásico de e-commerce que convierte.',
  },
  {
    id: 'producto-anotado',
    agentLabel: 'producto anotado',
    nombre: 'Producto anotado',
    tagline: 'SPECS DE UN VISTAZO',
    descripcion:
      'El producto al centro con etiquetas que apuntan a cada beneficio. Comunica TODO lo que tiene en un segundo, sobre el producto real. De los que más convierten cuando hay varias features que mostrar.',
    badge: 'Recomendado',
  },
  {
    id: 'ritual-en-accion',
    agentLabel: 'ritual en acción',
    nombre: 'Ritual en acción',
    tagline: 'EL PRODUCTO EN USO',
    descripcion:
      'Muestra el producto en su momento de uso, en una escena lifestyle limpia y premium. El cliente se ve usándolo: baja la fricción y sube el deseo. Ideal para crear hábito.',
  },
  {
    id: 'titular-de-resultado',
    agentLabel: 'titular de resultado',
    nombre: 'Titular de resultado',
    tagline: 'ADIÓS AL PROBLEMA',
    descripcion:
      'Lidera con la transformación («Adiós, X» / «Por fin, Y») y la respalda con chips de prueba. El cliente compra el resultado, no las specs: el formato que mejor conecta con el deseo.',
    badge: 'Recomendado',
  },
  {
    id: 'resena-titular',
    agentLabel: 'reseña titular',
    nombre: 'Reseña titular',
    tagline: 'LA CITA ES EL HÉROE',
    descripcion:
      'La reseña de un cliente como titular gigante, editorial y elegante (no sticker). La prueba social puesta al frente con clase: confianza instantánea sin verse como anuncio.',
    badge: 'Recomendado',
  },
  {
    id: 'ultima-hora',
    agentLabel: 'última hora',
    nombre: 'Última hora',
    tagline: 'PATTERN INTERRUPT',
    descripcion:
      'Estilo nota de prensa creíble: rompe el patrón del feed porque parece noticia, no publicidad. Da urgencia y autoridad al lanzamiento o a un dato fuerte del producto.',
  },
];

export type GraphicFormatId = (typeof GRAPHIC_FORMATS)[number]['id'];

export const DEFAULT_GRAPHIC_FORMAT_ID: GraphicFormatId = 'beneficios';

const LEGACY_TYPE_LABELS: Record<string, string> = {
  producto: 'Producto',
  lifestyle: 'Lifestyle',
  testimonio: 'Testimonio',
  'antes-despues': 'Antes/Después',
  detalle: 'Detalle',
  promo: 'Promo',
  ugc: 'UGC',
};

export function getGraphicFormatById(id: string): GraphicFormat | undefined {
  return GRAPHIC_FORMATS.find(f => f.id === id);
}

export function getGraphicFormatAgentLabel(id: string): string {
  return getGraphicFormatById(id)?.agentLabel ?? id;
}

export function getGraphicFormatDisplayName(id: string): string {
  const format = getGraphicFormatById(id);
  if (format) return format.nombre;
  return LEGACY_TYPE_LABELS[id] ?? id;
}

export function isValidGraphicFormatId(id: string): boolean {
  return GRAPHIC_FORMATS.some(f => f.id === id);
}
