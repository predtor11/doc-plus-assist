import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  LogOut,
  Stethoscope,
  Heart
} from 'lucide-react';

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const doctorItems = [
    { title: 'Chat', url: '/chat', icon: MessageCircle },
    { title: 'Patients', url: '/patients', icon: Users },
    { title: 'AI Assistant', url: '/ai-chat', icon: MessageCircle },
  ];

  const patientItems = [
    { title: 'Chat', url: '/chat', icon: MessageCircle },
    { title: 'AI Support', url: '/ai-chat', icon: Heart },
    { title: 'My Doctor', url: '/doctor-chat', icon: Stethoscope },
  ];

  const items = user?.role === 'doctor' ? doctorItems : patientItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {/* App Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            {!collapsed && (
              <div>
                <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Doc+
                </h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role} Portal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 bg-accent/50">
            <p className="font-medium text-sm">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4">
          <SidebarMenuButton onClick={logout} className="w-full justify-start text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;