import { supabase } from './client';
import type { Database } from './types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

export interface ChatAPIError {
  message: string;
  code?: string;
}

/**
 * Chat API functions for doctor-patient communication
 */
export class ChatAPI {
  /**
   * Fetch chat sessions for a specific patient
   */
  static async fetchPatientChatSessions(patientId: string): Promise<{ data: ChatSession[] | null; error: ChatAPIError | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`participant_1_id.eq.${patientId},participant_2_id.eq.${patientId}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: { message: 'Failed to fetch chat sessions', code: error.code }
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while fetching chat sessions' }
      };
    }
  }

  /**
   * Fetch chat session between doctor and patient
   */
  static async fetchDoctorPatientSession(doctorId: string, patientId: string): Promise<{ data: ChatSession | null; error: ChatAPIError | null }> {
    try {
      // Validate input parameters
      if (!doctorId || !patientId) {
        return {
          data: null,
          error: { message: 'Doctor ID and Patient ID are required' }
        };
      }

      console.log('Fetching doctor-patient chat session for:', { doctorId, patientId });

      // First try the new separate tables (using type assertion to bypass TypeScript)
      let { data, error } = await (supabase as any)
        .from('doctor_patient_chat_sessions')
        .select('*')
        .or(`and(doctor_id.eq.${doctorId},patient_id.eq.${patientId}),and(doctor_id.eq.${patientId},patient_id.eq.${doctorId})`)
        .single();

      // If new tables don't exist, fall back to existing chat_sessions with doctor-patient type
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('New doctor-patient tables not found, falling back to existing chat_sessions');
        const fallbackResult = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('session_type', 'doctor-patient')
          .or(`and(participant_1_id.eq.${doctorId},participant_2_id.eq.${patientId}),and(participant_1_id.eq.${patientId},participant_2_id.eq.${doctorId})`)
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Chat session fetch error:', error);
        return {
          data: null,
          error: { message: `Failed to fetch chat session: ${error.message}`, code: error.code }
        };
      }

      console.log('Chat session fetch result:', { data, error: error?.code });

      // Transform data if it came from new tables
      if (data && (data as any).doctor_id) {
        data = {
          id: (data as any).id,
          session_type: 'doctor-patient',
          participant_1_id: (data as any).doctor_id,
          participant_2_id: (data as any).patient_id,
          title: (data as any).title,
          last_message_at: (data as any).last_message_at,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at
        };
      }

      return { data: data as ChatSession || null, error: null };
    } catch (err) {
      console.error('Unexpected error fetching chat session:', err);
      return {
        data: null,
        error: { message: 'Network error while fetching chat session' }
      };
    }
  }

  /**
   * Create a new chat session between doctor and patient
   */
  static async createDoctorPatientSession(doctorId: string, patientId: string, title?: string): Promise<{ data: ChatSession | null; error: ChatAPIError | null }> {
    try {
      // Validate input parameters
      if (!doctorId || !patientId) {
        return {
          data: null,
          error: { message: 'Doctor ID and Patient ID are required' }
        };
      }

      if (doctorId === patientId) {
        return {
          data: null,
          error: { message: 'Doctor and patient cannot be the same user' }
        };
      }

      const sessionData = {
        doctor_id: doctorId,
        patient_id: patientId,
        title: title || 'Doctor-Patient Chat',
      };

      console.log('Creating doctor-patient chat session with data:', sessionData);

      // First try the new separate tables
      let { data, error } = await (supabase as any)
        .from('doctor_patient_chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      // If new tables don't exist, fall back to existing chat_sessions
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('New doctor-patient tables not found, falling back to existing chat_sessions');
        const fallbackData = {
          session_type: 'doctor-patient' as const,
          participant_1_id: doctorId,
          participant_2_id: patientId,
          title: title || 'Doctor-Patient Chat',
        };

        const fallbackResult = await supabase
          .from('chat_sessions')
          .insert(fallbackData)
          .select()
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Chat session creation error:', error);
        return {
          data: null,
          error: { message: `Failed to create chat session: ${error.message}`, code: error.code }
        };
      }

      console.log('Chat session created successfully:', data);

      // Transform data if it came from new tables
      if (data && (data as any).doctor_id) {
        data = {
          id: (data as any).id,
          session_type: 'doctor-patient',
          participant_1_id: (data as any).doctor_id,
          participant_2_id: (data as any).patient_id,
          title: (data as any).title,
          last_message_at: (data as any).last_message_at,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at
        };
      }

      return { data: data as ChatSession, error: null };
    } catch (err) {
      console.error('Unexpected error creating chat session:', err);
      return {
        data: null,
        error: { message: 'Network error while creating chat session' }
      };
    }
  }

  /**
   * Send a message in a chat session
   */
  static async sendMessage(sessionId: string, content: string, senderId: string): Promise<{ data: Message | null; error: ChatAPIError | null }> {
    try {
      // Validate message content
      const validation = this.validateMessageContent(content);
      if (!validation.valid) {
        return {
          data: null,
          error: { message: validation.error || 'Invalid message content' }
        };
      }

      const messageData = {
        session_id: sessionId,
        sender_id: senderId,
        content: content.trim(),
      };

      // First try the new separate messages table
      let { data, error } = await (supabase as any)
        .from('doctor_patient_messages')
        .insert(messageData)
        .select()
        .single();

      // If new table doesn't exist, fall back to existing messages table
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('New doctor-patient messages table not found, falling back to existing messages table');
        const fallbackData = {
          session_id: sessionId,
          sender_id: senderId,
          content: content.trim(),
          is_ai_message: false,
        };

        const fallbackResult = await supabase
          .from('messages')
          .insert(fallbackData)
          .select()
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Message send error:', error);
        return {
          data: null,
          error: { message: `Failed to send message: ${error.message}`, code: error.code }
        };
      }

      console.log('Message sent successfully:', data);
      return { data: data as Message, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while sending message' }
      };
    }
  }

  /**
   * Mark messages as read in a session
   */
  static async markMessagesAsRead(sessionId: string, userId: string): Promise<{ success: boolean; error: ChatAPIError | null }> {
    try {
      // First try the new separate messages table
      let { error } = await (supabase as any)
        .from('doctor_patient_messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      // If new table doesn't exist, fall back to existing messages table
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('New doctor-patient messages table not found, falling back to existing messages table');
        const fallbackResult = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('session_id', sessionId)
          .neq('sender_id', userId)
          .eq('is_read', false);

        error = fallbackResult.error;
      }

      if (error) {
        return {
          success: false,
          error: { message: 'Failed to mark messages as read', code: error.code }
        };
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: { message: 'Network error while marking messages as read' }
      };
    }
  }

  /**
   * Fetch unread message count for a user
   */
  static async getUnreadMessageCount(userId: string): Promise<{ count: number; error: ChatAPIError | null }> {
    try {
      // First get user's session IDs
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

      if (sessionError) {
        return {
          count: 0,
          error: { message: 'Failed to fetch sessions', code: sessionError.code }
        };
      }

      if (!sessions || sessions.length === 0) {
        return { count: 0, error: null };
      }

      const sessionIds = sessions.map(s => s.id);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', userId)
        .in('session_id', sessionIds);

      if (error) {
        return {
          count: 0,
          error: { message: 'Failed to fetch unread count', code: error.code }
        };
      }

      return { count: count || 0, error: null };
    } catch (err) {
      return {
        count: 0,
        error: { message: 'Network error while fetching unread count' }
      };
    }
  }

  /**
   * Validate message content
   */
  private static validateMessageContent(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Message content is required' };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > 2000) {
      return { valid: false, error: 'Message is too long (max 2000 characters)' };
    }

    // Basic XSS prevention - check for script tags
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Message contains potentially dangerous content' };
      }
    }

    return { valid: true };
  }

  /**
   * Delete a chat session (for doctors only)
   */
  static async deleteChatSession(sessionId: string, userId: string): Promise<{ success: boolean; error: ChatAPIError | null }> {
    try {
      // First check if user is a doctor and owns this session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        return {
          success: false,
          error: { message: 'Session not found', code: sessionError.code }
        };
      }

      // Check if user is a doctor
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (doctorError) {
        return {
          success: false,
          error: { message: 'Only doctors can delete chat sessions' }
        };
      }

      // Delete the session (this will cascade delete messages due to FK constraints)
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        return {
          success: false,
          error: { message: 'Failed to delete chat session', code: error.code }
        };
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: { message: 'Network error while deleting chat session' }
      };
    }
  }
}
