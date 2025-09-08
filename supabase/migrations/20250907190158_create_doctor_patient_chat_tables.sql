-- Create separate tables for doctor-patient chat to avoid conflicts with AI chat

-- Create doctor_patient_chat_sessions table
CREATE TABLE IF NOT EXISTS public.doctor_patient_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, patient_id)
);

-- Create doctor_patient_messages table
CREATE TABLE IF NOT EXISTS public.doctor_patient_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.doctor_patient_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dp_chat_sessions_doctor_patient ON public.doctor_patient_chat_sessions(doctor_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_dp_messages_session_id ON public.doctor_patient_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_dp_messages_sender_id ON public.doctor_patient_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dp_messages_created_at ON public.doctor_patient_messages(created_at);

-- Enable RLS
ALTER TABLE public.doctor_patient_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for doctor_patient_chat_sessions
CREATE POLICY "Doctors and patients can view their chat sessions"
ON public.doctor_patient_chat_sessions
FOR SELECT
USING (
  auth.uid() = doctor_id OR auth.uid() = patient_id
);

CREATE POLICY "Doctors and patients can create chat sessions"
ON public.doctor_patient_chat_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = doctor_id OR auth.uid() = patient_id
);

CREATE POLICY "Doctors and patients can update their chat sessions"
ON public.doctor_patient_chat_sessions
FOR UPDATE
USING (
  auth.uid() = doctor_id OR auth.uid() = patient_id
);

-- Create RLS policies for doctor_patient_messages
CREATE POLICY "Doctors and patients can view messages in their sessions"
ON public.doctor_patient_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions
    WHERE id = session_id
    AND (doctor_id = auth.uid() OR patient_id = auth.uid())
  )
);

CREATE POLICY "Doctors and patients can insert messages in their sessions"
ON public.doctor_patient_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions
    WHERE id = session_id
    AND (doctor_id = auth.uid() OR patient_id = auth.uid())
  )
);

CREATE POLICY "Doctors and patients can update messages in their sessions"
ON public.doctor_patient_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_chat_sessions
    WHERE id = session_id
    AND (doctor_id = auth.uid() OR patient_id = auth.uid())
  )
);

-- Create function to update last_message_at for doctor-patient chats
CREATE OR REPLACE FUNCTION update_doctor_patient_chat_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.doctor_patient_chat_sessions
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_message_at when new message is inserted
CREATE TRIGGER trigger_update_dp_last_message
  AFTER INSERT ON public.doctor_patient_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_patient_chat_session_last_message();
