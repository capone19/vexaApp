import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TabResumen } from './TabResumen';
import { TabHallazgos } from './TabHallazgos';
import { TabExperimentos } from './TabExperimentos';
import { TabConversaciones } from './TabConversaciones';
import { TabReportes } from './TabReportes';

const TABS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'hallazgos', label: 'Hallazgos' },
  { value: 'experimentos', label: 'Experimentos' },
  { value: 'conversaciones', label: 'Conversaciones' },
  { value: 'reportes', label: 'Reportes' },
] as const;

export type AnalisisTab = (typeof TABS)[number]['value'];

export function AnalisisSection() {
  const [tab, setTab] = useState<AnalisisTab>('resumen');

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as AnalisisTab)}
      className="space-y-4"
    >
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 bg-muted p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="shrink-0 px-3 py-2 text-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>

      <TabsContent value="resumen" className="mt-0 focus-visible:outline-none">
        <TabResumen onIrAExperimentos={() => setTab('experimentos')} />
      </TabsContent>
      <TabsContent value="hallazgos" className="mt-0 focus-visible:outline-none">
        <TabHallazgos />
      </TabsContent>
      <TabsContent value="experimentos" className="mt-0 focus-visible:outline-none">
        <TabExperimentos />
      </TabsContent>
      <TabsContent value="conversaciones" className="mt-0 focus-visible:outline-none">
        <TabConversaciones />
      </TabsContent>
      <TabsContent value="reportes" className="mt-0 focus-visible:outline-none">
        <TabReportes />
      </TabsContent>
    </Tabs>
  );
}
