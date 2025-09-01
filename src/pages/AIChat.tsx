import React from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';

const AIChat = () => {
  const { user } = useAuth();
  
  const chatType = user?.role === 'doctor' ? 'ai-doctor' : 'ai-patient';
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {user?.role === 'doctor' ? 'AI Medical Assistant' : 'AI Support Chat'}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === 'doctor' 
            ? 'Get AI-powered insights for patient treatment and diagnosis'
            : 'Chat with our AI for emotional support and stress relief'
          }
        </p>
      </div>
      
      <ChatInterface chatType={chatType} />
    </div>
  );
};

export default AIChat;