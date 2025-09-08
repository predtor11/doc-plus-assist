-- Allow patients to create their own records for auto-registration

-- Update the INSERT policy to allow patients to create their own records
DROP POLICY IF EXISTS "Doctors can create patients" ON public.patients;

CREATE POLICY "Doctors can create patients and patients can create their own records"
ON public.patients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors
    WHERE user_id = auth.uid()
  ) OR auth.uid() = user_id
);
