import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { GenerationConfig, Generation } from './types';
import { DEFAULT_CONFIG } from './types';
import {
  generateAdImage,
  validateGenerationConfig,
  getGenerateErrorMessage,
} from './generate-image';

export function useGenerationStore() {
  const [config, setConfig] = useState<GenerationConfig>({ ...DEFAULT_CONFIG });
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);

  const updateConfig = useCallback(<K extends keyof GenerationConfig>(
    key: K,
    value: GenerationConfig[K],
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async (brandNames: string[]) => {
    const validation = validateGenerationConfig(config, brandNames);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    const id = `gen-${Date.now()}`;
    const { referenceImage, ...configWithoutFile } = config;

    const pendingGen: Generation = {
      id,
      config: configWithoutFile,
      finalPrompt: config.prompt.trim(),
      status: 'pending',
      resultUrls: [],
      createdAt: new Date().toISOString(),
    };

    setCurrentGeneration(pendingGen);

    try {
      const result = await generateAdImage(config, brandNames);

      const completed: Generation = {
        ...pendingGen,
        status: 'completed',
        resultUrls: result.resultUrls,
        promptUsed: result.promptUsed,
        requestId: result.requestId,
        finalPrompt: result.promptUsed,
      };

      setCurrentGeneration(completed);
      setGenerations(prev => [completed, ...prev]);

      const count = result.resultUrls.length;
      toast.success(
        count === 1 ? '✓ Gráfica generada' : `✓ ${count} gráficas generadas`,
      );
    } catch (err) {
      const message = getGenerateErrorMessage(err);
      const failed: Generation = {
        ...pendingGen,
        status: 'failed',
        errorMessage: message,
      };

      setCurrentGeneration(failed);
      toast.error(message);
    }
  }, [config]);

  const isGenerating = currentGeneration?.status === 'pending';

  return {
    config,
    updateConfig,
    generations,
    currentGeneration,
    handleGenerate,
    isGenerating,
  };
}
