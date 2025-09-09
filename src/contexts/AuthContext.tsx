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
    console.log('🏁 AuthContext: Initializing auth state');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthContext: Auth state changed:', { 
          event, 
          sessionExists: !!session,
          userId: session?.user?.id,
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
        });
        
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email);
        } else {
          console.log('📝 No session, clearing user and stopping loading');
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session with timeout protection
    const checkInitialSession = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('⏰ Session check timeout - stopping loading state');
          setIsLoading(false);
        }, 10000); // 10 second timeout
        
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('❌ Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        console.log('📊 Initial session check result:', { 
          sessionExists: !!session,
          userId: session?.user?.id,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        });
        
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email);
        } else {
          console.log('📝 No initial session found');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Unexpected error checking session:', error);
        setIsLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string, email?: string) => {
    try {
      console.log('👤 Loading user profile for:', userId);
      console.log('📧 Email:', email);
      
      // Set a timeout to prevent infinite loading on profile fetch
      const timeoutId = setTimeout(() => {
        console.warn('⏰ Profile loading timeout - stopping loading state');
        setUser(null);
        setIsLoading(false);
      }, 8000); // 8 second timeout
      
      console.log('🔍 Querying doctors table...');
      // Try to fetch doctor profile first with explicit error handling and timeout
      const doctorQuery = supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      console.log('📊 Doctor query created, executing...');
      
      // Add a race condition with our own timeout for the query
      const queryTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000);
      });
      
      let doctorProfile, doctorError;
      try {
        const result = await Promise.race([doctorQuery, queryTimeout]);
        // TypeScript workaround - we know this is the query result
        const queryResult = result as { data: any; error: any };
        doctorProfile = queryResult.data;
        doctorError = queryResult.error;
      } catch (timeoutError) {
        console.error('❌ Doctor query timed out:', timeoutError);
        doctorError = timeoutError;
      }
      
      console.log('📋 Doctor query result:', {
        hasData: !!doctorProfile,
        error: doctorError?.message,
        errorCode: doctorError?.code,
        errorDetails: doctorError?.details,
        timedOut: doctorError?.message?.includes('timeout')
      });

      if (doctorProfile && !doctorError) {
        console.log('👨‍⚕️ Doctor profile loaded successfully:', {
          id: doctorProfile.id,
          name: doctorProfile.name,
          username: doctorProfile.username
        });
        clearTimeout(timeoutId);
        setUser({
          ...doctorProfile,
          email: email,
          role: 'doctor',
        });
        setIsLoading(false);
        return;
      }

      console.log('🔍 Doctor profile not found, checking for patient profile...');
      console.log('📊 Patient query executing...');

      // Try to fetch patient profile with explicit error handling and timeout
      const patientQuery = supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      // Add a race condition with our own timeout for the patient query
      const patientQueryTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Patient query timeout after 5 seconds')), 5000);
      });
      
      let patientProfile, patientError;
      try {
        const result = await Promise.race([patientQuery, patientQueryTimeout]);
        // TypeScript workaround - we know this is the query result
        const queryResult = result as { data: any; error: any };
        patientProfile = queryResult.data;
        patientError = queryResult.error;
      } catch (timeoutError) {
        console.error('❌ Patient query timed out:', timeoutError);
        patientError = timeoutError;
      }
      
      console.log('📋 Patient query result:', {
        hasData: !!patientProfile,
        error: patientError?.message,
        errorCode: patientError?.code,
        errorDetails: patientError?.details,
        timedOut: patientError?.message?.includes('timeout')
      });
      
      clearTimeout(timeoutId);

      if (patientProfile && !patientError) {
        console.log('🏥 Patient profile loaded successfully:', {
          id: patientProfile.id,
          name: patientProfile.name
        });
        setUser({
          ...patientProfile,
          email: email || patientProfile.email,
          role: 'patient',
          username: patientProfile.name,
        });
        setIsLoading(false);
        return;
      }

      // If we get here, no profile was found
      console.warn('⚠️ No profile found for user:', userId, {
        doctorError: doctorError?.message,
        patientError: patientError?.message,
        possibleCauses: [
          'User profile not created in database',
          'RLS (Row Level Security) blocking access',
          'Network connectivity issue',
          'Database permission problem'
        ]
      });
      
      // Even if no profile is found, stop loading to prevent infinite state
      setUser(null);
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Unexpected error loading user profile:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setUser(null);
      setIsLoading(false);
    }
  };

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