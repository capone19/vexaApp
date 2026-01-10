import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ajustes-agente" element={<AgentSettings />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/calendario" element={<Calendar />} />
          {/* Resultados routes */}
          <Route path="/resultados" element={<Metrics />} />
          <Route path="/resultados/metricas" element={<Metrics />} />
          <Route path="/resultados/ventas" element={<Results />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/marketing/plantillas" element={<MarketingTemplates />} />
          <Route path="/marketing/performance" element={<MarketingPerformance />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/facturacion" element={<Billing />} />
          <Route path="/notificaciones" element={<Notifications />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
