import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { PremiumRoute } from "@/components/auth/PremiumRoute";
import { Loader2 } from "lucide-react";

// Lazy load de páginas para code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chats = lazy(() => import("./pages/Chats"));
const AgentSettings = lazy(() => import("./pages/AgentSettings"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Metrics = lazy(() => import("./pages/Metrics"));
const Results = lazy(() => import("./pages/Results"));
const Marketing = lazy(() => import("./pages/Marketing"));
const MarketingTemplates = lazy(() => import("./pages/MarketingTemplates"));
const MarketingPerformance = lazy(() => import("./pages/MarketingPerformance"));
const Reports = lazy(() => import("./pages/Reports"));
const Billing = lazy(() => import("./pages/Billing"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const PendingSetup = lazy(() => import("./pages/PendingSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminOnboarding = lazy(() => import("./pages/admin/AdminOnboarding"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets"));
const AdminTicketDetail = lazy(() => import("./pages/admin/AdminTicketDetail"));

// VEXA Ads - Módulo Premium Demo (aislado) - Nueva estructura simplificada
const VexaAdsOverview = lazy(() => import("./pages/vexa-ads/VexaAdsOverview"));
const VexaAdsDiagnostico = lazy(() => import("./pages/vexa-ads/VexaAdsDiagnostico"));
const VexaAdsEstrategia = lazy(() => import("./pages/vexa-ads/VexaAdsEstrategia"));
const VexaAdsCampanas = lazy(() => import("./pages/vexa-ads/VexaAdsCampanas"));
const VexaAdsCreativos = lazy(() => import("./pages/vexa-ads/VexaAdsCreativos"));
const VexaAdsRecomendaciones = lazy(() => import("./pages/vexa-ads/VexaAdsRecomendaciones"));
const VexaAdsPresupuesto = lazy(() => import("./pages/vexa-ads/VexaAdsPresupuesto"));
const VexaAdsConfiguracion = lazy(() => import("./pages/vexa-ads/VexaAdsConfiguracion"));

// Componente de loading para Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending-setup" element={<PendingSetup />} />
              
              {/* Rutas protegidas */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/ajustes-agente" element={<ProtectedRoute><AgentSettings /></ProtectedRoute>} />
              <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              {/* Resultados routes */}
              <Route path="/resultados" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
              <Route path="/resultados/metricas" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
              <Route path="/resultados/ventas" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/marketing" element={<ProtectedRoute><PremiumRoute feature="El módulo de Marketing"><Marketing /></PremiumRoute></ProtectedRoute>} />
              <Route path="/marketing/plantillas" element={<ProtectedRoute><PremiumRoute feature="Las plantillas de WhatsApp"><MarketingTemplates /></PremiumRoute></ProtectedRoute>} />
              <Route path="/marketing/performance" element={<ProtectedRoute><PremiumRoute feature="El análisis de performance"><MarketingPerformance /></PremiumRoute></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/facturacion" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/notificaciones" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/soporte" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/clientes" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/onboarding" element={<AdminRoute><AdminOnboarding /></AdminRoute>} />
              <Route path="/admin/tickets" element={<AdminRoute><AdminTickets /></AdminRoute>} />
              <Route path="/admin/tickets/:ticketId" element={<AdminRoute><AdminTicketDetail /></AdminRoute>} />
              
              {/* VEXA Ads - Módulo Premium Demo - Nueva navegación simplificada */}
              <Route path="/vexa-ads" element={<VexaAdsOverview />} />
              <Route path="/vexa-ads/diagnostico" element={<VexaAdsDiagnostico />} />
              <Route path="/vexa-ads/estrategia" element={<VexaAdsEstrategia />} />
              <Route path="/vexa-ads/campanas" element={<VexaAdsCampanas />} />
              <Route path="/vexa-ads/creativos" element={<VexaAdsCreativos />} />
              <Route path="/vexa-ads/recomendaciones" element={<VexaAdsRecomendaciones />} />
              <Route path="/vexa-ads/presupuesto" element={<VexaAdsPresupuesto />} />
              <Route path="/vexa-ads/configuracion" element={<VexaAdsConfiguracion />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
