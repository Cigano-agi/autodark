import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PremiumSidebar } from "./PremiumSidebar";
import { cn } from "@/lib/utils";
import { BeamsBackground } from "@/components/ui/beams-background";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // Auto-close sidebar ONLY on small screens when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-[#050508]">
      {/* Background layer — no stacking context children so sidebar z-index is global */}
      <BeamsBackground intensity="high" className="fixed inset-0 pointer-events-none" />

      {/* Sidebar rendered at root level so z-[100] competes globally against dialog z-50 */}
      <PremiumSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className={cn(
        "relative flex-1 transition-all duration-500 ease-in-out min-h-screen w-full",
        isSidebarOpen ? "lg:pl-72" : "lg:pl-20"
      )}>
        {/* Subtle overlay for content when sidebar is open on mobile */}
        <div className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 lg:hidden transition-opacity duration-300",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} onClick={() => setIsSidebarOpen(false)} />

        <div className="relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

