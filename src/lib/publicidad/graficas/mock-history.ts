import type { Generation } from './types';

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
      referenceImagePreview: null,
      format: '1:1',
      styles: ['Minimalista'],
      variations: imageCount,
      advanced: { model: 'Flux', guidance: 7 },
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
  makeGen(1, 'ALIVIA+', 'producto', 'Crema facial sobre mármol blanco con luz natural suave, fondo beige minimalista', today, 3),
  makeGen(2, 'NOMAD', 'lifestyle', 'Persona caminando en montaña con mochila NÖMAD, atardecer dorado, estilo cinematográfico', today, 2),
  makeGen(3, 'WELL-V', 'promo', 'Banner promocional 2x1 en tratamientos faciales, colores pastel, tipografía elegante', today, 4),
  makeGen(4, 'ALIVIA+', 'detalle', 'Close-up de textura de crema con gotas de agua, fondo gradiente violeta', yesterday, 2),
  makeGen(5, 'NOMAD', 'testimonio', 'Foto de cliente satisfecho con producto NÖMAD, estilo editorial con quote overlay', yesterday, 1),
  makeGen(6, 'WELL-V', 'producto', 'Sérum en frasco de vidrio con reflejos, fondo oscuro premium, luz de estudio', yesterday, 3),
  makeGen(7, 'ALIVIA+', 'antes-despues', 'Comparación antes/después de tratamiento facial, split view, fondo clínico limpio', threeDaysAgo, 2),
  makeGen(8, 'NOMAD', 'promo', 'Story de Instagram con oferta de temporada, estilo outdoor, colores tierra', threeDaysAgo, 2),
  makeGen(9, 'WELL-V', 'lifestyle', 'Mujer aplicando sérum frente a espejo, luz natural de ventana, estilo editorial', fiveDaysAgo, 3),
  makeGen(10, 'ALIVIA+', 'producto', 'Set completo de skincare sobre mesa de madera, vista cenital, sombras suaves', fiveDaysAgo, 2),
];
