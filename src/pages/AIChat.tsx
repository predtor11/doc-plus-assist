import React, { useState, useEffect } from 'react';
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

  // Auto-create session if none exists
  useEffect(() => {
    console.log('AIChat useEffect:', { sessions: sessions.length, loading, user: !!user, selectedSessionId });
    if (!loading && sessions.length === 0 && user) {
      console.log('Auto-creating session...');
      handleNewSession();
    } else if (!selectedSessionId && sessions.length > 0) {
      console.log('Auto-selecting session:', sessions[0].id);
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, loading, user, selectedSessionId]);

  const handleNewSession = async () => {
    const title = user?.role === 'doctor' 
      ? 'Chat with AI Assistant' 
      : 'Talk to AI Support';
    
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
        onNewSession={handleNewSession}
      />
    </div>
  );
};

export default AIChat;