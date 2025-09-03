import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import DoctorSidebar from './DoctorSidebar';
import PatientSidebar from './PatientSidebar';

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
            <h1 className="text-xl font-semibold text-foreground ml-4 lg:ml-0">
              Doc+ Medical Assistant
            </h1>
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