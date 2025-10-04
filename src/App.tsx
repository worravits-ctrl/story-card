import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContextLocal'

// Pages
import AuthPageLocal from '@/pages/AuthPageLocal'
import Dashboard from '@/pages/Dashboard'
import AdminPanel from '@/pages/AdminPanel'
import { CardDesigner } from '@/components/CardDesigner'
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();



const App = () => {
  // Debug logging
  console.log('App component rendering...')
  console.log('Environment:', import.meta.env.MODE)

  function AppRoutes() {
    const { user, loading } = useAuth()
    
    console.log('AppRoutes rendering...', { user, loading })
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      )
    }
    
    function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const { user } = useAuth()
      return user ? children : <Navigate to="/auth" />
    }

    function AdminRoute({ children }: { children: React.ReactNode }) {
      const { user, userProfile } = useAuth()
      return user && userProfile?.role === 'admin' ? children : <Navigate to="/dashboard" />
    }
    
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/dashboard" /> : <AuthPageLocal />} 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/designer" 
          element={
            <ProtectedRoute>
              <CardDesigner />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    )
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
};

export default App;
