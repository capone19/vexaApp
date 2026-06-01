import { useState, useCallback } from 'react';
import type { GenerationConfig, Generation } from './types';
import { DEFAULT_CONFIG } from './types';
import { MOCK_HISTORY } from './mock-history';

export function useGenerationStore() {
  const [config, setConfig] = useState<GenerationConfig>({ ...DEFAULT_CONFIG });
  const [generations, setGenerations] = useState<Generation[]>(MOCK_HISTORY);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);

  const updateConfig = useCallback(<K extends keyof GenerationConfig>(
    key: K,
    value: GenerationConfig[K],
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(() => {
    if (!config.prompt.trim()) return;

    const id = `gen-${Date.now()}`;
    const { referenceImage, ...configWithoutFile } = config;

    const newGen: Generation = {
      id,
      config: configWithoutFile,
      finalPrompt: config.prompt,
      status: 'pending',
      resultUrls: [],
      createdAt: new Date().toISOString(),
    };

    setCurrentGeneration(newGen);
    setGenerations(prev => [newGen, ...prev]);

    // TODO: reemplazar por POST al webhook de n8n
    setTimeout(() => {
      const completed: Generation = {
        ...newGen,
        status: 'completed',
        resultUrls: Array.from({ length: config.variations }, (_, i) =>
          `https://picsum.photos/512/512?random=${Date.now() + i}`
        ),
      };
      setCurrentGeneration(completed);
      setGenerations(prev => prev.map(g => g.id === id ? completed : g));
    }, 2000);
  }, [config]);

  return {
    config,
    updateConfig,
    generations,
    currentGeneration,
    handleGenerate,
  };
}
