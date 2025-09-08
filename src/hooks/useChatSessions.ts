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
    if (!sessionId) {
      console.log('fetchMessages: No sessionId provided');
      return;
    }

    console.log('fetchMessages: Fetching messages for session:', sessionId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('fetchMessages: Error fetching messages:', error);
        throw error;
      }
      
      console.log('fetchMessages: Retrieved', data?.length || 0, 'messages from database');
      setMessages(data || []);
    } catch (error) {
      console.error('fetchMessages: Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, isAiMessage = false, onSuccess?: () => void) => {
    if (!sessionId) {
      console.error('No sessionId provided to sendMessage');
      return null;
    }

    console.log('sendMessage called with:', { 
      content: content.substring(0, 100) + '...', 
      isAiMessage, 
      sessionId,
      contentLength: content.length,
      hasContent: !!content
    });

    // Verify session exists
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('Session validation failed:', { sessionError, sessionData, sessionId });
        return null;
      }
      console.log('Session validated successfully');
    } catch (sessionCheckError) {
      console.error('Error validating session:', sessionCheckError);
      return null;
    }

    try {
      let userId = null;
      
      if (!isAiMessage) {
        // Only get authenticated user for non-AI messages
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('Auth user result:', { user: user?.id, error: authError });
        if (authError) {
          console.error('Auth error:', authError);
          return null;
        }
        if (!user) {
          console.error('No authenticated user found');
          return null;
        }
        userId = user.id;
      }

      const messageData = {
        session_id: sessionId,
        sender_id: userId, // null for AI messages, user.id for regular messages
        content,
        is_ai_message: isAiMessage,
      };
      console.log('Inserting message data:', messageData);
      console.log('Message content length:', content.length);
      console.log('Is AI message:', isAiMessage);
      console.log('User ID:', userId);
      console.log('Session ID:', sessionId);

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error inserting message:', {
          error,
          messageData,
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        
        // Check for specific RLS policy errors
        if (error.code === '42501' || error.message?.includes('policy')) {
          console.error('🔒 RLS Policy Error: This might be due to missing or incorrect row-level security policies');
          console.error('💡 Suggested fix: Check if the messages RLS policy allows AI messages (sender_id = null)');
        }
        
        throw error;
      }

      console.log('✅ Message inserted successfully:', data);
      console.log('Message details:', {
        id: data.id,
        is_ai_message: data.is_ai_message,
        sender_id: data.sender_id,
        content_length: data.content.length,
        session_id: data.session_id
      });
      
      setMessages(prev => {
        console.log('📝 IMMEDIATE STATE UPDATE - Updating messages state, previous count:', prev.length);
        
        // Check if this message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === data.id);
        if (messageExists) {
          console.log('⚠️ Message already exists in state, skipping duplicate');
          return prev;
        }
        
        const newMessages = [...prev, data];
        console.log('📝 IMMEDIATE STATE UPDATE - New messages count:', newMessages.length);
        console.log('📝 IMMEDIATE STATE UPDATE - Adding message:', {
          id: data.id,
          is_ai: data.is_ai_message,
          sender: data.sender_id,
          preview: data.content.substring(0, 50) + '...'
        });
        
        // Force re-render by returning new array reference
        const finalMessages = [...newMessages];
        
        // Call success callback if provided
        if (onSuccess) {
          setTimeout(() => onSuccess(), 50);
        }
        
        return finalMessages;
      });
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('useMessages useEffect triggered, sessionId:', sessionId);
    if (sessionId) {
      console.log('Fetching initial messages for session:', sessionId);
      fetchMessages();
    } else {
      console.log('No sessionId, clearing messages');
      setMessages([]);
    }
  }, [sessionId]);

  // Disable automatic refetching to prevent state override
  // Only fetch messages on initial load or manual refresh
  const refreshMessages = () => {
    if (sessionId) {
      fetchMessages();
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    fetchMessages,
    refreshMessages,
  };
};