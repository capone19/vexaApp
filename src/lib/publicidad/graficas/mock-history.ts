import type { Generation } from './types';
import { DEFAULT_VISUAL_COMPONENT } from './types';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
const fiveDaysAgo = new Date(today);
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

function makeGen(
  id: number,
  brand: Generation['config']['brand'],
  type: Generation['config']['type'],
  prompt: string,
  date: Date,
  imageCount: number = 2,
): Generation {
  return {
    id: `mock-${id}`,
    config: {
      brand,
      type,
      objetivo: 'venta',
      referenceImagePreview: null,
      useProductColors: false,
      carouselMode: false,
      carouselType: 'Educativo',
      format: '1:1',
      styles: ['Minimalista'],
      componenteVisual: DEFAULT_VISUAL_COMPONENT,
      variations: imageCount,
      advanced: { model: 'flux', guidance: 7, ctaDestino: 'web' },
      prompt,
    },
    finalPrompt: prompt,
    status: 'completed',
    resultUrls: Array.from({ length: imageCount }, (_, i) =>
      `https://picsum.photos/512/512?random=${id * 10 + i}`
    ),
    createdAt: date.toISOString(),
  };
}

export const MOCK_HISTORY: Generation[] = [
  makeGen(1, 'ALIVIA+', 'producto-anotado', 'Crema facial sobre mármol blanco con luz natural suave, fondo beige minimalista', today, 3),
  makeGen(2, 'NOMAD', 'ritual-en-accion', 'Persona caminando en montaña con mochila NÖMAD, atardecer dorado, estilo cinematográfico', today, 2),
  makeGen(3, 'WELL-V', 'ultima-hora', 'Banner promocional 2x1 en tratamientos faciales, colores pastel, tipografía elegante', today, 4),
  makeGen(4, 'ALIVIA+', 'estadistica', 'Close-up de textura de crema con gotas de agua, fondo gradiente violeta', yesterday, 2),
  makeGen(5, 'NOMAD', 'resena-titular', 'Foto de cliente satisfecho con producto NÖMAD, estilo editorial con quote overlay', yesterday, 1),
  makeGen(6, 'WELL-V', 'beneficios', 'Sérum en frasco de vidrio con reflejos, fondo oscuro premium, luz de estudio', yesterday, 3),
  makeGen(7, 'ALIVIA+', 'antes-y-despues', 'Comparación antes/después de tratamiento facial, split view, fondo clínico limpio', threeDaysAgo, 2),
  makeGen(8, 'NOMAD', 'versus', 'Story de Instagram con oferta de temporada, estilo outdoor, colores tierra', threeDaysAgo, 2),
  makeGen(9, 'WELL-V', 'titular-de-resultado', 'Mujer aplicando sérum frente a espejo, luz natural de ventana, estilo editorial', fiveDaysAgo, 3),
  makeGen(10, 'ALIVIA+', 'lineup', 'Set completo de skincare sobre mesa de madera, vista cenital, sombras suaves', fiveDaysAgo, 2),
];
