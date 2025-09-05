import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Calendar, ArrowLeft, MapPin, UserCheck, AlertTriangle, Pill } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const RegisterPatient = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    medicalHistory: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    currentMedications: ''
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

    console.log('=== PATIENT REGISTRATION START ===');
    console.log('Form data at submission:', patientData);

    try {
      console.log('Starting patient registration...', { patientData, doctorId: user.user_id });

      // First, create a Supabase auth user for the patient
      const tempPassword = Math.random().toString(36).slice(-12) + 'Temp123!';
      console.log('Creating auth user with email:', patientData.email);

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: patientData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: patientData.name,
          isPatient: true,
          doctorId: user.user_id
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      console.log('Auth user created:', authData.user);

      // Now create the patient record in the patients table
      const patientInsertData = {
        user_id: authData.user!.id,
        name: patientData.name,
        email: patientData.email,
        phone: patientData.phone,
        age: patientData.age ? parseInt(patientData.age) : null,
        gender: patientData.gender,
        medical_history: patientData.medicalHistory,
        address: patientData.address,
        emergency_contact_name: patientData.emergencyContactName,
        emergency_contact_phone: patientData.emergencyContactPhone,
        allergies: patientData.allergies,
        current_medications: patientData.currentMedications,
        assigned_doctor_id: user.user_id
      };

      console.log('Inserting patient data:', patientInsertData);
      console.log('Individual field values:', {
        address: patientData.address,
        emergencyContactName: patientData.emergencyContactName,
        emergencyContactPhone: patientData.emergencyContactPhone,
        allergies: patientData.allergies,
        currentMedications: patientData.currentMedications
      });

      // Test the database connection and permissions
      console.log('Testing database permissions...');
      const { data: permissionTestData, error: permissionTestError } = await supabase
        .from('patients')
        .select('count')
        .limit(1);

      if (permissionTestError) {
        console.error('Database permission test failed:', permissionTestError);
        throw new Error(`Database permission error: ${permissionTestError.message}`);
      }

      console.log('Database permissions OK, proceeding with insert...');

      // Test database connection first
      console.log('Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      console.log('Database connection successful, proceeding with insert...');

      // Verify database schema
      console.log('Verifying database schema...');
      const { data: schemaTest, error: schemaError } = await supabase
        .from('patients')
        .select('address, emergency_contact_name, allergies, current_medications')
        .limit(1);

      if (schemaError) {
        console.error('Schema verification failed:', schemaError);
        console.error('This might indicate missing database columns');
      } else {
        console.log('Schema verification successful - columns exist');
      }

      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .insert(patientInsertData)
        .select()
        .single();

      if (patientError) {
        console.error('Patient creation error:', patientError);
        console.error('Error details:', {
          message: patientError.message,
          details: patientError.details,
          hint: patientError.hint,
          code: patientError.code
        });
        // If patient creation fails, delete the auth user
        await supabase.auth.admin.deleteUser(authData.user!.id);
        throw patientError;
      }

      console.log('Patient record created successfully:', patientRecord);
      console.log('Final patient data in database:', {
        id: patientRecord.id,
        address: patientRecord.address,
        emergency_contact_name: patientRecord.emergency_contact_name,
        emergency_contact_phone: patientRecord.emergency_contact_phone,
        allergies: patientRecord.allergies,
        current_medications: patientRecord.current_medications
      });

      // Check if all data was saved correctly
      const expectedFields = ['address', 'emergency_contact_name', 'emergency_contact_phone', 'allergies', 'current_medications'];
      const missingFields = expectedFields.filter(field => !patientRecord[field]);
      
      if (missingFields.length > 0) {
        console.warn('WARNING: Some fields were not saved:', missingFields);
        console.log('Expected vs Actual:', {
          expected: {
            address: patientData.address,
            emergency_contact_name: patientData.emergencyContactName,
            emergency_contact_phone: patientData.emergencyContactPhone,
            allergies: patientData.allergies,
            current_medications: patientData.currentMedications
          },
          actual: {
            address: patientRecord.address,
            emergency_contact_name: patientRecord.emergency_contact_name,
            emergency_contact_phone: patientRecord.emergency_contact_phone,
            allergies: patientRecord.allergies,
            current_medications: patientRecord.current_medications
          }
        });
      } else {
        console.log('✅ All fields saved successfully!');
      }

      toast({
        title: "Patient registered successfully",
        description: `Patient account created. Temporary password: ${tempPassword}`,
      });

      // Reset form
      setPatientData({
        name: '',
        email: '',
        phone: '',
        age: '',
        gender: '',
        medicalHistory: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        allergies: '',
        currentMedications: ''
      });

      navigate('/patients');
    } catch (error: any) {
      console.error('Error registering patient:', error);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register patient",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
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
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter patient's full name"
                      value={patientData.name}
                      onChange={(e) => setPatientData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
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
                <Label htmlFor="medical-history">Medical History</Label>
                <textarea
                  id="medical-history"
                  placeholder="Enter any relevant medical history, current conditions, etc..."
                  value={patientData.medicalHistory}
                  onChange={(e) => setPatientData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-vertical"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="Patient's address"
                    value={patientData.address}
                    onChange={(e) => setPatientData(prev => ({ ...prev, address: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency-contact-name">Emergency Contact Name</Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency-contact-name"
                      type="text"
                      placeholder="Emergency contact name"
                      value={patientData.emergencyContactName}
                      onChange={(e) => setPatientData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency-contact-phone">Emergency Contact Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency-contact-phone"
                      type="tel"
                      placeholder="Emergency contact phone"
                      value={patientData.emergencyContactPhone}
                      onChange={(e) => setPatientData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="allergies"
                    placeholder="List any known allergies..."
                    value={patientData.allergies}
                    onChange={(e) => setPatientData(prev => ({ ...prev, allergies: e.target.value }))}
                    className="w-full pl-10 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-vertical"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-medications">Current Medications</Label>
                <div className="relative">
                  <Pill className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="current-medications"
                    placeholder="List current medications and dosages..."
                    value={patientData.currentMedications}
                    onChange={(e) => setPatientData(prev => ({ ...prev, currentMedications: e.target.value }))}
                    className="w-full pl-10 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-vertical"
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
              
              {/* Debug button to check form state */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  console.log('=== FORM DEBUG ===');
                  console.log('Current form state:', patientData);
                  console.log('Form field checks:', {
                    hasAddress: !!patientData.address?.trim(),
                    hasEmergencyName: !!patientData.emergencyContactName?.trim(),
                    hasEmergencyPhone: !!patientData.emergencyContactPhone?.trim(),
                    hasAllergies: !!patientData.allergies?.trim(),
                    hasMedications: !!patientData.currentMedications?.trim()
                  });
                  alert(`Form Data Check:\nAddress: ${patientData.address || 'EMPTY'}\nEmergency Name: ${patientData.emergencyContactName || 'EMPTY'}\nEmergency Phone: ${patientData.emergencyContactPhone || 'EMPTY'}\nAllergies: ${patientData.allergies || 'EMPTY'}\nMedications: ${patientData.currentMedications || 'EMPTY'}`);
                }}
              >
                Debug: Check Form Data
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPatient;
