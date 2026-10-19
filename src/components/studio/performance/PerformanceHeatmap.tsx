import { Fragment } from "react";
import { hourLabel, WEEKDAY_SHORT, type Heatmap } from "@/lib/studio/performance";
import { cn } from "@/lib/utils";

/** Lunes primero, como en el calendario chileno */
const ROWS = [1, 2, 3, 4, 5, 6, 0];

/** Mapa de calor día × hora: cuánto se ve el canal en cada momento de la semana */
export function PerformanceHeatmap({ map, highlight }: { map: Heatmap; highlight?: { weekday: number | null; hour: number } }) {
  const fmt = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(n);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="grid min-w-[620px] grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[3px] text-[10px]">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-muted-foreground">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
        {ROWS.map((d) => (
          <Fragment key={d}>
            <span className="flex items-center text-muted-foreground">{WEEKDAY_SHORT[d]}</span>
            {map.cells[d].map((v, h) => {
              const level = map.max > 0 ? v / map.max : 0;
              const isPick = highlight && highlight.hour === h && (highlight.weekday === null || highlight.weekday === d);
              return (
                <span
                  key={h}
                  title={`${WEEKDAY_SHORT[d]} ${hourLabel(h)} · ${fmt(v)}% de las vistas del día`}
                  className={cn("aspect-square rounded-[3px]", isPick && "ring-2 ring-amber-400 ring-offset-1 ring-offset-background")}
                  style={{ background: level > 0 ? `hsl(var(--primary) / ${0.12 + level * 0.88})` : "hsl(var(--secondary))" }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        menos
        {[0.15, 0.35, 0.6, 0.8, 1].map((l) => (
          <span key={l} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `hsl(var(--primary) / ${l})` }} />
        ))}
        más vistas
      </div>
    </div>
  );
}
