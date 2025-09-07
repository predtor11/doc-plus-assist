import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions, useMessages } from '@/hooks/useChatSessions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];

const DoctorChat = () => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
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

  // Set up presence for typing indicator
  useEffect(() => {
    if (!currentSession || !user) return;

    const channel = supabase.channel(`typing_${currentSession.id}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const otherUsers = Object.keys(newState).filter(key => key !== user.id);
        const someoneTyping = otherUsers.some(key => {
          const presences = newState[key] as any[];
          return presences?.[0]?.is_typing === true;
        });
        setPartnerTyping(someoneTyping);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id && (newPresences as any)?.[0]?.is_typing) {
          setPartnerTyping(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== user.id) {
          setPartnerTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            user_id: user.id,
            is_typing: false 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, user?.id]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!currentSession || !user) return;
    
    const channel = supabase.channel(`typing_${currentSession.id}`);
    await channel.track({ 
      user_id: user.id,
      is_typing: typing 
    });
    setIsTyping(typing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      updateTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    const newTimeout = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
    
    setTypingTimeout(newTimeout);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    const messageContent = newMessage;
    setNewMessage('');
    
    // Stop typing indicator when sending
    updateTypingStatus(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    // Send user message
    await sendMessage(messageContent, false);
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

            {partnerTyping && (
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
                    <span className="text-xs">
                      {user?.role === 'doctor' ? 'Patient is typing...' : 'Dr. is typing...'}
                    </span>
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
              onChange={handleInputChange}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
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