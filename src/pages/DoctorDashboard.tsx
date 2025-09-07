import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatients } from '@/hooks/useDoctorPatients';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients, loading, error } = useDoctorPatients();

  const formatLastSeen = (lastMessageAt: string | null) => {
    if (!lastMessageAt) return 'No recent activity';
    
    const lastMessage = new Date(lastMessageAt);
    const now = new Date();
    const diffMs = now.getTime() - lastMessage.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name || 'Doctor'}</p>
      </div>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading patients...</p>
          ) : error ? (
            <p className="text-destructive">Error loading patients: {error}</p>
          ) : patients.length === 0 ? (
            <p className="text-muted-foreground">No patients found</p>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div key={patient.sessionId} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">{patient.patientName}</p>
                    <p className="text-sm text-muted-foreground">Last seen: {formatLastSeen(patient.lastMessageAt)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      patient.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : patient.status === 'Needs attention'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {patient.status}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/chat/${patient.sessionId}`)}>
                      Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorDashboard;