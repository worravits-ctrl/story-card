import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContextSupabase'

// Pages
import AuthPageSupabase from '@/pages/AuthPageSupabase'
import Dashboard from '@/pages/Dashboard'
import AdminPanel from '@/pages/AdminPanel'
import SetupAdmin from '@/pages/SetupAdmin'
import { CardDesigner } from '@/components/CardDesigner'
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();



const App = () => {
  // Debug logging
  console.log('App component rendering...')
  console.log('Environment:', import.meta.env.MODE)

  function AppRoutes() {
    const { user, userProfile, loading } = useAuth()
    
    console.log('AppRoutes rendering...', { user: user?.email, userProfile, loading, currentPath: window.location.pathname })
    
    if (loading) {
      console.log('Loading state - showing spinner')
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      )
    }
    
    function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const { user } = useAuth()
      console.log('ProtectedRoute check:', { hasUser: !!user, userEmail: user?.email })
      return user ? children : <Navigate to="/auth" />
    }

    function AdminRoute({ children }: { children: React.ReactNode }) {
      const { user, userProfile } = useAuth()
      console.log('AdminRoute check:', { 
        hasUser: !!user, 
        userEmail: user?.email,
        userProfile: userProfile,
        role: userProfile?.role,
        isAdmin: userProfile?.role === 'admin'
      })
      
      if (!user) {
        console.log('AdminRoute: No user, redirecting to auth')
        return <Navigate to="/auth" />
      }
      
      if (!userProfile) {
        console.log('AdminRoute: No userProfile, showing loading')
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
      }
      
      if (userProfile.role !== 'admin') {
        console.log('AdminRoute: Not admin, redirecting to dashboard')
        return <Navigate to="/dashboard" />
      }
      
      console.log('AdminRoute: Access granted to admin')
      return <>{children}</>
    }
    
    // Debug current path and user state
    console.log('Current path:', window.location.pathname)
    console.log('User state:', { hasUser: !!user, email: user?.email })
    
    return (
      <Routes>
        <Route path="/" element={
          <>
            {console.log('Rendering Index component')}
            <Index />
          </>
        } />
        <Route 
          path="/auth" 
          element={
            user ? (
              <>
                {console.log('User exists, redirecting to dashboard')}
                <Navigate to="/dashboard" />
              </>
            ) : (
              <>
                {console.log('No user, showing auth page')}
                <AuthPageSupabase />
              </>
            )
          } 
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
        <Route 
          path="/setup-admin" 
          element={
            <ProtectedRoute>
              <SetupAdmin />
            </ProtectedRoute>
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
