-- Remove role column from profiles and update policies/triggers accordingly

-- 1) Drop policies that reference role
DROP POLICY IF EXISTS "Doctors can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can create patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can view all symptoms" ON public.symptoms;
DROP POLICY IF EXISTS "Doctors can create symptoms" ON public.symptoms;

-- 2) Alter table profiles to drop role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 3) Recreate simplified policies without role
-- Patients policies
CREATE POLICY "Users can view all patients"
ON public.patients
FOR SELECT
USING (true);

CREATE POLICY "Users can create patients"
ON public.patients
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update patients"
ON public.patients
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Symptoms policies
CREATE POLICY "Users can view all symptoms"
ON public.symptoms
FOR SELECT
USING (true);

CREATE POLICY "Users can create symptoms"
ON public.symptoms
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 4) Update handle_new_user trigger function to stop referencing role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  );
  RETURN NEW;
END;
$$;


