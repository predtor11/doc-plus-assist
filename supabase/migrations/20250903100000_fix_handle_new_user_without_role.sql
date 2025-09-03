    -- Fix handle_new_user to match current profiles schema (no role column)

    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
    INSERT INTO public.profiles (user_id, username, name, registration_no)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
        NULLIF(NEW.raw_user_meta_data ->> 'registrationNo', '')
    );
    RETURN NEW;
    END;
    $$;


