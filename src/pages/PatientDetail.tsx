import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, AlertTriangle, Pill, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PatientDetail {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  assigned_doctor_id: string | null;
}

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only allow doctors to access this page
  if (!user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only doctors can view patient details.
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
    if (id) {
      fetchPatientDetails();
    }
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching patient details for ID:', id);

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching patient:', error);
        setError(error.message);
        return;
      }

      console.log('Patient data fetched:', data);
      setPatient(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const startChat = () => {
    if (patient) {
      navigate(`/chat/${patient.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Patient not found'}
            </p>
            <Button onClick={() => navigate('/patients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/patients')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{patient.name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  {patient.age && (
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {patient.age} years old
                    </Badge>
                  )}
                  {patient.gender && (
                    <Badge variant="outline">
                      {patient.gender}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={startChat} className="bg-gradient-primary">
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{patient.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.emergency_contact_name && (
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.emergency_contact_name}</span>
                  </div>
                )}
                {patient.emergency_contact_phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.emergency_contact_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.allergies && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                    Allergies
                  </h4>
                  <p className="text-sm text-muted-foreground">{patient.allergies}</p>
                </div>
              )}

              {patient.current_medications && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Pill className="h-4 w-4 mr-2 text-blue-500" />
                    Current Medications
                  </h4>
                  <p className="text-sm text-muted-foreground">{patient.current_medications}</p>
                </div>
              )}

              {patient.medical_history && (
                <div>
                  <h4 className="font-medium mb-2">Medical History</h4>
                  <p className="text-sm text-muted-foreground">{patient.medical_history}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Info */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Patient ID:</span>
                  <p className="text-sm text-muted-foreground font-mono">{patient.id}</p>
                </div>
                <div>
                  <span className="font-medium">Registered:</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(patient.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
