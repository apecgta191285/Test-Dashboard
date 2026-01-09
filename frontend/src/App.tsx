import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import Users from "./pages/Users";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import TrendAnalysis from "./pages/TrendAnalysis";
import SeoWebAnalytics from "./pages/SeoWebAnalytics";
import EcommerceInsights from "./pages/EcommerceInsights";
import CrmLeadsInsights from "./pages/CrmLeadsInsights";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/users" component={Users} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Reports} />
      <Route path="/trend-analysis" component={TrendAnalysis} />
      <Route path="/seo-web-analytics" component={SeoWebAnalytics} />
      <Route path="/ecommerce-insights" component={EcommerceInsights} />
      <Route path="/crm-leads-insights" component={CrmLeadsInsights} />
      <Route path="/" component={Dashboard} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// React Query Best Practice: ตั้งค่า staleTime และ cacheTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 วินาที - data จะถือว่า fresh ไม่ต้อง refetch
      cacheTime: 5 * 60 * 1000,  // 5 นาที - เก็บ cache ไว้ (v4: cacheTime, v5: gcTime)
      refetchOnWindowFocus: false, // ไม่ refetch เมื่อกลับมาที่ window
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider
          defaultTheme="light"
        // switchable
        >
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
