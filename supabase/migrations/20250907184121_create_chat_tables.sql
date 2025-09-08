-- Create chat tables for doctor-patient communication

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_type TEXT NOT NULL CHECK (session_type IN ('doctor-patient', 'ai-doctor', 'ai-patient')),
    participant_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_ai_message BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON public.chat_sessions(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_type ON public.chat_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their chat sessions"
ON public.chat_sessions
FOR SELECT
USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can create chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can update their chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their sessions"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

CREATE POLICY "Users can insert messages in their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

CREATE POLICY "Users can update messages in their sessions"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Create function to update last_message_at
CREATE OR REPLACE FUNCTION update_chat_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_message_at when new message is inserted
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_last_message();
