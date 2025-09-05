-- Update handle_new_user to only create doctor records when registration number is provided
-- Patients should be created by doctors, not through self-registration

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    reg_no TEXT;
BEGIN
    reg_no := NULLIF(NEW.raw_user_meta_data ->> 'registrationNo', '');

    -- Only create doctor record if registration number is provided
    IF reg_no IS NOT NULL THEN
        INSERT INTO public.doctors (user_id, username, name, registration_no)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
            COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
            reg_no
        );
    END IF;

    RETURN NEW;
END;
$$;
