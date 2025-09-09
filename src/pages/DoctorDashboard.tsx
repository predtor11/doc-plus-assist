import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LMStudioInstructions } from '@/components/LMStudioInstructions';
import { useLMStudio } from '@/hooks/useLMStudio';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status: lmStudioStatus, isChecking: isCheckingLMStudio, checkLMStudioStatus } = useLMStudio();

  const recentPatients = [
    { id: '1', name: 'John Doe', lastSeen: '2 hours ago', status: 'Active' },
    { id: '2', name: 'Jane Wilson', lastSeen: '4 hours ago', status: 'Needs attention' },
    { id: '3', name: 'Robert Chen', lastSeen: '1 day ago', status: 'Stable' },
  ];

  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Dr. {user?.name || 'Doctor'}</p>
      </div>

      {/* LM Studio Setup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isCheckingLMStudio ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : lmStudioStatus.isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            AI Assistant Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  LM Studio Status: {isCheckingLMStudio ? 'Checking...' : lmStudioStatus.isConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Required for AI chat functionality
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkLMStudioStatus}
                disabled={isCheckingLMStudio}
              >
                {isCheckingLMStudio ? 'Checking...' : 'Check Status'}
              </Button>
            </div>

            {!lmStudioStatus.isConnected && !isCheckingLMStudio && (
              <LMStudioInstructions
                onCheckConnection={checkLMStudioStatus}
                isChecking={isCheckingLMStudio}
              />
            )}

            {lmStudioStatus.isConnected && lmStudioStatus.models && lmStudioStatus.models.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  <strong>✅ Ready to use!</strong> Available models: {lmStudioStatus.models.join(', ')}
                </p>
              </div>
            )}
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