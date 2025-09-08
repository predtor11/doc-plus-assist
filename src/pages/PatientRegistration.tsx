import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Calendar, ArrowLeft, MapPin, AlertTriangle, Pill } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PatientRegistration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patientData, setPatientData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    symptoms: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    gender: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Only allow doctors to access this page
  if (!user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only doctors can register patients.
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Debug: Log authentication state
      console.log('Current user:', user);
      console.log('User role:', user?.role);
      console.log('User ID:', user?.user_id);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Session data:', sessionData);
      console.log('Session error:', sessionError);
      
      // Check if user exists in doctors table
      console.log('Checking if user exists in doctors table...');
      const { data: doctorCheck, error: doctorError } = await supabase
        .from('doctors')
        .select('id, user_id, name')
        .eq('user_id', user.user_id)
        .single();

      if (doctorError) {
        console.error('Doctor check error:', doctorError);
        console.error('Doctor check error details:', {
          message: doctorError.message,
          details: doctorError.details,
          hint: doctorError.hint,
          code: doctorError.code
        });
        throw new Error('User is not registered as a doctor in the system');
      }

      console.log('Doctor record found:', doctorCheck);

      // Debug: Log the form data
      console.log('Patient registration data:', patientData);

      // First, let's check what columns exist in the patients table
      console.log('Checking patients table schema...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('patients')
        .select('address, emergency_contact_name, emergency_contact_phone, allergies, current_medications, medical_history')
        .limit(1);

      if (schemaError) {
        console.error('Schema check error:', schemaError);
        console.error('Schema error details:', {
          message: schemaError.message,
          details: schemaError.details,
          hint: schemaError.hint,
          code: schemaError.code
        });
      } else {
        console.log('Schema check successful, columns exist');
      }

      // Test basic authenticated operation
      console.log('Testing authenticated access...');
      const { data: testData, error: testError } = await supabase
        .from('patients')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Authentication test failed:', testError);
        console.error('Auth test error details:', {
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        });
      } else {
        console.log('Authentication test successful');
      }

      // Create a Supabase auth user for the patient FIRST
      const tempPassword = Math.random().toString(36).slice(-12) + 'Temp123!';

      console.log('Creating auth user with email:', patientData.email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: patientData.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/signin`,
          data: {
            name: `${patientData.firstName} ${patientData.lastName}`.trim(),
            isPatient: true,
            doctorId: user.user_id
          }
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status
        });
        throw authError;
      }

      console.log('Auth user created successfully:', authData.user?.id);

      // Create the patient record WITHOUT user_id first to avoid foreign key constraint issues
      console.log('Creating patient record...');

      const patientInsertData = {
        name: `${patientData.firstName} ${patientData.lastName}`.trim(),
        email: patientData.email,
        phone: patientData.phone,
        age: patientData.age ? parseInt(patientData.age) : null,
        gender: patientData.gender,
        address: patientData.address,
        emergency_contact_name: patientData.emergencyContact,
        emergency_contact_phone: patientData.emergencyPhone,
        medical_history: patientData.medicalHistory ?
          `${patientData.medicalHistory}${patientData.symptoms ? `\n\nCurrent Symptoms: ${patientData.symptoms}` : ''}` :
          patientData.symptoms || null,
        allergies: patientData.allergies,
        current_medications: patientData.medications,
        assigned_doctor_id: user.user_id
        // user_id will be added after patient record is created
      };

      console.log('Patient insert data:', patientInsertData);

      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .insert(patientInsertData)
        .select()
        .single();

      console.log('Supabase response received');
      console.log('Patient record:', patientRecord);
      console.log('Patient error:', patientError);

      if (patientError) {
        console.error('Patient creation error:', patientError);
        console.error('Error details:', {
          message: patientError.message,
          details: patientError.details,
          hint: patientError.hint,
          code: patientError.code
        });
        throw patientError;
      }

      console.log('Patient record created successfully:', patientRecord);

      // Now update the patient record with the user_id
      if (authData.user && patientRecord?.id) {
        console.log('Updating patient record with user_id...');
        const { error: updateError } = await supabase
          .from('patients')
          .update({ user_id: authData.user.id })
          .eq('id', patientRecord.id);

        if (updateError) {
          console.error('Patient update error:', updateError);
          console.warn('Patient created successfully but user_id update failed - patient can still log in later');
        } else {
          console.log('Patient update successful');
        }
      }

      // Send temporary password via email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-temp-password', {
          body: {
            patientName: `${patientData.firstName} ${patientData.lastName}`.trim(),
            patientEmail: patientData.email,
            tempPassword: tempPassword,
            doctorName: user.name
          }
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          throw new Error('Failed to send temporary password email');
        }

        console.log('Temporary password email sent successfully');
      } catch (emailError: any) {
        console.error('Error sending email:', emailError);
        // Don't fail registration if email fails, but show warning
        toast({
          title: "Patient registered with warning",
          description: `Patient account created but temporary password email could not be sent. Temp password: ${tempPassword}`,
          variant: "destructive",
        });
      }

      toast({
        title: "Patient registered successfully",
        description: `Patient account created and temporary password sent to ${patientData.email}`,
      });

      // Reset form
      setPatientData({
        firstName: '',
        lastName: '',
        age: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        symptoms: '',
        medicalHistory: '',
        allergies: '',
        medications: '',
        gender: ''
      });

      navigate('/patients');
    } catch (error: any) {
      console.error('Error registering patient:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Failed to register patient";
      if (error.message === 'Request timeout') {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/patients">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Register New Patient</h1>
        <p className="text-muted-foreground">Add a new patient to your practice</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>
            Enter the patient's details to create their account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterPatient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter patient's first name"
                    value={patientData.firstName}
                    onChange={(e) => setPatientData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter patient's last name"
                  value={patientData.lastName}
                  onChange={(e) => setPatientData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="patient@email.com"
                    value={patientData.email}
                    onChange={(e) => setPatientData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234-567-8900"
                    value={patientData.phone}
                    onChange={(e) => setPatientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="age"
                    type="number"
                    placeholder="Age in years"
                    value={patientData.age}
                    onChange={(e) => setPatientData(prev => ({ ...prev, age: e.target.value }))}
                    className="pl-10"
                    min="1"
                    max="150"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={patientData.gender}
                  onChange={(e) => setPatientData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="address"
                  placeholder="Enter patient's full address"
                  value={patientData.address}
                  onChange={(e) => setPatientData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full pl-10 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-vertical"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  type="text"
                  placeholder="Emergency contact full name"
                  value={patientData.emergencyContact}
                  onChange={(e) => setPatientData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  placeholder="Emergency contact phone"
                  value={patientData.emergencyPhone}
                  onChange={(e) => setPatientData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Current Symptoms</Label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="symptoms"
                  placeholder="Describe current symptoms, pain levels, duration, etc."
                  value={patientData.symptoms}
                  onChange={(e) => setPatientData(prev => ({ ...prev, symptoms: e.target.value }))}
                  className="w-full pl-10 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-vertical"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="medicalHistory"
                  placeholder="Previous conditions, surgeries, hospitalizations, etc."
                  value={patientData.medicalHistory}
                  onChange={(e) => setPatientData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                  className="w-full pl-10 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-vertical"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <textarea
                id="allergies"
                placeholder="List any known allergies (medications, foods, environmental, etc.)"
                value={patientData.allergies}
                onChange={(e) => setPatientData(prev => ({ ...prev, allergies: e.target.value }))}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-vertical"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Current Medications</Label>
              <div className="relative">
                <Pill className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="medications"
                  placeholder="List current medications with dosages and frequency"
                  value={patientData.medications}
                  onChange={(e) => setPatientData(prev => ({ ...prev, medications: e.target.value }))}
                  className="w-full pl-10 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-vertical"
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A temporary password will be generated for the patient</li>
                <li>• The patient will be able to change their password after first login</li>
                <li>• You will be assigned as their primary doctor</li>
                <li>• The patient will receive an email with login instructions</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? 'Registering Patient...' : 'Register Patient'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRegistration;