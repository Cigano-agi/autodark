import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MAIN_NAV_ITEMS, CHANNEL_NAV_ITEMS } from "@/constants/navigation";
import { ChevronLeft, Menu, X, LogOut, User, Zap, Terminal, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface PremiumSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function PremiumSidebar({ isOpen, onToggle }: PremiumSidebarProps) {
  const location = useLocation();
  const { id: channelId } = useParams();
  const { user, signOut } = useAuth();

  const isActive = (path: string, exact?: boolean) => {
    const processedPath = path.replace(":id", channelId || "");
    if (exact) {
      return location.pathname === processedPath;
    }
    return location.pathname.startsWith(processedPath);
  };

  const renderNavItems = (items: typeof MAIN_NAV_ITEMS) => {
    return items.map((item) => {
      const path = item.path.replace(":id", channelId || "");
      const active = isActive(item.path, item.exact);
      const Icon = item.icon;

      return (
        <Link
          key={item.path}
          to={path}
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
            active 
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.4)]" 
              : "text-white/40 hover:bg-white/5 hover:text-white border border-transparent"
          )}
        >
          <Icon className={cn(
            "w-5 h-5 transition-transform duration-300 group-hover:scale-110 shrink-0",
            active ? "text-white" : "opacity-50 group-hover:opacity-100"
          )} />
          <span className={cn(
            "text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300",
            !isOpen && "opacity-0 translate-x-[-10px] md:hidden"
          )}>
            {item.label}
          </span>
          {active && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
          )}
        </Link>
      );
    });
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/80 backdrop-blur-md z-40 transition-opacity duration-500 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onToggle}
      />

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-[100] bg-[#08080a] border-r border-white/5 transition-all duration-500 ease-in-out flex flex-col overflow-hidden shadow-[20px_0_100px_rgba(0,0,0,0.8)]",
          isOpen ? "w-72" : "w-0 lg:w-24"
        )}
      >
        {/* Header / Logo */}
        <div className="h-24 flex items-center px-7 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.3)] shrink-0 border border-white/10 relative group-hover:scale-105 transition-transform">
              <span className="text-2xl font-black text-white italic tracking-tighter">A</span>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className={cn(
              "flex flex-col transition-all duration-300",
              !isOpen && "opacity-0 translate-x-[-10px] md:hidden"
            )}>
              <span className="text-xl font-black text-white tracking-tighter leading-none italic">AUTODARK</span>
              <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mt-1.5 opacity-80">Plataforma de Criação</span>
            </div>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-4 py-10 space-y-12 overflow-y-auto custom-scrollbar">
          {/* Main Section */}
          <div className="space-y-3">
            <p className={cn(
              "px-4 text-[9px] uppercase tracking-[0.3em] font-black text-white/10 mb-5 transition-opacity",
              !isOpen && "opacity-0 md:hidden"
            )}>
              Navegação
            </p>
            <div className="space-y-2">
              {renderNavItems(MAIN_NAV_ITEMS)}
            </div>
          </div>

          {/* Channel Specific Section */}
          {channelId && (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="px-4 flex items-center justify-between mb-5">
                <p className={cn(
                  "text-[9px] uppercase tracking-[0.3em] font-black text-primary/40 transition-opacity",
                  !isOpen && "opacity-0 md:hidden"
                )}>
                  Configurações do Canal
                </p>
                {isOpen && <Terminal className="w-3 h-3 text-primary/20" />}
              </div>
              <div className="space-y-2">
                {renderNavItems(CHANNEL_NAV_ITEMS)}
              </div>
            </div>
          )}
        </div>

        {/* Footer / User Profile */}
        <div className="p-6 border-t border-white/5 bg-black/60">
          {user && (
            <div className={cn(
              "flex items-center gap-4 p-3.5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] group",
              isOpen ? "justify-between" : "justify-center px-0 border-transparent bg-transparent"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-primary/40 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {isOpen && (
                  <div className="flex flex-col truncate max-w-[130px]">
                    <span className="text-[11px] font-black text-white truncate uppercase tracking-tight">{user.email?.split('@')[0]}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <span className="text-[8px] text-primary font-black uppercase tracking-[0.2em] opacity-70">Secured</span>
                    </div>
                  </div>
                )}
              </div>
              
              {isOpen && (
                <button 
                  onClick={() => signOut()}
                  className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                  title="Sair"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className={cn(
          "fixed top-7 z-[60] p-3.5 rounded-2xl bg-primary text-white shadow-[0_0_40px_rgba(var(--primary),0.5)] transition-all duration-500 hover:scale-110 active:scale-90 border border-white/20 group",
          isOpen ? "left-[260px] rotate-180" : "left-7"
        )}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </>
  );
}
