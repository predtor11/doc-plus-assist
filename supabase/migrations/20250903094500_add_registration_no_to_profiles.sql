-- Add registration_no column to profiles and update trigger to populate it

-- 1) Add nullable registration_no column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS registration_no TEXT;

-- 2) Add a uniqueness constraint for non-null values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'profiles_registration_no_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX profiles_registration_no_unique_idx
    ON public.profiles (registration_no)
    WHERE registration_no IS NOT NULL;
  END IF;
END $$;

-- 3) Update the handle_new_user trigger function to include registration_no
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role, name, registration_no)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NULLIF(NEW.raw_user_meta_data ->> 'registrationNo', '')
  );
  RETURN NEW;
END;
$$;


