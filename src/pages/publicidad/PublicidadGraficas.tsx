import { useState, useCallback, useEffect } from 'react';
import { useGenerationStore } from '@/lib/publicidad/graficas/store';
import { useBrandIdentities } from '@/hooks/use-brand-identities';
import { useAdReferencesCleanup } from '@/hooks/use-ad-references-cleanup';
import { GenerationControls } from '@/components/publicidad/graficas/GenerationControls';
import { GenerationCanvas } from '@/components/publicidad/graficas/GenerationCanvas';
import { PromptBar } from '@/components/publicidad/graficas/PromptBar';
import { HistoryGrid } from '@/components/publicidad/graficas/HistoryGrid';
import { ImageModal } from '@/components/publicidad/graficas/ImageModal';
import type { Generation } from '@/lib/publicidad/graficas/types';

export default function PublicidadGraficas() {
  const {
    config,
    updateConfig,
    generations,
    currentGeneration,
    handleGenerate,
    isGenerating,
  } = useGenerationStore();

  const { brandNames, isLoading: brandsLoading } = useBrandIdentities();

  useAdReferencesCleanup({
    isGenerating,
    hasActiveReference: config.referenceImage !== null,
  });

  useEffect(() => {
    if (brandNames.length === 0) return;
    if (!config.brand || !brandNames.includes(config.brand)) {
      updateConfig('brand', brandNames[0]);
    }
  }, [brandNames, config.brand, updateConfig]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalGen, setModalGen] = useState<Generation | null>(null);
  const [modalIndex, setModalIndex] = useState(0);

  const openModal = useCallback((gen: Generation, index: number) => {
    setModalGen(gen);
    setModalIndex(index);
    setModalOpen(true);
  }, []);

  const onGenerate = useCallback(() => {
    handleGenerate(brandNames);
  }, [handleGenerate, brandNames]);

  return (
    <div className="flex h-full -m-6 md:-m-8">
      <GenerationControls
        config={config}
        brands={brandNames}
        brandsLoading={brandsLoading}
        disabled={isGenerating}
        onUpdate={updateConfig}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <GenerationCanvas
            currentGeneration={currentGeneration}
            onImageClick={openModal}
            onRetry={onGenerate}
          />

          <div className="border-t border-border" />

          <HistoryGrid
            generations={generations}
            brands={brandNames}
            onImageClick={openModal}
          />
        </div>

        <PromptBar
          prompt={config.prompt}
          onPromptChange={v => updateConfig('prompt', v)}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
        />
      </div>

      <ImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        generation={modalGen}
        imageIndex={modalIndex}
      />
    </div>
  );
}
