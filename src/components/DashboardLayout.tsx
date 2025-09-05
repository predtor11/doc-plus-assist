import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import DoctorSidebar from './DoctorSidebar';
import PatientSidebar from './PatientSidebar';
import DoctorProfile from './DoctorProfile';
import PatientProfile from './PatientProfile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {user?.registration_no ? <DoctorSidebar /> : <PatientSidebar />}
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-6 shadow-sm">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex items-center justify-between w-full ml-4 lg:ml-0">
              <h1 className="text-xl font-semibold text-foreground">
                Doc+ Medical Assistant
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.name}
                </span>
                {user?.role === 'doctor' ? <DoctorProfile /> : <PatientProfile />}
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;