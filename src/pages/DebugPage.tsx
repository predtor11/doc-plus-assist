import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { debugAuthState, clearAuthState } from '@/utils/authUtils';

const DebugPage: React.FC = () => {
  const [info, setInfo] = useState<any>({});

  const collectDebugInfo = () => {
    const browserInfo = {
      userAgent: navigator.userAgent,
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
               navigator.userAgent.includes('Code') ? 'VS Code' : 'Other',
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      localStorage: {
        available: typeof Storage !== 'undefined',
        keys: Object.keys(localStorage),
        supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
      },
      sessionStorage: {
        available: typeof sessionStorage !== 'undefined',
        keys: Object.keys(sessionStorage)
      },
      location: {
        href: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol
      }
    };

    setInfo(browserInfo);
    console.log('🔍 Debug Info:', browserInfo);
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('🔗 Testing Supabase connection...');
      const { data, error } = await supabase.from('doctors').select('count').limit(1);
      console.log('✅ Supabase connection test:', { data, error });
    } catch (error) {
      console.error('❌ Supabase connection error:', error);
    }
  };

  const handleClearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 All storage cleared');
    collectDebugInfo();
  };

  useEffect(() => {
    collectDebugInfo();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Browser Info</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Browser:</strong> {info.browser}</div>
                  <div><strong>Platform:</strong> {info.platform}</div>
                  <div><strong>Cookies:</strong> {info.cookieEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>Origin:</strong> {info.location?.origin}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Storage Info</h3>
                <div className="text-sm space-y-1">
                  <div><strong>localStorage:</strong> {info.localStorage?.available ? '✅ Available' : '❌ Not Available'}</div>
                  <div><strong>Total keys:</strong> {info.localStorage?.keys?.length || 0}</div>
                  <div><strong>Supabase keys:</strong> {info.localStorage?.supabaseKeys?.length || 0}</div>
                  <div><strong>sessionStorage:</strong> {info.sessionStorage?.available ? '✅ Available' : '❌ Not Available'}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={collectDebugInfo} variant="outline" size="sm">
                Refresh Info
              </Button>
              <Button onClick={() => debugAuthState()} variant="outline" size="sm">
                Debug Auth
              </Button>
              <Button onClick={testSupabaseConnection} variant="outline" size="sm">
                Test Supabase
              </Button>
              <Button onClick={handleClearAllStorage} variant="destructive" size="sm">
                Clear All Storage
              </Button>
            </div>

            {info.localStorage?.supabaseKeys?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Supabase Keys in localStorage:</h4>
                <div className="bg-muted p-2 rounded text-xs font-mono">
                  {info.localStorage.supabaseKeys.map((key: string) => (
                    <div key={key}>{key}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
              <strong>Chrome Troubleshooting Steps:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Open Chrome DevTools (F12)</li>
                <li>Go to Application tab → Storage</li>
                <li>Click "Clear storage" for this site</li>
                <li>Try using incognito mode</li>
                <li>Check if Chrome is blocking third-party cookies</li>
                <li>Disable Chrome extensions temporarily</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugPage;
