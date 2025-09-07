import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorPatient {
  sessionId: string;
  patientId: string;
  patientName: string;
  lastMessageAt: string | null;
  status: 'Active' | 'Needs attention' | 'Stable';
}

export const useDoctorPatients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorPatients = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      
      // Get chat sessions where the doctor is a participant
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          last_message_at,
          session_type
        `)
        .eq('session_type', 'doctor-patient')
        .or(`participant_1_id.eq.${user.user_id},participant_2_id.eq.${user.user_id}`);

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setPatients([]);
        return;
      }

      // Get patient IDs (the other participant in each session)
      const patientIds = sessions.map(session => 
        session.participant_1_id === user.user_id 
          ? session.participant_2_id 
          : session.participant_1_id
      ).filter(Boolean);

      if (patientIds.length === 0) {
        setPatients([]);
        return;
      }

      // Fetch patient details
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, user_id')
        .in('user_id', patientIds);

      if (patientsError) throw patientsError;

      // Combine session and patient data
      const doctorPatients: DoctorPatient[] = sessions.map(session => {
        const patientUserId = session.participant_1_id === user.user_id 
          ? session.participant_2_id 
          : session.participant_1_id;
        
        const patient = patientsData?.find(p => p.user_id === patientUserId);
        
        // Determine status based on last message time
        let status: 'Active' | 'Needs attention' | 'Stable' = 'Stable';
        if (session.last_message_at) {
          const lastMessage = new Date(session.last_message_at);
          const now = new Date();
          const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 1) {
            status = 'Active';
          } else if (hoursDiff < 24) {
            status = 'Needs attention';
          }
        }

        return {
          sessionId: session.id,
          patientId: patient?.id || '',
          patientName: patient?.name || 'Unknown Patient',
          lastMessageAt: session.last_message_at,
          status
        };
      }).filter(p => p.patientName !== 'Unknown Patient');

      setPatients(doctorPatients);
    } catch (err) {
      console.error('Error fetching doctor patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorPatients();
  }, [user]);

  return {
    patients,
    loading,
    error,
    refetch: fetchDoctorPatients,
  };
};