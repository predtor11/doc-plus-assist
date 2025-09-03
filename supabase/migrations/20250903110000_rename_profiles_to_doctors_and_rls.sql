-- Rename profiles table to doctors and update constraints, triggers, indexes, and RLS

-- 1) Rename table
ALTER TABLE public.profiles RENAME TO doctors;

-- 2) Update sequences/defaults are tied to columns, no change needed

-- 3) Update foreign keys in dependent tables (patients.assigned_doctor_id references profiles(user_id))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'patients'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'patients_assigned_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT patients_assigned_doctor_id_fkey;
  END IF;
END $$;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_assigned_doctor_id_fkey
  FOREIGN KEY (assigned_doctor_id)
  REFERENCES public.doctors(user_id)
  ON DELETE SET NULL;

-- 4) Rename unique index on registration_no if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'profiles_registration_no_unique_idx'
  ) THEN
    ALTER INDEX public.profiles_registration_no_unique_idx RENAME TO doctors_registration_no_unique_idx;
  END IF;
END $$;

-- 5) Ensure RLS is enabled on doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- 6) Drop old policies on profiles (if any lingering) and recreate on doctors
DO $$
BEGIN
  -- Drop profiles policies by name if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    -- best-effort drop known policy names
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  END IF;
END $$;

-- Drop any same-named policies on doctors to avoid conflicts when re-running
DROP POLICY IF EXISTS "Users can view all profiles" ON public.doctors;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.doctors;

-- Create doctors policies (mirroring previous profiles policies)
CREATE POLICY "Users can view all profiles" 
ON public.doctors 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.doctors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.doctors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 7) Update triggers referencing profiles
-- Rename trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_schema='public' AND event_object_table='profiles' AND trigger_name='update_profiles_updated_at'
  ) THEN
    DROP TRIGGER update_profiles_updated_at ON public.profiles;
  END IF;
END $$;

-- Create trigger on doctors for updated_at auto-update
DROP TRIGGER IF EXISTS update_doctors_updated_at ON public.doctors;
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Update the handle_new_user() function to insert into doctors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.doctors (user_id, username, name, registration_no)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NULLIF(NEW.raw_user_meta_data ->> 'registrationNo', '')
  );
  RETURN NEW;
END;
$$;

-- 9) Update RLS on patients and symptoms to reference doctors where needed
-- Patients policies already simplified to allow broad access; keeping as-is.
-- If any policy text references profiles, they must be recreated accordingly. None currently do.




