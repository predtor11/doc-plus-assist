import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const PatientDashboard = () => {
  const { user } = useAuth();

  const recentActivity = [
    { type: 'AI Chat', message: 'Stress relief session completed', time: '2 hours ago', status: 'completed' },
    { type: 'Doctor', message: 'Dr. Smith sent you a message', time: '1 day ago', status: 'new' },
    { type: 'AI Chat', message: 'Mood tracking update', time: '2 days ago', status: 'completed' },
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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.slice(0, 3).map((activity, index) => (
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
    </div>
  );
};

export default PatientDashboard;