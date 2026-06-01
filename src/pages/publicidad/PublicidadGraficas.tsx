import { useState, useCallback } from 'react';
import { useGenerationStore } from '@/lib/publicidad/graficas/store';
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
  } = useGenerationStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalGen, setModalGen] = useState<Generation | null>(null);
  const [modalIndex, setModalIndex] = useState(0);

  const openModal = useCallback((gen: Generation, index: number) => {
    setModalGen(gen);
    setModalIndex(index);
    setModalOpen(true);
  }, []);

  const handleUseAsReference = useCallback((url: string) => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], 'reference.jpg', { type: blob.type });
        updateConfig('referenceImage', file);
        updateConfig('referenceImagePreview', url);
      })
      .catch(() => {
        updateConfig('referenceImagePreview', url);
      });
  }, [updateConfig]);

  return (
    <div className="flex h-full -m-6 md:-m-8">
      {/* Panel izquierdo */}
      <GenerationControls config={config} onUpdate={updateConfig} />

      {/* Centro */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Canvas de generación */}
          <GenerationCanvas
            currentGeneration={currentGeneration}
            onImageClick={openModal}
            onUseAsReference={handleUseAsReference}
          />

          {/* Separador */}
          <div className="border-t border-border" />

          {/* Historial */}
          <HistoryGrid
            generations={generations}
            onImageClick={openModal}
          />
        </div>

        {/* Prompt Bar sticky */}
        <PromptBar
          prompt={config.prompt}
          onPromptChange={v => updateConfig('prompt', v)}
          onGenerate={handleGenerate}
          isGenerating={currentGeneration?.status === 'pending'}
        />
      </div>

      {/* Modal */}
      <ImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        generation={modalGen}
        imageIndex={modalIndex}
      />
    </div>
  );
}
