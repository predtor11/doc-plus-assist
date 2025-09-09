import { useState, useEffect, useCallback } from 'react';

export interface LMStudioStatus {
  isRunning: boolean;
  isConnected: boolean;
  version?: string;
  models?: string[];
  error?: string;
  lastChecked?: Date;
}

export const useLMStudio = () => {
  const [status, setStatus] = useState<LMStudioStatus>({
    isRunning: false,
    isConnected: false,
  });

  const [isChecking, setIsChecking] = useState(false);

  // Check if LM Studio is running locally
  const checkLMStudioStatus = useCallback(async () => {
    setIsChecking(true);

    try {
      console.log('🔍 Checking LM Studio status...');

      // Try to connect to LM Studio's models endpoint
      const response = await fetch('http://127.0.0.1:1234/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ LM Studio is running:', data);

        setStatus({
          isRunning: true,
          isConnected: true,
          version: data.version || 'Unknown',
          models: data.data?.map((model: any) => model.id) || [],
          lastChecked: new Date(),
        });

        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log('❌ LM Studio not accessible:', error);

      setStatus({
        isRunning: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      });

      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Send a chat completion request to LM Studio
  const sendChatCompletion = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    model: string = 'local-model'
  ) => {
    if (!status.isConnected) {
      throw new Error('LM Studio is not connected. Please ensure LM Studio is running on 127.0.0.1:1234');
    }

    try {
      console.log('🚀 Sending chat completion to LM Studio...');

      const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: false,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ LM Studio response received:', data);

      return data;
    } catch (error) {
      console.error('❌ LM Studio chat completion failed:', error);
      throw error;
    }
  }, [status.isConnected]);

  // Auto-check LM Studio status on mount
  useEffect(() => {
    checkLMStudioStatus();

    // Set up periodic checking every 30 seconds
    const interval = setInterval(() => {
      checkLMStudioStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkLMStudioStatus]);

  return {
    status,
    isChecking,
    checkLMStudioStatus,
    sendChatCompletion,
  };
};
