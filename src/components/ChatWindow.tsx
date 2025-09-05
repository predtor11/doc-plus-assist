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
  onNewSession?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, onSessionUpdate, onNewSession }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages(session?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const testLMStudioConnection = async () => {
    try {
      console.log('Testing LM Studio connection...');
      const response = await fetch(`/api/lm-studio/v1/models`, {
        method: 'GET',
      });
      console.log('LM Studio models endpoint response:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Available models:', data);
        return true;
      } else {
        console.error('Connection failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('LM Studio connection test failed:', error);
      return false;
    }
  };

  const handleTestConnection = async () => {
    setError(null); // Clear previous error
    const isConnected = await testLMStudioConnection();
    if (isConnected) {
      setError('✅ LM Studio connection successful! AI chat should work now.');
      setTimeout(() => setError(null), 3000); // Clear success message after 3 seconds
    } else {
      setError('❌ LM Studio connection failed. Check console for details and ensure LM Studio is running on 127.0.0.1:1234');
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Test LM Studio connection on component mount for AI sessions
    if (session?.session_type.includes('ai')) {
      testLMStudioConnection().then(isConnected => {
        if (!isConnected) {
          setError('LM Studio is not reachable. Please ensure LM Studio is running on 127.0.0.1:1234');
        }
      });
    }
  }, [session]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    console.log('Sending message:', newMessage);
    console.log('Current user:', user);
    console.log('Session:', session);

    const messageContent = newMessage;
    setNewMessage('');
    setIsLoading(true);
    setError(null); // Clear any previous errors

    // Send user message
    console.log('Calling sendMessage for user message...');
    const userMessage = await sendMessage(messageContent, false);
    console.log('User message result:', userMessage);

    try {
      // Prepare conversation history for context
      const conversationMessages = messages.map(msg => ({
        role: msg.is_ai_message ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Add the current user message
      conversationMessages.push({
        role: 'user',
        content: messageContent,
      });

      // Call LM Studio API
      console.log('Attempting to connect to LM Studio at:', `/api/lm-studio/v1/chat/completions`);
      console.log('Request payload:', {
        messages: conversationMessages,
        max_tokens: 500,
        temperature: 0.7,
      });
      
      const response = await fetch(`/api/lm-studio/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      console.log('LM Studio response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio error response:', errorText);
        throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('LM Studio response data:', data);
      const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

      await sendMessage(aiResponse, true);
      setError(null); // Clear error on successful response
    } catch (error) {
      console.error('Error calling LM Studio:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      const errorMessage = 'Sorry, I\'m having trouble connecting to the AI service. Please check that LM Studio is running and accessible at 127.0.0.1:1234. You can also use the "Test LM Studio" button to diagnose the connection.';
      await sendMessage(errorMessage, true);
    } finally {
      setIsLoading(false);
      onSessionUpdate?.();
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.is_ai_message) {
      return <Bot className="h-4 w-4" />;
    } else if (message.sender_id === user?.user_id) {
      return <User className="h-4 w-4" />;
    } else {
      return <Stethoscope className="h-4 w-4" />;
    }
  };

  const getMessageStyle = (message: Message) => {
    if (message.sender_id === user?.user_id) {
      return 'bg-primary text-primary-foreground ml-16';
    } else if (message.is_ai_message) {
      return 'bg-accent text-accent-foreground mr-16 border border-accent/30';
    } else {
      return 'bg-muted text-muted-foreground mr-16';
    }
  };

  const getSenderName = (message: Message) => {
    if (message.is_ai_message) {
      return session?.session_type === 'ai-doctor' ? 'AI Assistant' : 'AI Support';
    } else if (message.sender_id === user?.user_id) {
      return 'You';
    } else {
      return user?.role === 'doctor' ? 'Patient' : 'Doctor';
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Welcome to Doc+ AI Assistant
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Get instant help from our AI assistant. Start a conversation to begin.
          </p>
          {onNewSession && (
            <Button
              onClick={onNewSession}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Bot className="h-4 w-4 mr-2" />
              Start New Conversation
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
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
          {session.session_type.includes('ai') && (
            <Button
              onClick={handleTestConnection}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Test LM Studio
            </Button>
          )}
        </div>
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {(() => {
            console.log('Rendering messages:', messages);
            return null;
          })()}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.user_id ? 'justify-end' : 'justify-start'
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
              <div className="bg-accent text-accent-foreground p-3 rounded-lg mr-16 border border-accent/30">
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