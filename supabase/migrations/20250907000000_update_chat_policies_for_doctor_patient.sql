-- Update chat policies for doctor-patient restrictions and add is_read to messages

-- Add is_read column to messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update chat_sessions policies to restrict doctor-patient chats
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their chat sessions" ON public.chat_sessions;

-- New policies for chat_sessions
CREATE POLICY "Users can view their chat sessions"
ON public.chat_sessions
FOR SELECT
USING (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);

CREATE POLICY "Users can create chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (
  -- For doctor-patient sessions, ensure doctor is assigned to patient
  CASE
    WHEN session_type = 'doctor-patient' THEN
      (participant_1_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.doctors d
        JOIN public.patients p ON p.assigned_doctor_id = d.user_id
        WHERE d.user_id = auth.uid() AND p.user_id = participant_2_id
      )) OR
      (participant_2_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.doctors d
        JOIN public.patients p ON p.assigned_doctor_id = d.user_id
        WHERE d.user_id = participant_1_id AND p.user_id = auth.uid()
      ))
    ELSE
      -- For AI chats, allow any user to create
      participant_1_id = auth.uid() OR participant_2_id = auth.uid()
  END
);

CREATE POLICY "Users can update their chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);

-- Update messages policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their sessions" ON public.messages;

-- New policies for messages
CREATE POLICY "Users can view messages from their sessions"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.uid() OR cs.participant_2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.uid() OR cs.participant_2_id = auth.uid())
  )
);

-- Add policy for updating is_read (mark as read)
CREATE POLICY "Users can update message read status in their sessions"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.uid() OR cs.participant_2_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id
    AND (cs.participant_1_id = auth.uid() OR cs.participant_2_id = auth.uid())
  )
);
