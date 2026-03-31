import { Zap } from "lucide-react";
import { Button } from "./button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function DashboardHeader() {
    const { signOut } = useAuth();
    const location = useLocation();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-lg">

                    {/* Brand */}
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white fill-current" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">
                            Auto<span className="text-black">Dark</span>
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            to="/dashboard"
                            className={`text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-white' : 'text-white/70 hover:text-white'
                                }`}
                        >
                            Dashboard
                        </Link>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            className="text-white/70 hover:text-white hover:bg-white/5 rounded-full px-4"
                            onClick={signOut}
                        >
                            Sair
                        </Button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 border border-white/20" />
                    </div>
                </div>
            </div>
        </header>
    );
}
