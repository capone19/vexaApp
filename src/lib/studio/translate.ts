// ============================================
// VEXA Content Studio - Traducir al español para entender lo que propone la IA
// ============================================
// 1) Traductor incorporado de Chrome (Translator API, Chrome 138+ de escritorio): gratis y en el propio PC.
// 2) Respaldo: ruta de traducción del flujo de n8n (fracción de centavo por texto).

import { translateWithAi } from "./ai";

interface ChromeTranslator {
  translate(text: string): Promise<string>;
}
interface ChromeTranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<ChromeTranslator>;
}
interface ChromeLanguageDetector {
  detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>;
}
interface ChromeLanguageDetectorStatic {
  create(): Promise<ChromeLanguageDetector>;
}

export type TranslationSource = "navegador" | "ia" | "original";

export interface Translation {
  text: string;
  source: TranslationSource;
}

const cache = new Map<string, Translation>();
const translators = new Map<string, Promise<ChromeTranslator>>();
let detector: Promise<ChromeLanguageDetector> | null = null;

const browserApis = () =>
  globalThis as unknown as { Translator?: ChromeTranslatorStatic; LanguageDetector?: ChromeLanguageDetectorStatic };

async function detectLanguage(text: string): Promise<string | null> {
  const { LanguageDetector } = browserApis();
  if (!LanguageDetector) return null;
  detector ??= LanguageDetector.create();
  const [best] = await (await detector).detect(text);
  return best && best.confidence > 0.5 ? best.detectedLanguage.split("-")[0] : null;
}

async function translateInBrowser(text: string, sourceLanguage: string): Promise<string | null> {
  const { Translator } = browserApis();
  if (!Translator) return null;
  const options = { sourceLanguage, targetLanguage: "es" };
  if ((await Translator.availability(options)) === "unavailable") return null;
  // La primera vez Chrome descarga el modelo del idioma; después funciona sin internet
  let translator = translators.get(sourceLanguage);
  if (!translator) {
    translator = Translator.create(options);
    translators.set(sourceLanguage, translator);
    translator.catch(() => translators.delete(sourceLanguage));
  }
  const ready = await translator;
  // Línea por línea para respetar capítulos, saltos y hashtags
  const lines = await Promise.all(text.split("\n").map((line) => (line.trim() ? ready.translate(line) : line)));
  return lines.join("\n");
}

/** Traduce al español. `language` es el idioma del texto si se conoce (si no, se detecta). */
export async function translateToSpanish(text: string, language?: string): Promise<Translation> {
  const key = `${language ?? "?"}:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let result: Translation | null = null;
  try {
    const source = language ?? (await detectLanguage(text));
    if (source === "es") result = { text, source: "original" };
    else if (source) {
      const translated = await translateInBrowser(text, source);
      if (translated !== null) result = { text: translated, source: "navegador" };
    }
  } catch {
    // Sin traductor del navegador (u otro navegador): sigue el respaldo con IA
  }
  if (!result) {
    const [translated] = await translateWithAi([text]);
    result = { text: translated, source: translated.trim() === text.trim() ? "original" : "ia" };
  }
  cache.set(key, result);
  return result;
}
