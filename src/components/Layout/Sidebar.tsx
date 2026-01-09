
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Compass, Video, Settings, LogOut, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from '@/components/Notifications/NotificationCenter';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Compass, label: 'Estratégia', href: '/strategy' },
  { icon: Video, label: 'Produção', href: '/production' },
  { icon: Settings, label: 'Operações', href: '/operations' },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight">AutoDark</span>
        </Link>
        <NotificationCenter />
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 mb-1',
                  isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );
}

