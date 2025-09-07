import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const navigate = useNavigate();

  const recentPatients = [
    { id: '1', name: 'John Doe', lastSeen: '2 hours ago', status: 'Active' },
    { id: '2', name: 'Jane Wilson', lastSeen: '4 hours ago', status: 'Needs attention' },
    { id: '3', name: 'Robert Chen', lastSeen: '1 day ago', status: 'Stable' },
  ];

  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Dr. Smith</p>
      </div>

      

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">Last seen: {patient.lastSeen}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">{patient.status}</span>
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