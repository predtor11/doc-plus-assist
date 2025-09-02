import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Patients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock patient data
  const patients = [
    {
      id: '1',
      name: 'John Doe',
      age: 45,
      email: 'john.doe@email.com',
      phone: '+1 234-567-8901',
      lastVisit: '2024-01-14',
      status: 'Active',
      symptoms: 'Anxiety, Insomnia',
      unreadMessages: 2
    },
    {
      id: '2',
      name: 'Jane Wilson',
      age: 32,
      email: 'jane.wilson@email.com',
      phone: '+1 234-567-8902',
      lastVisit: '2024-01-12',
      status: 'Needs Attention',
      symptoms: 'Headaches, Fatigue',
      unreadMessages: 0
    },
    {
      id: '3',
      name: 'Robert Chen',
      age: 28,
      email: 'robert.chen@email.com',
      phone: '+1 234-567-8903',
      lastVisit: '2024-01-10',
      status: 'Stable',
      symptoms: 'Back Pain',
      unreadMessages: 1
    },
    {
      id: '4',
      name: 'Emily Davis',
      age: 55,
      email: 'emily.davis@email.com',
      phone: '+1 234-567-8904',
      lastVisit: '2024-01-08',
      status: 'Follow-up Required',
      symptoms: 'Hypertension',
      unreadMessages: 0
    },
  ];

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-success text-success-foreground';
      case 'Needs Attention':
        return 'bg-warning text-warning-foreground';
      case 'Follow-up Required':
        return 'bg-info text-info-foreground';
      case 'Stable':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
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
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Age: {patient.age}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Last visit: {patient.lastVisit}</p>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/chat/${patient.id}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                  {patient.unreadMessages > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {patient.unreadMessages}
                    </Badge>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/patient/${patient.id}`)}
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
    </div>
  );
};

export default Patients;