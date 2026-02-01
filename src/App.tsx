import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { PremiumRoute } from "@/components/auth/PremiumRoute";
import { VexaAdsRoute } from "@/components/auth/VexaAdsRoute";
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
const MarketingCredits = lazy(() => import("./pages/MarketingCredits"));
const MarketingBuyCredits = lazy(() => import("./pages/MarketingBuyCredits"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const ReportCheckout = lazy(() => import("./pages/ReportCheckout"));
const Billing = lazy(() => import("./pages/Billing"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminOnboarding = lazy(() => import("./pages/admin/AdminOnboarding"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets"));
const AdminTicketDetail = lazy(() => import("./pages/admin/AdminTicketDetail"));
const AdminHealthCheck = lazy(() => import("./pages/admin/AdminHealthCheck"));

// VEXA Ads - Módulo Premium Demo (aislado) - Estructura reestructurada
const VexaAdsOverview = lazy(() => import("./pages/vexa-ads/VexaAdsOverview"));
const VexaAdsDiagnostico = lazy(() => import("./pages/vexa-ads/VexaAdsDiagnostico"));
const VexaAdsEstrategia = lazy(() => import("./pages/vexa-ads/VexaAdsEstrategia"));
const VexaAdsCreativos = lazy(() => import("./pages/vexa-ads/VexaAdsCreativos"));
const VexaAdsCampanas = lazy(() => import("./pages/vexa-ads/VexaAdsCampanas"));
const VexaAdsAnalisis = lazy(() => import("./pages/vexa-ads/VexaAdsAnalisis"));
const VexaAdsRecomendaciones = lazy(() => import("./pages/vexa-ads/VexaAdsRecomendaciones"));
const VexaAdsVideoAsesor = lazy(() => import("./pages/vexa-ads/VexaAdsVideoAsesor"));
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
        <ImpersonationProvider>
          <BrowserRouter>
            <ImpersonationBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              
              {/* Rutas protegidas */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/ajustes-agente" element={<ProtectedRoute><AgentSettings /></ProtectedRoute>} />
              <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              {/* Resultados routes */}
              <Route path="/resultados" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
              <Route path="/resultados/metricas" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
              <Route path="/resultados/ventas" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              {/* Marketing habilitado para todos los planes */}
              <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
              <Route path="/marketing/plantillas" element={<ProtectedRoute><MarketingTemplates /></ProtectedRoute>} />
              <Route path="/marketing/performance" element={<ProtectedRoute><MarketingPerformance /></ProtectedRoute>} />
              <Route path="/marketing/creditos" element={<ProtectedRoute><MarketingCredits /></ProtectedRoute>} />
              <Route path="/marketing/comprar-creditos" element={<ProtectedRoute><MarketingBuyCredits /></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/reportes/:reportId" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
              <Route path="/reportes/checkout/:reportId" element={<ProtectedRoute><ReportCheckout /></ProtectedRoute>} />
              <Route path="/facturacion" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/notificaciones" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/soporte" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/onboarding" element={<AdminRoute><AdminOnboarding /></AdminRoute>} />
              <Route path="/admin/clientes" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/tickets" element={<AdminRoute><AdminTickets /></AdminRoute>} />
<Route path="/admin/tickets/:ticketId" element={<AdminRoute><AdminTicketDetail /></AdminRoute>} />
              <Route path="/admin/health" element={<AdminRoute><AdminHealthCheck /></AdminRoute>} />
              
              {/* VEXA Ads - Módulo controlado por tenant (vexa_ads_enabled) */}
              <Route path="/vexa-ads" element={<ProtectedRoute><VexaAdsRoute><VexaAdsOverview /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/diagnostico" element={<ProtectedRoute><VexaAdsRoute><VexaAdsDiagnostico /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/estrategia" element={<ProtectedRoute><VexaAdsRoute><VexaAdsEstrategia /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/creativos" element={<ProtectedRoute><VexaAdsRoute><VexaAdsCreativos /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/campanas" element={<ProtectedRoute><VexaAdsRoute><VexaAdsCampanas /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/campanas/presupuesto" element={<ProtectedRoute><VexaAdsRoute><VexaAdsCampanas /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/analisis" element={<ProtectedRoute><VexaAdsRoute><VexaAdsAnalisis /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/recomendaciones" element={<ProtectedRoute><VexaAdsRoute><VexaAdsRecomendaciones /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/recomendaciones/video" element={<ProtectedRoute><VexaAdsRoute><VexaAdsVideoAsesor /></VexaAdsRoute></ProtectedRoute>} />
              <Route path="/vexa-ads/configuracion" element={<ProtectedRoute><VexaAdsRoute><VexaAdsConfiguracion /></VexaAdsRoute></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ImpersonationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
