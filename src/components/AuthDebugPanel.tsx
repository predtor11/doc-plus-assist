import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearAuthState, debugAuthState, forceAuthRefresh, createMissingProfile, testDatabaseConnectivity } from '@/utils/authUtils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const AuthDebugPanel: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [debugOutput, setDebugOutput] = useState<string>('');

  const handleDebugAuth = async () => {
    console.clear();
    await debugAuthState();
    setDebugOutput('Check browser console for detailed debug info');
  };

  const handleClearAuth = async () => {
    try {
      await logout();
      clearAuthState();
      setDebugOutput('Authentication state cleared. Please refresh the page.');
    } catch (error) {
      console.error('Error clearing auth:', error);
      setDebugOutput('Error clearing auth state');
    }
  };

  const handleForceRefresh = async () => {
    const success = await forceAuthRefresh();
    setDebugOutput(success ? 'Auth refresh successful' : 'Auth refresh failed');
  };

  const handleFixInfiniteLoading = async () => {
    console.log('🔧 Fixing infinite loading...');
    
    if (session?.user?.id && !user) {
      console.log('🔄 Session exists but no user profile - reloading profile');
      try {
        // Try to manually load the profile
        const { data: doctorProfile } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (doctorProfile) {
          console.log('👨‍⚕️ Found doctor profile');
          setDebugOutput('Found doctor profile - infinite loading should be fixed');
          return;
        }

        const { data: patientProfile } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (patientProfile) {
          console.log('🏥 Found patient profile');
          setDebugOutput('Found patient profile - infinite loading should be fixed');
          return;
        }

        setDebugOutput('No profile found for authenticated user - this may be the issue');
      } catch (error) {
        console.error('Error checking profiles:', error);
        setDebugOutput('Error checking user profiles');
      }
    } else {
      setDebugOutput('No infinite loading detected or already resolved');
    }
  };

  const handleCreateMissingProfile = async () => {
    const success = await createMissingProfile();
    if (success) {
      setDebugOutput('Patient profile created successfully. Please refresh the page.');
    } else {
      setDebugOutput('Failed to create patient profile. Check console for details.');
    }
  };

  const handleTestDatabase = async () => {
    setDebugOutput('Running database connectivity tests... Check console for details.');
    await testDatabaseConnectivity();
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Code')) return 'VS Code';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-destructive">
          🔧 Authentication Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <strong>Browser:</strong> {getBrowserInfo()}
          </div>
          <div>
            <strong>Session:</strong> {session ? '✅ Active' : '❌ None'}
          </div>
          <div>
            <strong>User:</strong> {user ? `${user.name} (${user.role})` : '❌ None'}
          </div>
          <div>
            <strong>User ID:</strong> {user?.user_id || 'None'}
          </div>
          <div>
            <strong>Loading State:</strong> {/* We don't have access to isLoading here */}
          </div>
          <div>
            <strong>Auth Issue:</strong> {session && !user ? '⚠️ Stuck Loading' : '✅ OK'}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleDebugAuth}
          >
            Debug Auth State
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleTestDatabase}
          >
            Test Database
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleForceRefresh}
          >
            Force Refresh
          </Button>
          
          {session && !user && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleFixInfiniteLoading}
            >
              Fix Infinite Loading
            </Button>
          )}
          
          {session && !user && (
            <Button 
              size="sm" 
              variant="default"
              onClick={handleCreateMissingProfile}
            >
              Create Missing Profile
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="destructive"
            onClick={handleClearAuth}
          >
            Clear Auth & Logout
          </Button>
        </div>
        
        {debugOutput && (
          <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
            {debugOutput}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <strong>Tips for Chrome issues:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Clear browser cookies for localhost:8081</li>
            <li>Open Chrome DevTools → Application → Storage → Clear storage</li>
            <li>Try incognito mode to test without cached data</li>
            <li>Check if Chrome is blocking localStorage/cookies</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugPanel;
