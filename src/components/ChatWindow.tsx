import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Stethoscope, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useChatSessions';
import { supabase } from '@/integrations/supabase/client';
import { ChatAPI } from '@/integrations/supabase/chat-api';
import { useToast } from '@/hooks/use-toast';
import { OpenRouterService } from '@/services/openRouterService';
import type { Database } from '@/integrations/supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatWindowProps {
  session: ChatSession | null;
  onSessionUpdate?: () => void;
  onNewSession?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, onSessionUpdate, onNewSession }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, sendMessage, fetchMessages } = useMessages(session?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when session changes or new messages arrive
  useEffect(() => {
    if (session?.id && user?.id && messages.length > 0) {
      const markAsRead = async () => {
        const { error } = await ChatAPI.markMessagesAsRead(session.id, user.user_id);
        if (error) {
        }
      };
      markAsRead();
    }
  }, [session?.id, user?.id, messages.length]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`messages:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          // Refetch messages to ensure consistency
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    if (!user?.id) {
      setError('You must be logged in to send messages.');
      return;
    }

    const messageContent = newMessage;
    setNewMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Use the hook's sendMessage function to send the user message and update local state
      const sentMessage = await sendMessage(messageContent, false); // false = not AI message

      if (!sentMessage) {
        toast({
          title: "Failed to send message",
          description: "Could not send message. Please try again.",
          variant: "destructive",
        });
        setNewMessage(messageContent);
        setIsLoading(false);
        return;
      }

      // Generate AI response if this is an AI session
      if (session.session_type.includes('ai')) {
        try {
          const aiResult = await OpenRouterService.generateDoctorResponse(
            messageContent,
            messages, // Pass conversation history
            session.session_type
          );

          if (aiResult.success && aiResult.response) {
            // Send AI response using the hook's sendMessage function
            await sendMessage(aiResult.response, true); // true marks it as AI message
          } else {
            setError(`AI Response Error: ${aiResult.error}`);
          }
        } catch (aiError) {
          setError('Failed to generate AI response. Please try again.');
        }
      }

      // Only set loading to false after everything is complete
      setIsLoading(false);
      onSessionUpdate?.();

    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to send message. Please check your connection and try again.",
        variant: "destructive",
      });
      setNewMessage(messageContent);
      setIsLoading(false);
    }
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
    // This function is no longer used since we handle styling in JSX
    return '';
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
        <div className="text-center max-w-md">
          <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Select a Patient to Start Chatting
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Choose a patient from the sidebar to begin a conversation and provide care.
          </p>
          {onNewSession && (
            <Button
              onClick={onNewSession}
              className="bg-primary hover:bg-primary-hover"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Start New Chat
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              {session.session_type.includes('ai') ? (
                <Bot className="h-6 w-6 text-blue-500" />
              ) : (
                <Stethoscope className="h-6 w-6 text-green-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {session.session_type === 'ai-patient' 
                  ? 'Talk to AI Support' 
                  : session.session_type === 'ai-doctor'
                    ? 'AI Medical Assistant'
                    : session.title || 'Chat Session'
                }
              </h3>
              <p className="text-sm text-gray-500">
                {session.session_type === 'ai-patient' && 'AI Support Chat'}
                {session.session_type === 'ai-doctor' && 'AI Medical Assistant'}
                {session.session_type === 'doctor-patient' && (
                  user?.role === 'doctor' ? 'Patient Communication' : 'Doctor Communication'
                )}
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {session.session_type === 'ai-patient' 
                  ? "I'm here to provide emotional support and stress relief. How are you feeling today?"
                  : "Ask me anything about medical cases, treatments, or patient care."
                }
              </p>
            </div>
          )}
          
          {messages.map((message) => {
            const isUserMessage = message.sender_id === user?.id && !message.is_ai_message;
            const isAIMessage = message.is_ai_message;
            
            return (
              <div
                key={message.id}
                className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${
                  isUserMessage ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isUserMessage
                      ? 'bg-blue-500 text-white'
                      : isAIMessage
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-green-500 text-white'
                  }`}>
                    {getMessageIcon(message)}
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col ${
                    isUserMessage ? 'items-end' : 'items-start'
                  }`}>
                    {/* Sender Name & Time */}
                    <div className={`flex items-center space-x-2 mb-1 ${
                      isUserMessage ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <span className="text-sm font-medium text-gray-700">
                        {getSenderName(message)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isUserMessage
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : isAIMessage
                          ? 'bg-gray-100 text-gray-800 rounded-bl-md'
                          : 'bg-green-100 text-green-800 rounded-bl-md'
                    }`}>
                      {isAIMessage ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-700 prose-pre:bg-gray-200 prose-pre:text-gray-900">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-[80%]">
                {/* AI Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>

                {/* Typing Indicator */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {session.session_type === 'ai-patient' ? 'AI Support' : 'AI Assistant'}
                    </span>
                  </div>
                  
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-100 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-2">AI is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 border-gray-200 rounded-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 rounded-full w-12 h-12 p-0 shadow-sm"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;