import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageCircle, Bot, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];

interface ConversationListProps {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  loading: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  loading,
}) => {
  const { user } = useAuth();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getSessionIcon = (sessionType: string) => {
    return sessionType.includes('ai') ? (
      <Bot className="h-4 w-4 text-secondary" />
    ) : (
      <MessageCircle className="h-4 w-4 text-primary" />
    );
  };

  const getSessionTitle = (session: ChatSession) => {
    if (session.title) return session.title;
    
    switch (session.session_type) {
      case 'ai-doctor':
        return 'AI Medical Assistant';
      case 'ai-patient':
        return 'AI Support Chat';
      case 'doctor-patient':
        return user?.role === 'doctor' ? 'Patient Chat' : 'Doctor Chat';
      default:
        return 'Chat Session';
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="h-6 bg-muted animate-pulse rounded mb-2"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-card-foreground">Conversations</h2>
          <Button
            onClick={onNewSession}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {user?.role === 'doctor' ? 'AI Assistant Sessions' : 'AI Support Sessions'}
        </p>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No conversations yet</p>
              <Button onClick={onNewSession} size="sm">
                Start New Chat
              </Button>
            </div>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all hover:shadow-sm ${
                  selectedSessionId === session.id
                    ? 'ring-2 ring-primary bg-accent/50'
                    : 'hover:bg-accent/20'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getSessionIcon(session.session_type)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {getSessionTitle(session)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.last_message_at || session.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 bg-secondary/20 text-secondary"
                      >
                        AI
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;