import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions, useMessages } from '@/hooks/useChatSessions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Stethoscope } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];

const DoctorChat = () => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get or create the continuous doctor-patient chat session
  const { sessions, createSession } = useChatSessions('doctor-patient');
  const currentSession = sessions[0] || null;

  const { messages, sendMessage } = useMessages(currentSession?.id || null);

  // Create session if it doesn't exist
  useEffect(() => {
    if (sessions.length === 0) {
      createSession('doctor-patient', 'Doctor-Patient Communication');
    }
  }, [sessions.length, createSession]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    const messageContent = newMessage;
    setNewMessage('');
    setIsLoading(true);

    // Send user message
    await sendMessage(messageContent, false);

    // Mock response from the other party (in a real app, this would be real-time)
    setTimeout(async () => {
      const response = user?.role === 'doctor' 
        ? 'Thank you for your message, Doctor. I appreciate your care and guidance.'
        : 'Thank you for reaching out. I\'ll review your message and get back to you with my recommendations.';
      
      // This would normally come from the other user, but for demo we'll simulate it
      await sendMessage(response, false);
      setIsLoading(false);
    }, 2000);
  };

  const getMessageStyle = (message: Message) => {
    if (message.sender_id === user?.id) {
      return 'bg-primary text-primary-foreground ml-12';
    } else {
      return 'bg-muted text-muted-foreground mr-12';
    }
  };

  const getSenderName = (message: Message) => {
    if (message.sender_id === user?.id) {
      return 'You';
    } else {
      return user?.role === 'doctor' ? 'Patient' : 'Dr. Sarah Smith';
    }
  };

  const getSenderIcon = (message: Message) => {
    if (message.sender_id === user?.id) {
      return user?.role === 'doctor' ? (
        <Stethoscope className="h-4 w-4" />
      ) : (
        <User className="h-4 w-4" />
      );
    } else {
      return user?.role === 'doctor' ? (
        <User className="h-4 w-4" />
      ) : (
        <Stethoscope className="h-4 w-4" />
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
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

      <Card className="h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 text-primary rounded-full">
              {user?.role === 'doctor' ? (
                <User className="h-5 w-5" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">
                {user?.role === 'doctor' ? 'Patient Communication' : 'Dr. Sarah Smith'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Continuous chat - your conversation continues from where you left off
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
                    {getSenderIcon(message)}
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
                <div className="bg-muted text-muted-foreground p-3 rounded-lg mr-12">
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
                    <span className="text-xs">Typing...</span>
                  </div>
                </div>
              </div>
            )}
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
      </Card>
    </div>
  );
};

export default DoctorChat;