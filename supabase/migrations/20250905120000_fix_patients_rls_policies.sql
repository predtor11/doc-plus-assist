-- Fix RLS policies for patients table to reference doctors table instead of profiles

-- Drop existing policies on patients table
DROP POLICY IF EXISTS "Doctors can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view their own record" ON public.patients;
DROP POLICY IF EXISTS "Doctors can create patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON public.patients;

-- Recreate policies with correct references to doctors table
CREATE POLICY "Doctors can view all patients" 
ON public.patients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Patients can view their own record" 
ON public.patients 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Doctors can create patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can update patients" 
ON public.patients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE user_id = auth.uid()
  )
);

-- Also fix symptoms table policies if they reference profiles
DROP POLICY IF EXISTS "Doctors can view all symptoms" ON public.symptoms;
DROP POLICY IF EXISTS "Doctors can create symptoms" ON public.symptoms;

CREATE POLICY "Doctors can view all symptoms" 
ON public.symptoms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Doctors can create symptoms" 
ON public.symptoms 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE user_id = auth.uid()
  )
);
