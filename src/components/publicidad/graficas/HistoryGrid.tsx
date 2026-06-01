import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Generation, Brand } from '@/lib/publicidad/graficas/types';
import { BRANDS } from '@/lib/publicidad/graficas/types';

interface HistoryGridProps {
  generations: Generation[];
  onImageClick: (gen: Generation, index: number) => void;
}

type FilterValue = 'Todas' | Brand;

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays <= 7) return 'Esta semana';
  return 'Anteriores';
}

export function HistoryGrid({ generations, onImageClick }: HistoryGridProps) {
  const [filter, setFilter] = useState<FilterValue>('Todas');

  const completed = useMemo(() =>
    generations.filter(g =>
      g.status === 'completed' &&
      (filter === 'Todas' || g.config.brand === filter)
    ),
    [generations, filter]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Generation[]> = {};
    for (const gen of completed) {
      const key = getDateGroup(gen.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(gen);
    }
    return groups;
  }, [completed]);

  const groupOrder = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];

  return (
    <div className="space-y-4">
      {/* Header + Filtros */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Historial</h3>
        <div className="flex gap-1.5">
          {(['Todas', ...BRANDS] as FilterValue[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all',
                filter === f
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  : 'bg-secondary border-transparent text-muted-foreground hover:bg-violet-500/10'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grupos */}
      {completed.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Sin generaciones aún</p>
      ) : (
        groupOrder.map(groupName => {
          const items = grouped[groupName];
          if (!items?.length) return null;
          return (
            <div key={groupName} className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {groupName}
              </p>
              <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
                {items.flatMap(gen =>
                  gen.resultUrls.map((url, i) => (
                    <button
                      key={`${gen.id}-${i}`}
                      onClick={() => onImageClick(gen, i)}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-violet-500/10 hover:border-violet-500/30 transition-all"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <span className="text-[9px] text-white/80 line-clamp-2 leading-tight">
                          {gen.finalPrompt}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
