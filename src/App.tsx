import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import HealthSignals from "./pages/HealthSignals";
import PatientGraph from "./pages/PatientGraph";
import Care from "./pages/Care";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ?? "https://friendly-ostrich-184.convex.cloud"
);

const App = () => (
  <ConvexProvider client={convex}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health-signals" element={<HealthSignals />} />
            <Route path="/patient-graph" element={<PatientGraph />} />
            <Route path="/care" element={<Care />} />
            {/* Legacy redirects */}
            <Route path="/find-care" element={<Care />} />
            <Route path="/care-guide" element={<Care />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ConvexProvider>
);

export default App;
