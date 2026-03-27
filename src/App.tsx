import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layouts/AppLayout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChannelView = lazy(() => import("./pages/Channel/Index"));
const ChannelPrompts = lazy(() => import("./pages/ChannelPrompts"));
const LongVideoStudio = lazy(() => import("./pages/LongVideoStudio"));
const ProductionWizard = lazy(() => import("./pages/Production/Index"));
const PipelinePage = lazy(() => import("./pages/Pipeline/Index"));
const FoundationPage = lazy(() => import("./pages/Foundation/Index"));
const MediaHub = lazy(() => import("./pages/MediaHub/Index"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LazyFallback />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LazyFallback />;
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

      {/* All authenticated routes share AppLayout (DashboardHeader + Outlet) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/channel/:id" element={<ChannelView />} />
        <Route path="/channel/:id/prompts" element={<ChannelPrompts />} />
        <Route path="/channel/:id/studio" element={<LongVideoStudio />} />
        <Route path="/channel/:id/production" element={<ProductionWizard />} />
        <Route path="/channel/:id/foundation" element={<FoundationPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/hub" element={<MediaHub />} />
      </Route>

      {/* Legacy redirects */}
      <Route path="/production" element={<Navigate to="/dashboard" replace />} />
      <Route path="/fix" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
