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
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className={`border-r bg-card transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-card-foreground">My Patients</h2>
            )}
            <Button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
          {!sidebarCollapsed && (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Select a patient to start chatting
              </p>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No patients found</p>
                {!searchTerm && (
                  <Button onClick={() => navigate('/register-patient')} size="sm">
                    Register Patient
                  </Button>
                )}
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <Card
                  key={patient.id}
                  className={`cursor-pointer transition-all hover:shadow-sm ${
                    selectedPatient?.id === patient.id
                      ? 'ring-2 ring-primary bg-accent/50'
                      : 'hover:bg-accent/20'
                  }`}
                  onClick={() => handlePatientSelect(patient)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(patient.name)}
                        </AvatarFallback>
                      </Avatar>
                      {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-sm truncate">{patient.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                Age: {patient.age || 'N/A'}
                              </p>
                            </div>
                            {unreadCounts[patient.id] > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-1.5 py-0.5 ml-2"
                              >
                                {unreadCounts[patient.id]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {sidebarCollapsed && unreadCounts[patient.id] > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-xs px-1.5 py-0.5 absolute -top-1 -right-1"
                        >
                          {unreadCounts[patient.id]}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 bg-success/20 text-success"
                      >
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedPatient ? (
          <DoctorPatientChatWindow
            session={currentSession}
            onSessionUpdate={() => {
              // Refresh unread counts when session updates
              fetchUnreadCounts();
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center max-w-md">
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Select a Patient
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a patient from the sidebar to start a conversation and provide care.
              </p>
              <Button onClick={() => navigate('/register-patient')} className="bg-primary hover:bg-primary-hover">
                <User className="h-4 w-4 mr-2" />
                Register New Patient
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;