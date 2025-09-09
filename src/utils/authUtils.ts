// Authentication utility functions
import { supabase } from '@/integrations/supabase/client';

export const clearAuthState = () => {
  console.log('🧹 Clearing all authentication state');
  
  // Clear localStorage items related to Supabase auth
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('🗑️ Removing localStorage key:', key);
    localStorage.removeItem(key);
  });
  
  // Clear any custom cache
  localStorage.removeItem('user-profile-cache');
  
  // Clear session storage as well
  sessionStorage.clear();
  
  console.log('✅ Authentication state cleared');
};

export const debugAuthState = async () => {
  console.log('🔍 Debug Auth State');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('📊 Current Auth State:', {
      sessionExists: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      error: error?.message,
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Code') ? 'VS Code' : 'Other',
      localStorage: {
        hasSupabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-')).length > 0,
        allKeys: Object.keys(localStorage)
      }
    });
    
    if (session?.user) {
      console.log('🧪 Testing database connectivity...');
      
      // Test basic database access
      try {
        const { data: testData, error: testError } = await supabase
          .from('doctors')
          .select('count')
          .limit(1);
          
        console.log('📊 Database connectivity test:', {
          success: !testError,
          error: testError?.message,
          data: testData
        });
      } catch (dbError) {
        console.error('❌ Database connectivity failed:', dbError);
      }
      
      console.log('👤 Checking user profiles...');
      // Check if user profile exists
      try {
        const { data: doctorProfile, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        const { data: patientProfile, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        console.log('👤 Profile Check Results:', {
          hasDoctorProfile: !!doctorProfile,
          hasPatientProfile: !!patientProfile,
          doctorError: doctorError?.message,
          patientError: patientError?.message,
          doctorProfile: doctorProfile ? { 
            id: doctorProfile.id, 
            name: doctorProfile.name,
            username: doctorProfile.username,
            registration_no: doctorProfile.registration_no
          } : null,
          patientProfile: patientProfile ? { 
            id: patientProfile.id, 
            name: patientProfile.name,
            age: patientProfile.age,
            gender: patientProfile.gender
          } : null
        });
        
        if (!doctorProfile && !patientProfile) {
          console.warn('⚠️ ISSUE FOUND: User has valid session but no profile in database!');
          console.warn('💡 This is likely why you are experiencing infinite loading');
          console.warn('🔧 Possible solutions:');
          console.warn('   1. Check if user registration completed properly');
          console.warn('   2. Verify database RLS policies allow profile access');
          console.warn('   3. Check if profiles were created during sign-up');
        }
        
      } catch (profileError) {
        console.error('❌ Error checking profiles:', profileError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug auth state:', error);
  }
};

export const forceAuthRefresh = async () => {
  console.log('🔄 Forcing auth refresh...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Auth refresh failed:', error);
      return false;
    }
    
    console.log('✅ Auth refresh successful:', {
      sessionExists: !!data.session,
      userId: data.session?.user?.id
    });
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during auth refresh:', error);
    return false;
  }
};

export const testDatabaseConnectivity = async () => {
  console.log('🧪 Testing database connectivity...');
  
  try {
    // Test 1: Simple count query
    console.log('📊 Test 1: Simple count query...');
    const countTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Count query timeout')), 3000);
    });
    
    try {
      const countQuery = supabase.from('doctors').select('count', { count: 'exact' });
      const countResult = await Promise.race([countQuery, countTimeout]);
      console.log('✅ Count query successful:', countResult);
    } catch (countError) {
      console.error('❌ Count query failed:', countError);
    }
    
    // Test 2: Simple select query
    console.log('📊 Test 2: Simple select query...');
    const selectTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Select query timeout')), 3000);
    });
    
    try {
      const selectQuery = supabase.from('doctors').select('id').limit(1);
      const selectResult = await Promise.race([selectQuery, selectTimeout]);
      console.log('✅ Select query successful:', selectResult);
    } catch (selectError) {
      console.error('❌ Select query failed:', selectError);
    }
    
    // Test 3: Current user session
    console.log('📊 Test 3: Current user session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session test:', { sessionExists: !!session, error: sessionError?.message });
    
    if (session?.user) {
      // Test 4: Specific user query
      console.log('📊 Test 4: User-specific query...');
      const userTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User query timeout')), 5000);
      });
      
      try {
        const userQuery = supabase
          .from('doctors')
          .select('*')
          .eq('user_id', session.user.id);
        const userResult = await Promise.race([userQuery, userTimeout]);
        console.log('✅ User query result:', userResult);
      } catch (userError) {
        console.error('❌ User query failed:', userError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error);
    return false;
  }
};

export const createMissingProfile = async () => {
  console.log('🛠️ Attempting to create missing user profile...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      console.error('❌ No valid session found');
      return false;
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    console.log('👤 Creating patient profile for user:', userId);
    
    // Try to create a basic patient profile as fallback
    const { data: newProfile, error: createError } = await supabase
      .from('patients')
      .insert({
        user_id: userId,
        name: userEmail?.split('@')[0] || 'User', // Use email prefix as name
        email: userEmail,
        age: null,
        gender: null,
        phone: null,
        medical_history: null,
        assigned_doctor_id: null
      })
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Failed to create patient profile:', createError);
      return false;
    }
    
    console.log('✅ Patient profile created successfully:', newProfile);
    return true;
    
  } catch (error) {
    console.error('❌ Error creating missing profile:', error);
    return false;
  }
};
