import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, BarChart3, UserPlus, Calendar, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const navigate = useNavigate();

  // Mock data
  const stats = [
    { title: 'Total Patients', value: '24', icon: Users, color: 'text-primary' },
    { title: 'Active Chats', value: '8', icon: MessageCircle, color: 'text-secondary' },
    { title: 'Today\'s Appointments', value: '6', icon: Calendar, color: 'text-info' },
    { title: 'Completed Consultations', value: '18', icon: Activity, color: 'text-success' },
  ];

  const recentPatients = [
    { id: '1', name: 'John Doe', lastSeen: '2 hours ago', status: 'Active' },
    { id: '2', name: 'Jane Wilson', lastSeen: '4 hours ago', status: 'Needs attention' },
    { id: '3', name: 'Robert Chen', lastSeen: '1 day ago', status: 'Stable' },
  ];

  const quickActions = [
    { title: 'Chat with AI Assistant', icon: MessageCircle, action: () => navigate('/ai-chat'), color: 'bg-primary' },
    { title: 'Register New Patient', icon: UserPlus, action: () => navigate('/register-patient'), color: 'bg-secondary' },
    { title: 'View Analytics', icon: BarChart3, action: () => navigate('/analytics'), color: 'bg-info' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Dr. Smith</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full bg-accent ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                className={`h-20 flex-col space-y-2 ${action.color} hover:opacity-90`}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">Last seen: {patient.lastSeen}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    patient.status === 'Active' ? 'bg-success text-success-foreground' :
                    patient.status === 'Needs attention' ? 'bg-warning text-warning-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {patient.status}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/chat/${patient.id}`)}>
                    Chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorDashboard;