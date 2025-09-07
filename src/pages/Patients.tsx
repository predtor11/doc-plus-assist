import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Patient {
  id: string;
  name: string;
  age: number | null;
  email: string | null;
  phone: string | null;
  medical_history: string | null;
  created_at: string;
}

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_doctor_id', user?.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.medical_history && patient.medical_history.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (patient: Patient) => {
    // For now, all patients are considered active
    return 'bg-success text-success-foreground';
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
                    <p className="text-sm text-muted-foreground">Age: {patient.age || 'N/A'}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(patient)}>
                  Active
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Registered: {new Date(patient.created_at).toLocaleDateString()}
              </p>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/chat/${patient.id}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
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
        </>
      )}
    </div>
  );
};

export default Patients;