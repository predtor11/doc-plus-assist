import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, User, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ChatWindow from '@/components/ChatWindow';
import DoctorPatientChatWindow from '@/components/DoctorPatientChatWindow';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import { ChatAPI } from '@/integrations/supabase/chat-api';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Patient = {
  id: string;
  name: string;
  age: number | null;
  email: string | null;
  phone: string | null;
  medical_history: string | null;
  created_at: string;
  user_id: string;
};

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];

interface DoctorPatientChatSession {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentSession, setCurrentSession] = useState<DoctorPatientChatSession | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Use the doctor-patient chat hook
  const {
    sessions: doctorPatientSessions,
    messages: doctorPatientMessages,
    loading: chatLoading,
    createSession: createDoctorPatientSession,
    markMessagesAsRead: markDoctorPatientMessagesAsRead,
  } = useDoctorPatientChat(currentSession?.id || null);

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
        .eq('assigned_doctor_id', user?.id) // Use auth user ID
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

  const fetchUnreadCounts = async () => {
    if (!user?.id || patients.length === 0) return;

    try {
      const counts: Record<string, number> = {};

      for (const patient of patients) {
        // Use patient.user_id (auth user ID) for chat session lookup
        // NOT patient.id (patients table primary key)
        const { data: session } = await ChatAPI.fetchDoctorPatientSession(user.id, patient.user_id);
        if (session) {
          // Get unread count for this specific session
          const { data: messages } = await (supabase as any)
            .from('doctor_patient_messages')
            .select('id')
            .eq('session_id', session.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          counts[patient.id] = messages?.length || 0; // Use patient.id for UI display key
        }
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  useEffect(() => {
    if (patients.length > 0 && user?.id) {
      fetchUnreadCounts();
    }
  }, [patients, user?.id]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handlePatientSelect = async (patient: Patient) => {
    console.log('=== PATIENT SELECT START ===');
    console.log('Selected patient:', patient);
    console.log('Current user:', user);
    console.log('User authenticated?', !!user);
    console.log('Doctor auth ID:', user?.id);
    console.log('Patient auth ID (user_id):', patient.user_id); // This is the auth user ID, NOT the patients table primary key
    console.log('Patient record ID (id):', patient.id); // This is just for display/UI purposes

    setSelectedPatient(patient);

    // Check if user is authenticated
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to start a chat.",
        variant: "destructive",
      });
      return;
    }

    try {
      // IMPORTANT: We use patient.user_id (auth user ID) for chat, NOT patient.id (patients table PK)
      // This is because chat tables reference auth.users(id) for security and RLS policies
      const { data: existingSession, error: fetchError } = await ChatAPI.fetchDoctorPatientSession(
        user.id, // Doctor's auth user ID
        patient.user_id // Patient's auth user ID (from patients.user_id field)
      );

      if (fetchError) {
        toast({
          title: "Error",
          description: fetchError.message,
          variant: "destructive",
        });
        return;
      }

      if (existingSession) {
        // Transform the session data to match our DoctorPatientChatSession interface
        const transformedSession: DoctorPatientChatSession = {
          id: existingSession.id,
          doctor_id: existingSession.participant_1_id || user.id,
          patient_id: existingSession.participant_2_id || patient.user_id,
          title: existingSession.title,
          last_message_at: existingSession.last_message_at,
          created_at: existingSession.created_at,
          updated_at: existingSession.updated_at,
        };
        setCurrentSession(transformedSession);

        // Mark messages as read using the new hook
        try {
          await markDoctorPatientMessagesAsRead();
        } catch (markError) {
          console.warn('Failed to mark messages as read:', markError);
        }

        // Refresh unread counts
        fetchUnreadCounts();
      } else {
        console.log('No existing session found, attempting to create new one...');
        console.log('Doctor ID:', user?.id);
        console.log('Patient ID:', patient.user_id);
        // Create new session
        const { data: newSession, error: createError } = await ChatAPI.createDoctorPatientSession(
          user?.id || '', // Doctor's auth user ID
          patient.user_id, // Patient's auth user ID
          `Chat with ${patient.name}`
        );

        console.log('Session creation result:', { newSession, createError });

        if (createError) {
          console.error('Session creation failed:', createError);
          toast({
            title: "Error",
            description: createError.message,
            variant: "destructive",
          });
          return;
        }

        if (newSession) {
          console.log('Session created successfully:', newSession);
          // Transform the session data to match our DoctorPatientChatSession interface
          const transformedSession: DoctorPatientChatSession = {
            id: newSession.id,
            doctor_id: newSession.participant_1_id || user.id,
            patient_id: newSession.participant_2_id || patient.user_id,
            title: newSession.title,
            last_message_at: newSession.last_message_at,
            created_at: newSession.created_at,
            updated_at: newSession.updated_at,
          };
          setCurrentSession(transformedSession);
          toast({
            title: "Chat Started",
            description: `Started a new conversation with ${patient.name}`,
          });
        } else {
          console.error('Session creation returned no data');
        }
      }
    } catch (error) {
      console.error('Error handling chat session:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewSession = async () => {
    console.log('handleNewSession called');
    console.log('Selected patient:', selectedPatient);
    console.log('Current user:', user);

    if (!selectedPatient) {
      toast({
        title: "No patient selected",
        description: "Please select a patient first.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating new session for patient:', selectedPatient.name);
      // Create new session for the selected patient
      const { data: newSession, error: createError } = await ChatAPI.createDoctorPatientSession(
        user?.id || '', // Doctor's auth user ID
        selectedPatient.user_id, // Patient's auth user ID
        `Chat with ${selectedPatient.name}`
      );

      console.log('New session creation result:', { newSession, createError });

      if (createError) {
        console.error('New session creation failed:', createError);
        toast({
          title: "Error",
          description: createError.message,
          variant: "destructive",
        });
        return;
      }

      if (newSession) {
        console.log('New session created successfully:', newSession);
        // Transform the session data to match our DoctorPatientChatSession interface
        const transformedSession: DoctorPatientChatSession = {
          id: newSession.id,
          doctor_id: newSession.participant_1_id || user.id,
          patient_id: newSession.participant_2_id || selectedPatient.user_id,
          title: newSession.title,
          last_message_at: newSession.last_message_at,
          created_at: newSession.created_at,
          updated_at: newSession.updated_at,
        };
        setCurrentSession(transformedSession);
        toast({
          title: "Chat Started",
          description: `Started a new conversation with ${selectedPatient.name}`,
        });
      } else {
        console.error('New session creation returned no data');
      }
    } catch (error) {
      console.error('Error creating new session:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`border-r bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out shadow-sm flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        {/* Fixed Sidebar Header */}
        <div className="flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Button
                  onClick={() => navigate('/register-patient')}
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 hover:bg-accent transition-colors duration-200 rounded-full"
                  title="Add Patient"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 hover:bg-accent transition-colors duration-200 rounded-full"
                  title="Expand Sidebar"
                >
                  <MessageCircle className="h-5 w-5 rotate-180" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-card-foreground">My Patients</h2>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => navigate('/register-patient')}
                    size="sm"
                    className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    Add Patient
                  </Button>
                  <Button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-accent transition-colors duration-200"
                  >
                    <MessageCircle className={`h-4 w-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Manage your patients and start conversations
              </p>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-background/50 border-border/50 focus:border-primary/50 transition-colors duration-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Patient List */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gradient-to-r from-muted/50 to-muted/30 animate-pulse rounded-lg border border-border/30"></div>
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-card-foreground mb-2">
                    {searchTerm ? 'No patients found' : 'No patients yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search' : 'Start by registering your first patient'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => navigate('/register-patient')}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <User className="h-3.5 w-3.5 mr-1.5" />
                      Register Patient
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPatients.map((patient, index) => (
                    <Card
                      key={patient.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-border/50 hover:border-primary/30 animate-in slide-in-from-left-2 ${
                        selectedPatient?.id === patient.id
                          ? 'ring-2 ring-primary bg-accent/50 shadow-md scale-[1.01]'
                          : 'hover:bg-accent/20'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-medium text-sm">
                              {getInitials(patient.name)}
                            </AvatarFallback>
                          </Avatar>
                          {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-sm truncate text-card-foreground">{patient.name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    Age: {patient.age || 'N/A'}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 ml-2">
                                  {unreadCounts[patient.id] > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs px-1.5 py-0.5 animate-pulse shadow-sm"
                                    >
                                      {unreadCounts[patient.id]}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-1.5 py-0.5 bg-success/20 text-success border-success/30"
                                  >
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                          {sidebarCollapsed && unreadCounts[patient.id] > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-1.5 py-0.5 absolute -top-1 -right-1 animate-pulse shadow-sm"
                            >
                              {unreadCounts[patient.id]}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPatient ? (
          <div className="flex-1 flex flex-col">
            {/* Fixed Chat Header */}
            <div className="flex-shrink-0 p-4 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-medium text-sm">
                      {getInitials(selectedPatient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Age: {selectedPatient.age || 'N/A'} • {selectedPatient.email || 'No email'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className="bg-success/20 text-success border-success/30"
                  >
                    Active
                  </Badge>
                  {unreadCounts[selectedPatient.id] > 0 && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse"
                    >
                      {unreadCounts[selectedPatient.id]} unread
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Chat Content */}
            <div className="flex-1 min-h-0">
              <DoctorPatientChatWindow
                session={currentSession}
                onSessionUpdate={() => {
                  // Refresh unread counts when session updates
                  fetchUnreadCounts();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px),
                                 radial-gradient(circle at 75% 75%, hsl(var(--primary)) 2px, transparent 2px)`,
                backgroundSize: '40px 40px'
              }} />
            </div>
            <div className="text-center max-w-md px-6 relative z-10">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg animate-in zoom-in-50 duration-500">
                <Stethoscope className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                Select a Patient
              </h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed animate-in slide-in-from-bottom-4 duration-500 delay-200">
                Choose a patient from the sidebar to start a conversation and provide personalized care.
              </p>
              <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                <Button
                  onClick={() => navigate('/register-patient')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Register New Patient
                </Button>
                <p className="text-xs text-muted-foreground">
                  Or select an existing patient to continue care
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;