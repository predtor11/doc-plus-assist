-- Add trigger to create doctor profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY definer SET search_path = public
AS $$
BEGIN
  -- Only create doctor profile if registrationNo is provided
  IF NEW.raw_user_meta_data->>'registrationNo' IS NOT NULL THEN
    INSERT INTO public.doctors (user_id, username, name, registration_no)
    VALUES (
      NEW.id, 
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'registrationNo'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic doctor profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();