import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface DoctorProfile {
  id: string;
  user_id: string;
  username: string;
  name: string;
  registration_no?: string | null;
}

interface PatientProfile {
  id: string;
  user_id: string | null;
  name: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  medical_history?: string | null;
  assigned_doctor_id?: string | null;
}

interface AuthUser {
  id: string;
  user_id: string;
  username?: string;
  name: string;
  email?: string;
  role: 'doctor' | 'patient';
  registration_no?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  medical_history?: string | null;
  assigned_doctor_id?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData: { username: string; name: string; registrationNo?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Try to fetch doctor profile first
          const { data: doctorProfile } = await supabase
            .from('doctors')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (doctorProfile) {
            setUser({
              id: session.user.id, // Auth user ID
              user_id: doctorProfile.id, // Profile record ID
              username: doctorProfile.username,
              name: doctorProfile.name,
              email: session.user.email,
              role: 'doctor',
              registration_no: doctorProfile.registration_no,
            });
          } else {
            // Try to fetch patient profile
            const { data: patientProfile } = await supabase
              .from('patients')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (patientProfile) {
              setUser({
                id: session.user.id, // Auth user ID
                user_id: patientProfile.id, // Profile record ID
                name: patientProfile.name,
                email: session.user.email || patientProfile.email,
                role: 'patient',
                age: patientProfile.age,
                gender: patientProfile.gender,
                phone: patientProfile.phone,
                medical_history: patientProfile.medical_history,
                assigned_doctor_id: patientProfile.assigned_doctor_id,
              });
            } else {
              setUser(null);
            }
          }
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Try to fetch doctor profile first
        supabase
          .from('doctors')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(async ({ data: doctorProfile }) => {
            if (doctorProfile) {
              setUser({
                id: session.user.id, // Auth user ID
                user_id: doctorProfile.id, // Profile record ID
                username: doctorProfile.username,
                name: doctorProfile.name,
                email: session.user.email,
                role: 'doctor',
                registration_no: doctorProfile.registration_no,
              });
            } else {
              // Try to fetch patient profile
              const { data: patientProfile } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (patientProfile) {
                setUser({
                  id: session.user.id, // Auth user ID
                  user_id: patientProfile.id, // Profile record ID
                  name: patientProfile.name,
                  email: session.user.email || patientProfile.email,
                  role: 'patient',
                  age: patientProfile.age,
                  gender: patientProfile.gender,
                  phone: patientProfile.phone,
                  medical_history: patientProfile.medical_history,
                  assigned_doctor_id: patientProfile.assigned_doctor_id,
                });
              }
            }
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { username: string; name: string; registrationNo?: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signUp, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};