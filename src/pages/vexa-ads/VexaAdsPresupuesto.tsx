// ============================================
// VEXA Ads - PRESUPUESTO (Control sin miedo)
// ============================================
// El usuario quiere poner límites, no optimizar
// Controles simples + toggle de optimización automática
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const budgetConfig = {
  daily: { min: 20, max: 500, current: 150 },
  weekly: 1050,
  monthly: 4500,
  avgRoas: 3.2,
};

const distribution = [
  { name: 'Campaña Principal', percentage: 45, amount: 67.5 },
  { name: 'Remarketing', percentage: 30, amount: 45 },
  { name: 'Test Video', percentage: 15, amount: 22.5 },
  { name: 'Lookalike', percentage: 10, amount: 15 },
];

const history = [
  { date: 'Hoy, 14:30', action: 'Incremento automático', from: 140, to: 150, reason: 'ROAS estable > 3x' },
  { date: 'Ayer, 09:15', action: 'Reducción manual', from: 160, to: 140, reason: 'Ajuste de usuario' },
  { date: '18 Ene', action: 'Incremento automático', from: 120, to: 160, reason: 'CTR alto en nuevo creativo' },
];

export default function VexaAdsPresupuesto() {
  const [dailyBudget, setDailyBudget] = useState(budgetConfig.daily.current);
  const [autoOptimize, setAutoOptimize] = useState(true);

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Presupuesto
        </h1>
        <p className="text-white/50 text-sm">
          Controla cuánto gastas, sin sorpresas
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal - Control de presupuesto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de presupuesto diario */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">Presupuesto Diario</h2>
                <p className="text-xs text-white/40">Ajusta tu límite de gasto por día</p>
              </div>
            </div>

            {/* Slider de presupuesto */}
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold text-white">${dailyBudget}</div>
                  <div className="text-sm text-white/40">por día</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium text-white/70">${dailyBudget * 7}</div>
                  <div className="text-xs text-white/40">semanal estimado</div>
                </div>
              </div>

              <input
                type="range"
                min={budgetConfig.daily.min}
                max={budgetConfig.daily.max}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-violet-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-violet-500/50"
              />

              <div className="flex justify-between text-xs text-white/30">
                <span>${budgetConfig.daily.min} mín</span>
                <span>${budgetConfig.daily.max} máx</span>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center p-4 rounded-lg bg-white/5">
                <div className="text-xl font-semibold text-white">${dailyBudget * 30}</div>
                <div className="text-xs text-white/40 flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Mensual estimado
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5">
                <div className="text-xl font-semibold text-emerald-400">{budgetConfig.avgRoas}x</div>
                <div className="text-xs text-white/40 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  ROAS promedio
                </div>
              </div>
            </div>
          </div>

          {/* Toggle de optimización automática */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Optimización Automática</h3>
                  <p className="text-sm text-white/50 mt-1">
                    Permite a la IA ajustar el presupuesto dentro de tus límites para maximizar resultados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutoOptimize(!autoOptimize)}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-colors",
                  autoOptimize ? "bg-violet-500" : "bg-white/20"
                )}
              >
                <div className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                  autoOptimize ? "left-8" : "left-1"
                )} />
              </button>
            </div>
            {autoOptimize && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400">
                  ✓ La IA está optimizando tu presupuesto dentro de tus límites establecidos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral - Distribución e historial */}
        <div className="space-y-6">
          {/* Distribución actual */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-white font-medium mb-4">Distribución Actual</h3>
            <div className="space-y-4">
              {distribution.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{item.name}</span>
                    <span className="text-white">${item.amount}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de cambios */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-white/50" />
              <h3 className="text-white font-medium">Historial</h3>
            </div>
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={index} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/40">{item.date}</span>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-white/50">${item.from}</span>
                      {item.to > item.from ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-amber-400" />
                      )}
                      <span className="text-white">${item.to}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/50">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-10 text-center">
        <span className="text-xs text-white/30">
          ✨ Los cambios no se guardan (demostración)
        </span>
      </div>
    </VexaAdsLayout>
  );
}
