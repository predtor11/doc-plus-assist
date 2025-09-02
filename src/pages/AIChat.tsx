import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions } from '@/hooks/useChatSessions';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';

const AIChat = () => {
  const { user } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const sessionType = user?.role === 'doctor' ? 'ai-doctor' : 'ai-patient';
  const { sessions, loading, createSession, deleteSession, fetchSessions } = useChatSessions(sessionType);

  const selectedSession = sessions.find(session => session.id === selectedSessionId) || null;

  const handleNewSession = async () => {
    const title = user?.role === 'doctor' 
      ? 'New AI Medical Assistant Session' 
      : 'New AI Support Session';
    
    const newSession = await createSession(sessionType, title);
    if (newSession) {
      setSelectedSessionId(newSession.id);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
    }
  };

  const handleSessionUpdate = () => {
    fetchSessions();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <ConversationList
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        loading={loading}
      />
      <ChatWindow
        session={selectedSession}
        onSessionUpdate={handleSessionUpdate}
      />
    </div>
  );
};

export default AIChat;