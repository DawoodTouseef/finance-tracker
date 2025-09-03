import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { clerkPublishableKey } from "./config";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import NetworkStatusMonitor from "./components/NetworkStatusMonitor";
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
import ErrorHandlingDemo from "./pages/ErrorHandlingDemo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Don't retry if we're offline
        if (!navigator.onLine) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Add global error handling for queries
      onError: (error) => {
        console.error('Query error:', error);
      }
    },
    mutations: {
      retry: false,
      // Add global error handling for mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    },
  },
});

// Check if we're in development mode
const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Only validate Clerk key in production
if (!isDevelopment && !clerkPublishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

export default function App() {
  // In development mode, skip ClerkProvider
  return (
    <GlobalErrorBoundary>
      {isDevelopment ? (
        <QueryClientProvider client={queryClient}>
          <Router>
            <Layout>
              <GlobalErrorBoundary>
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
                  <Route path="/error-handling-demo" element={<ErrorHandlingDemo />} />
                </Routes>
              </GlobalErrorBoundary>
            </Layout>
            <NetworkStatusMonitor />
          </Router>
        </QueryClientProvider>
      ) : (
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <QueryClientProvider client={queryClient}>
            <Router>
              <AuthGuard>
                <Layout>
                  <GlobalErrorBoundary>
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
                      <Route path="/error-handling-demo" element={<ErrorHandlingDemo />} />
                    </Routes>
                  </GlobalErrorBoundary>
                </Layout>
              </AuthGuard>
              <NetworkStatusMonitor />
            </Router>
          </QueryClientProvider>
        </ClerkProvider>
      )}
      <Toaster />
    </GlobalErrorBoundary>
  );
}
