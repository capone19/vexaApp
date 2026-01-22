// ============================================
// VEXA Ads - CONFIGURACIÓN (Mínima)
// ============================================
// Solo lo esencial, nada técnico
// ============================================

import { useState } from 'react';
import { VexaAdsLayout } from './components/VexaAdsLayout';
import { 
  Settings, 
  Palette,
  Bell,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VexaAdsConfiguracion() {
  const [notifications, setNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [safeMode, setSafeMode] = useState(false);

  return (
    <VexaAdsLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Configuración
        </h1>
        <p className="text-white/50 text-sm">
          Preferencias de tu cuenta VEXA Ads
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Notificaciones */}
        <SettingSection
          icon={Bell}
          title="Notificaciones"
          description="Recibe alertas sobre el rendimiento de tus campañas"
        >
          <div className="space-y-4">
            <SettingToggle
              label="Notificaciones push"
              description="Alertas en tiempo real sobre cambios importantes"
              checked={notifications}
              onChange={setNotifications}
            />
            <SettingToggle
              label="Reporte semanal"
              description="Resumen de rendimiento cada lunes por email"
              checked={weeklyReport}
              onChange={setWeeklyReport}
            />
          </div>
        </SettingSection>

        {/* Modo seguro */}
        <SettingSection
          icon={Shield}
          title="Modo Seguro"
          description="Controla las acciones automáticas de la IA"
        >
          <SettingToggle
            label="Modo seguro activado"
            description="La IA pedirá confirmación antes de realizar cambios importantes"
            checked={safeMode}
            onChange={setSafeMode}
          />
        </SettingSection>

        {/* Apariencia */}
        <SettingSection
          icon={Palette}
          title="Apariencia"
          description="Personaliza la interfaz"
        >
          <div className="flex gap-3">
            <button className="flex-1 p-4 rounded-xl bg-[#09090b] border-2 border-violet-500 text-center">
              <div className="h-8 w-8 mx-auto mb-2 rounded bg-white/10" />
              <span className="text-sm text-white">Oscuro</span>
            </button>
            <button className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-center opacity-50 cursor-not-allowed">
              <div className="h-8 w-8 mx-auto mb-2 rounded bg-white/20" />
              <span className="text-sm text-white/50">Claro</span>
              <span className="text-xs text-white/30 block">Próximamente</span>
            </button>
          </div>
        </SettingSection>

        {/* Ayuda */}
        <SettingSection
          icon={HelpCircle}
          title="Ayuda"
          description="Recursos y soporte"
        >
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors">
              <span className="text-sm text-white">Guía de inicio</span>
              <p className="text-xs text-white/40 mt-1">Aprende a usar VEXA Ads</p>
            </button>
            <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors">
              <span className="text-sm text-white">Contactar soporte</span>
              <p className="text-xs text-white/40 mt-1">Estamos para ayudarte</p>
            </button>
          </div>
        </SettingSection>

        {/* Demo badge */}
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 text-center">
          <span className="text-violet-300 text-sm">
            ✨ Modo Demo activo — Los cambios no se guardan
          </span>
        </div>
      </div>
    </VexaAdsLayout>
  );
}

// Componente de sección de configuración
function SettingSection({ 
  icon: Icon, 
  title, 
  description, 
  children 
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-white font-medium">{title}</h2>
          <p className="text-xs text-white/40">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// Componente de toggle
function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <span className="text-sm text-white">{label}</span>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors shrink-0",
          checked ? "bg-violet-500" : "bg-white/20"
        )}
      >
        <div className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  );
}
