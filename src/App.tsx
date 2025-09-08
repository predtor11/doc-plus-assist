import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import AIChat from "./pages/AIChat";
import DoctorChat from "./pages/DoctorChat";
import PatientRegistration from "./pages/PatientRegistration";

import Patients from "./pages/Patients";
import NotFound from "./pages/NotFound";
import PatientDetail from "./pages/PatientDetail";
import DebugPage from "./pages/DebugPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-4">Loading Doc+...</p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Taking longer than expected?</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('🔄 Force refresh triggered by user');
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={async () => {
                console.log('🚪 Force logout triggered by user');
                await logout();
                window.location.reload();
              }}
            >
              Sign Out & Restart
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              {user?.role === 'doctor' ? <DoctorDashboard /> : <PatientDashboard />}
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AIChat />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor-chat"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DoctorChat />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      {/* Doctor-only routes */}
      {user?.role === 'doctor' && (
        <>
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Patients />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/register-patient"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PatientRegistration />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PatientDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
        </>
      )}
      
      {/* Debug page - accessible without authentication */}
      <Route path="/debug" element={<DebugPage />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
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
);

export default App;
