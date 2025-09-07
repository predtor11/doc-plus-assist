import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

export const useChatSessions = (sessionType?: string) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('chat_sessions')
        .select('*')
        .or(`participant_1_id.eq.${user.user_id},participant_2_id.eq.${user.user_id}`)
        .order('last_message_at', { ascending: false });

      if (sessionType) {
        query = query.eq('session_type', sessionType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionType: string, title?: string, participantId?: string) => {
    if (!user) return null;

    try {
      const sessionData = {
        session_type: sessionType,
        participant_1_id: user.user_id,
        participant_2_id: participantId || null,
        title: title || `New ${sessionType.replace('-', ' ')} session`,
      };

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user, sessionType]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    deleteSession,
  };
};

export const useMessages = (sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, isAiMessage = false) => {
    if (!sessionId) {
      console.error('No sessionId provided to sendMessage');
      return null;
    }

    console.log('sendMessage called with:', { content, isAiMessage, sessionId });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }

      const messageData = {
        session_id: sessionId,
        sender_id: user.id,
        content,
        is_ai_message: isAiMessage,
      };
      console.log('Inserting message data:', messageData);

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Database error inserting message:', error);
        throw error;
      }

      console.log('Message inserted successfully:', data);
      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  return {
    messages,
    loading,
    sendMessage,
    fetchMessages,
  };
};