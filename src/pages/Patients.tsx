import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatients } from '@/hooks/useDoctorPatients';
import { useChatSessions } from '@/hooks/useChatSessions';

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { patients, loading, error } = useDoctorPatients();
  const { createSession } = useChatSessions();

  // Only allow doctors to access this page
  if (!user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only doctors can view patient lists.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredPatients = patients.filter(patient =>
    patient.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: 'Active' | 'Needs attention' | 'Stable') => {
    switch (status) {
      case 'Active':
        return 'bg-green-500 text-white';
      case 'Needs attention':
        return 'bg-yellow-500 text-white';
      case 'Stable':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handleChatClick = async (patient: any) => {
    if (patient.sessionId) {
      // Session exists, navigate directly
      navigate(`/chat/${patient.sessionId}`);
    } else {
      // Create new session and navigate
      try {
        const newSession = await createSession('doctor-patient', `Chat with ${patient.patientName}`, patient.patientId);
        if (newSession) {
          navigate(`/chat/${newSession.id}`);
        }
      } catch (error) {
        console.error('Error creating chat session:', error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Patient Management</h1>
              <p className="text-muted-foreground">Manage and communicate with your patients</p>
            </div>
            <Button onClick={() => navigate('/register-patient')} className="bg-gradient-primary">
              Add New Patient
            </Button>
          </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.sessionId || patient.patientId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(patient.patientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{patient.patientName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {patient.lastMessageAt 
                        ? `Last active: ${new Date(patient.lastMessageAt).toLocaleDateString()}`
                        : 'No messages yet'
                      }
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Session: {patient.sessionId ? 'Active' : 'Not started'}
              </p>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleChatClick(patient)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/patient/${patient.patientId}`)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No patients found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Start by registering your first patient.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => navigate('/register-patient')}>
                Register First Patient
              </Button>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

export default Patients;