import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useChatSessions';
import type { Database } from '@/integrations/supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatWindowProps {
  session: ChatSession | null;
  onSessionUpdate?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, onSessionUpdate }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages(session?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    const messageContent = newMessage;
    setNewMessage('');
    setIsLoading(true);

    // Send user message
    await sendMessage(messageContent, false);

    // Mock AI response (in a real app, this would call an AI service)
    setTimeout(async () => {
      let aiResponse = '';
      
      if (session.session_type === 'ai-doctor') {
        aiResponse = 'Based on the information provided, I recommend considering the following treatment approaches. Would you like me to provide more specific guidance on any particular aspect?';
      } else if (session.session_type === 'ai-patient') {
        aiResponse = 'I understand this can be challenging. It\'s completely normal to have these feelings. Let\'s work through this together. Would you like to try some relaxation techniques?';
      }

      await sendMessage(aiResponse, true);
      setIsLoading(false);
      onSessionUpdate?.();
    }, 1500);
  };

  const getMessageIcon = (message: Message) => {
    if (message.is_ai_message) {
      return <Bot className="h-4 w-4" />;
    } else if (message.sender_id === user?.id) {
      return <User className="h-4 w-4" />;
    } else {
      return <Stethoscope className="h-4 w-4" />;
    }
  };

  const getMessageStyle = (message: Message) => {
    if (message.sender_id === user?.id) {
      return 'bg-primary text-primary-foreground ml-12';
    } else if (message.is_ai_message) {
      return 'bg-secondary/20 text-secondary-foreground mr-12 border border-secondary/30';
    } else {
      return 'bg-muted text-muted-foreground mr-12';
    }
  };

  const getSenderName = (message: Message) => {
    if (message.is_ai_message) {
      return session?.session_type === 'ai-doctor' ? 'AI Assistant' : 'AI Support';
    } else if (message.sender_id === user?.id) {
      return 'You';
    } else {
      return user?.role === 'doctor' ? 'Patient' : 'Doctor';
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Welcome to Doc+ AI Assistant
          </h3>
          <p className="text-sm text-muted-foreground">
            Select a conversation or start a new one to begin chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          {session.session_type.includes('ai') ? (
            <div className="p-2 bg-secondary/20 text-secondary rounded-full">
              <Bot className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 bg-primary/20 text-primary rounded-full">
              <Stethoscope className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-card-foreground">
              {session.title || 'Chat Session'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {session.session_type === 'ai-doctor' && 'AI Medical Assistant'}
              {session.session_type === 'ai-patient' && 'AI Support Chat'}
              {session.session_type === 'doctor-patient' && (
                user?.role === 'doctor' ? 'Patient Communication' : 'Doctor Communication'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg ${getMessageStyle(message)}`}>
                <div className="flex items-center space-x-2 mb-1">
                  {getMessageIcon(message)}
                  <span className="text-xs font-medium opacity-75">
                    {getSenderName(message)}
                  </span>
                  <span className="text-xs opacity-50">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary/20 text-secondary-foreground p-3 rounded-lg mr-12 border border-secondary/30">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                  <span className="text-xs">AI is typing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="bg-primary hover:bg-primary-hover"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;