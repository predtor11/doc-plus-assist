import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorPatientMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DoctorPatientChatSession {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useDoctorPatientChat = (sessionId: string | null) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DoctorPatientChatSession[]>([]);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all doctor-patient sessions for the current user
  const fetchSessions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('Fetching doctor-patient sessions for user:', user.id);

      const { data, error } = await (supabase as any)
        .from('doctor_patient_chat_sessions')
        .select('*')
        .or(`doctor_id.eq.${user.id},patient_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching doctor-patient sessions:', error);
        if (error.code === '42P01') {
          console.warn('Doctor-patient chat tables do not exist yet');
          setSessions([]);
        } else {
          throw error;
        }
      } else {
        console.log('Doctor-patient sessions fetched successfully:', data?.length || 0, 'sessions');
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error fetching doctor-patient sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific session
  const fetchMessages = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching doctor-patient messages for session:', sessionId);

      const { data, error } = await (supabase as any)
        .from('doctor_patient_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching doctor-patient messages:', error);
        if (error.code === '42P01') {
          console.warn('Doctor-patient messages table does not exist yet');
          setMessages([]);
        } else {
          throw error;
        }
      } else {
        console.log('Doctor-patient messages fetched successfully:', data?.length || 0, 'messages');
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching doctor-patient messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Create a new doctor-patient chat session
  const createSession = async (doctorId: string, patientId: string, title?: string) => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      console.log('Creating doctor-patient session:', { doctorId, patientId, title });

      const sessionData = {
        doctor_id: doctorId,
        patient_id: patientId,
        title: title || 'Doctor-Patient Chat',
      };

      const { data, error } = await (supabase as any)
        .from('doctor_patient_chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating doctor-patient session:', error);
        
        // If session already exists (unique constraint violation), try to find it
        if (error.code === '23505') { // unique_violation
          console.log('Session already exists, trying to find it...');
          const { data: existingData, error: fetchError } = await (supabase as any)
            .from('doctor_patient_chat_sessions')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .single();
            
          if (fetchError) {
            console.error('Error fetching existing session:', fetchError);
            throw fetchError;
          }
          
          console.log('Found existing session:', existingData);
          return existingData;
        }
        
        if (error.code === '42P01') {
          throw new Error('Doctor-patient chat functionality is not available yet. Please contact support.');
        }
        throw error;
      }

      console.log('Doctor-patient session created successfully:', data);
      await fetchSessions(); // Refresh sessions list
      return data;
    } catch (error) {
      console.error('Error creating doctor-patient session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send a message in a doctor-patient chat
  const sendMessage = async (content: string) => {
    if (!sessionId || !user?.id) {
      console.error('Missing sessionId or user for sending message');
      return null;
    }

    try {
      setLoading(true);
      console.log('Sending doctor-patient message:', { sessionId, content, senderId: user.id });

      const messageData = {
        session_id: sessionId,
        sender_id: user.id,
        content: content.trim(),
      };

      const { data, error } = await (supabase as any)
        .from('doctor_patient_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending doctor-patient message:', error);
        if (error.code === '42P01') {
          throw new Error('Doctor-patient chat functionality is not available yet. Please contact support.');
        }
        throw error;
      }

      console.log('Doctor-patient message sent successfully:', data);
      setMessages(prev => [...prev, data]); // Add to local state
      return data;
    } catch (error) {
      console.error('Error sending doctor-patient message:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!sessionId || !user?.id) return;

    try {
      console.log('Marking doctor-patient messages as read:', { sessionId, userId: user.id });

      const { error } = await (supabase as any)
        .from('doctor_patient_messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking doctor-patient messages as read:', error);
        if (error.code !== '42P01') {
          throw error;
        }
      } else {
        console.log('Doctor-patient messages marked as read successfully');
        // Update local state
        setMessages(prev =>
          prev.map(msg =>
            msg.sender_id !== user.id && !msg.is_read
              ? { ...msg, is_read: true }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error marking doctor-patient messages as read:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  return {
    sessions,
    messages,
    loading,
    fetchSessions,
    fetchMessages,
    createSession,
    sendMessage,
    markMessagesAsRead,
  };
};
