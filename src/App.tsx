import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Chats from "./pages/Chats";
import AgentSettings from "./pages/AgentSettings";
import Calendar from "./pages/Calendar";
import Metrics from "./pages/Metrics";
import Results from "./pages/Results";
import Marketing from "./pages/Marketing";
import MarketingTemplates from "./pages/MarketingTemplates";
import MarketingPerformance from "./pages/MarketingPerformance";
import Reports from "./pages/Reports";
import Billing from "./pages/Billing";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
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
          <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
          <Route path="/marketing/plantillas" element={<ProtectedRoute><MarketingTemplates /></ProtectedRoute>} />
          <Route path="/marketing/performance" element={<ProtectedRoute><MarketingPerformance /></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/facturacion" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/notificaciones" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/soporte" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
