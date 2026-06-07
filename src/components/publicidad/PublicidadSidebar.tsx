import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import {
  Image,
  Target,
  Settings,
  ArrowLeft,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: 'Gráficas', href: '/publicidad/graficas', icon: Image },
  { title: 'Identidad de Marca', href: '/publicidad/identidad-de-marca', icon: Palette },
  { title: 'Campañas', href: '/publicidad/campanas', icon: Target },
  { title: 'Ajustes', href: '/publicidad/ajustes', icon: Settings },
];

export function PublicidadSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo + badge */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <Logo variant="full" color="light" className="h-7" />
        <span className="rounded bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          Ads
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Volver */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
    </aside>
  );
}
