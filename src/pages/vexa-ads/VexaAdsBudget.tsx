// ============================================
// VEXA Ads - Presupuesto & Optimización (Demo)
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Settings,
  History,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Datos mock
const mockBudgetConfig = {
  daily: { min: 30, max: 100, current: 65 },
  weekly: { min: 200, max: 700, current: 455 },
  monthly: { min: 800, max: 3000, current: 1950 },
};

const mockHistory = [
  { date: '19 Ene 2026', action: 'Aumento automático', from: 55, to: 65, reason: 'ROAS estable > 3.0', status: 'success' },
  { date: '17 Ene 2026', action: 'Reducción automática', from: 70, to: 55, reason: 'CTR bajo en Campaña 3', status: 'warning' },
  { date: '15 Ene 2026', action: 'Aumento automático', from: 50, to: 70, reason: 'Alto volumen de leads', status: 'success' },
  { date: '12 Ene 2026', action: 'Configuración inicial', from: 0, to: 50, reason: 'Setup inicial', status: 'info' },
];

const mockDistribution = [
  { name: 'Campaña Principal', percentage: 45, amount: 29.25 },
  { name: 'Retargeting', percentage: 30, amount: 19.50 },
  { name: 'Lookalike Test', percentage: 15, amount: 9.75 },
  { name: 'Reserva', percentage: 10, amount: 6.50 },
];

export default function VexaAdsBudget() {
  const [dailyBudget, setDailyBudget] = useState(mockBudgetConfig.daily.current);
  const [autoOptimize, setAutoOptimize] = useState(true);

  return (
    <VexaAdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Presupuesto & Optimización</h1>
          <p className="text-white/50 mt-1">Configura rangos y deja que la IA optimice dentro de ellos</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Budget Slider */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20">
                    <DollarSign className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Presupuesto Diario</h2>
                    <p className="text-xs text-white/40">Rango permitido para optimización automática</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">${dailyBudget}</p>
                  <p className="text-xs text-white/40">por día</p>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="range"
                    min={mockBudgetConfig.daily.min}
                    max={mockBudgetConfig.daily.max}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-gradient-to-r
                      [&::-webkit-slider-thumb]:from-violet-500
                      [&::-webkit-slider-thumb]:to-purple-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-violet-500/25"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Mín: ${mockBudgetConfig.daily.min}</span>
                  <span>Máx: ${mockBudgetConfig.daily.max}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-xs text-white/40">Semanal estimado</p>
                  <p className="text-lg font-semibold text-white">${dailyBudget * 7}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Mensual estimado</p>
                  <p className="text-lg font-semibold text-white">${dailyBudget * 30}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">ROAS promedio</p>
                  <p className="text-lg font-semibold text-green-400">3.2x</p>
                </div>
              </div>
            </div>

            {/* Auto Optimization Toggle */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20">
                    <Zap className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Optimización Automática</h2>
                    <p className="text-sm text-white/50">
                      La IA ajustará el presupuesto dentro de los rangos definidos según el rendimiento
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoOptimize(!autoOptimize)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    autoOptimize ? 'bg-violet-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                    autoOptimize ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {autoOptimize && (
                <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 text-sm text-violet-300">
                    <CheckCircle className="h-4 w-4" />
                    Optimización activa: ajustando presupuesto cada 6 horas según métricas
                  </div>
                </div>
              )}
            </div>

            {/* Distribution */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Distribución Actual</h2>
              <div className="space-y-4">
                {mockDistribution.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/70">{item.name}</span>
                      <span className="text-white">${item.amount.toFixed(2)} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-white/5">
                <History className="h-5 w-5 text-white/60" />
              </div>
              <h2 className="text-lg font-semibold text-white">Historial de Cambios</h2>
            </div>

            <div className="space-y-4">
              {mockHistory.map((entry, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">{entry.date}</span>
                    <span className={`flex items-center gap-1 text-xs ${
                      entry.status === 'success' ? 'text-green-400' :
                      entry.status === 'warning' ? 'text-amber-400' : 'text-white/40'
                    }`}>
                      {entry.from < entry.to ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : entry.from > entry.to ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      ${entry.from} → ${entry.to}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{entry.action}</p>
                  <p className="text-xs text-white/50 mt-1">{entry.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-sm text-violet-300">
            ✨ Los controles son demostrativos. En producción, los cambios se sincronizan con Meta Ads.
          </p>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

