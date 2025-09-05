-- Add missing columns to patients table if they don't exist

-- Add address column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN address TEXT;
  END IF;
END $$;

-- Add emergency_contact_name column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'emergency_contact_name'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN emergency_contact_name TEXT;
  END IF;
END $$;

-- Add emergency_contact_phone column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'emergency_contact_phone'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN emergency_contact_phone TEXT;
  END IF;
END $$;

-- Add allergies column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'allergies'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN allergies TEXT;
  END IF;
END $$;

-- Add current_medications column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'current_medications'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN current_medications TEXT;
  END IF;
END $$;
