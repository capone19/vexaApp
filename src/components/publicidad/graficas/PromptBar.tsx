import { useCallback, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PromptBar({ prompt, onPromptChange, onGenerate, isGenerating }: PromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [prompt, autoResize]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && prompt.trim()) onGenerate();
    }
  }, [isGenerating, prompt, onGenerate]);

  return (
    <div className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-primary/10 px-4 py-3">
      <div className="flex items-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-primary hover:text-primary hover:bg-primary/10 gap-1.5 mb-0.5"
          disabled={isGenerating}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs">Mejorar prompt</span>
        </Button>

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          placeholder="Describe la gráfica... ej: producto sobre fondo beige con luz natural, estilo editorial"
          rows={1}
          className="flex-1 resize-none bg-secondary/50 border border-primary/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all scrollbar-thin"
        />

        <div className="shrink-0 flex flex-col items-center gap-1 mb-0.5">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-primary hover:bg-primary/90 text-white border-0 gap-2 px-5 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Generar
          </Button>
          <span className="text-[10px] text-muted-foreground">≈ 2 créditos</span>
        </div>
      </div>
    </div>
  );
}
