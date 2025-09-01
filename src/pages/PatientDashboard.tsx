import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Stethoscope, Calendar, Activity, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const healthStats = [
    { title: 'AI Chat Sessions', value: '12', icon: Heart, color: 'text-secondary' },
    { title: 'Doctor Messages', value: '5', icon: MessageCircle, color: 'text-primary' },
    { title: 'Next Appointment', value: 'Tomorrow', icon: Calendar, color: 'text-info' },
    { title: 'Wellness Score', value: '85%', icon: TrendingUp, color: 'text-success' },
  ];

  const recentActivity = [
    { type: 'AI Chat', message: 'Stress relief session completed', time: '2 hours ago', status: 'completed' },
    { type: 'Doctor', message: 'Dr. Smith sent you a message', time: '1 day ago', status: 'new' },
    { type: 'AI Chat', message: 'Mood tracking update', time: '2 days ago', status: 'completed' },
  ];

  const quickActions = [
    { 
      title: 'Chat with AI Support', 
      description: 'Get stress relief and emotional support',
      icon: Heart, 
      action: () => navigate('/ai-chat'), 
      color: 'bg-secondary' 
    },
    { 
      title: 'Message My Doctor', 
      description: 'Contact your assigned physician',
      icon: Stethoscope, 
      action: () => navigate('/doctor-chat'), 
      color: 'bg-primary' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Assigned Doctor</p>
          <p className="font-medium">Dr. Sarah Smith</p>
        </div>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthStats.map((stat, index) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.action}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-full ${action.color} text-white`}>
                  <action.icon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'new' ? 'bg-primary' : 'bg-muted-foreground'
                  }`}></div>
                  <div>
                    <p className="font-medium">{activity.message}</p>
                    <p className="text-sm text-muted-foreground">{activity.type} • {activity.time}</p>
                  </div>
                </div>
                {activity.status === 'new' && (
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    New
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wellness Tip */}
      <Card className="bg-gradient-secondary text-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Activity className="h-8 w-8" />
            <div>
              <h3 className="font-semibold text-lg">Daily Wellness Tip</h3>
              <p className="text-sm opacity-90">
                Remember to take deep breaths and stay hydrated. Your mental health is just as important as your physical health.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDashboard;