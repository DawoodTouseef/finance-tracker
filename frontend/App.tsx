import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { clerkPublishableKey } from "./config";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Bills from "./pages/Bills";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import Insights from "./pages/Insights";
import Backup from "./pages/Backup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

if (!clerkPublishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <QueryClientProvider client={queryClient}>
          <Router>
            <AuthGuard>
              <Layout>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/bills" element={<Bills />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="/backup" element={<Backup />} />
                  </Routes>
                </ErrorBoundary>
              </Layout>
            </AuthGuard>
            <Toaster />
          </Router>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
