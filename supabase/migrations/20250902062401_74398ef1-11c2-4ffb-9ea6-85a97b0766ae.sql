-- Update database structure for proper chat functionality

-- Drop existing conversations table and recreate with better structure
DROP TABLE IF EXISTS public.conversations;

-- Create chat_sessions table for grouping messages
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_type TEXT NOT NULL CHECK (session_type IN ('ai-doctor', 'ai-patient', 'doctor-patient')),
  participant_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- For AI chat session titles
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for individual messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can view their chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Users can create chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

CREATE POLICY "Users can update their chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages from their sessions" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions 
    WHERE id = session_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their sessions" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions 
    WHERE id = session_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update session timestamp when new message is added
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update session timestamp on new messages
CREATE TRIGGER update_session_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_session_timestamp();

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_participants ON public.chat_sessions(participant_1_id, participant_2_id);
CREATE INDEX idx_chat_sessions_type ON public.chat_sessions(session_type);
CREATE INDEX idx_messages_session ON public.messages(session_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);