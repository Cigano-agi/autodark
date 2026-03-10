import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-load all heavy pages (code-splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChannelView = lazy(() => import("./pages/ChannelView"));
const StrategyDashboard = lazy(() => import("./pages/Strategy/Index"));
const ProductionWizard = lazy(() => import("./pages/Production/Index"));
const OperationsPage = lazy(() => import("./pages/Operations/Index"));
const DesignSystemShowcase = lazy(() => import("./pages/DesignSystemShowcase"));
const ChannelPrompts = lazy(() => import("./pages/ChannelPrompts"));
const LongVideoStudio = lazy(() => import("./pages/LongVideoStudio"));
const FixAndVerify = lazy(() => import("./pages/FixAndVerify"));

const queryClient = new QueryClient();

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public Route (redirect to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<LazyFallback />}>
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/design-system" element={<DesignSystemShowcase />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/production" element={<ProtectedRoute><ProductionWizard /></ProtectedRoute>} />
      <Route path="/channel/:id" element={<ProtectedRoute><ChannelView /></ProtectedRoute>} />
      <Route path="/channel/:id/strategy" element={<ProtectedRoute><StrategyDashboard /></ProtectedRoute>} />
      <Route path="/channel/:id/production" element={<ProtectedRoute><ProductionWizard /></ProtectedRoute>} />
      <Route path="/channel/:id/prompts" element={<ProtectedRoute><ChannelPrompts /></ProtectedRoute>} />
      <Route path="/channel/:id/studio" element={<ProtectedRoute><LongVideoStudio /></ProtectedRoute>} />
      <Route path="/strategy" element={<ProtectedRoute><StrategyDashboard /></ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
      <Route path="/fix" element={<ProtectedRoute><FixAndVerify /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
