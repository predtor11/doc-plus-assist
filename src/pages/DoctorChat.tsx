import React from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';

const DoctorChat = () => {
  const { user } = useAuth();
  
  const recipientName = user?.role === 'patient' ? 'Dr. Sarah Smith' : 'John Doe';
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {user?.role === 'doctor' ? 'Patient Communication' : 'Chat with Doctor'}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === 'doctor' 
            ? 'Communicate directly with your patients'
            : 'Secure messaging with your assigned healthcare provider'
          }
        </p>
      </div>
      
      <ChatInterface chatType="doctor-patient" recipientName={recipientName} />
    </div>
  );
};

export default DoctorChat;