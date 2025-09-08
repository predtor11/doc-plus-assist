-- Fix RLS policy for messages table to allow AI messages (sender_id = null)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can send messages to their sessions" ON public.messages;

-- Create new policy that allows both user messages and AI messages
CREATE POLICY "Users can send messages to their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  (sender_id = auth.uid() OR sender_id IS NULL)
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
