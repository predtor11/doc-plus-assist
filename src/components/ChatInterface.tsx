import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OpenRouterService } from '@/services/openRouterService';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'doctor' | 'patient';
  timestamp: Date;
  senderName?: string;
}

interface ChatInterfaceProps {
  chatType: 'ai-doctor' | 'ai-patient' | 'doctor-patient';
  recipientName?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatType, recipientName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Mock initial messages based on chat type
  useEffect(() => {
    let initialMessages: Message[] = [];
    
    if (chatType === 'ai-doctor') {
      initialMessages = [
        {
          id: '1',
          content: 'Hello Doctor! I\'m your AI medical assistant. How can I help you with patient care today?',
          sender: 'ai',
          timestamp: new Date(Date.now() - 60000),
          senderName: 'AI Assistant'
        }
      ];
    } else if (chatType === 'ai-patient') {
      initialMessages = [
        {
          id: '1',
          content: 'Hi there! I\'m here to provide emotional support and stress relief. How are you feeling today?',
          sender: 'ai',
          timestamp: new Date(Date.now() - 60000),
          senderName: 'AI Support'
        }
      ];
    } else if (chatType === 'doctor-patient') {
      initialMessages = [
        {
          id: '1',
          content: 'Hello! How can I help you today?',
          sender: user?.role === 'doctor' ? 'patient' : 'doctor',
          timestamp: new Date(Date.now() - 3600000),
          senderName: recipientName || 'Healthcare Provider'
        }
      ];
    }
    
    setMessages(initialMessages);
  }, [chatType, user?.role, recipientName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
      senderName: user?.name || 'You'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    // Generate AI response using OpenRouter
    let aiResponse = '';

    try {
      const aiResult = await OpenRouterService.generateDoctorResponse(
        newMessage,
        [], // For now, no conversation history in this component
        chatType
      );

      if (aiResult.success && aiResult.response) {
        aiResponse = aiResult.response;
      } else {
        console.error('AI response generation failed:', aiResult.error);
        aiResponse = 'I apologize, but I\'m having trouble generating a response right now. Please try again in a moment.';
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      aiResponse = 'I apologize, but I\'m experiencing technical difficulties. Please try again later.';
    }

    const responseMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: aiResponse,
      sender: chatType.includes('ai') ? 'ai' : (user?.role === 'doctor' ? 'patient' : 'doctor'),
      timestamp: new Date(),
      senderName: chatType.includes('ai') ?
        (chatType === 'ai-doctor' ? 'AI Assistant' : 'AI Support') :
        recipientName || 'Healthcare Provider'
    };

    setMessages(prev => [...prev, responseMessage]);
    setIsLoading(false);
  };

  const getMessageIcon = (sender: string) => {
    switch (sender) {
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'doctor':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getMessageStyle = (sender: string) => {
    if (sender === 'user') {
      return 'bg-primary text-primary-foreground ml-12';
    } else if (sender === 'ai') {
      return 'bg-secondary text-secondary-foreground mr-12';
    } else {
      return 'bg-muted text-muted-foreground mr-12';
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card">
        <h3 className="font-semibold flex items-center space-x-2">
          {chatType === 'ai-doctor' ? (
            <>
              <Bot className="h-5 w-5 text-secondary" />
              <span>AI Medical Assistant</span>
            </>
          ) : chatType === 'ai-patient' ? (
            <>
              <Bot className="h-5 w-5 text-secondary" />
              <span>AI Support</span>
            </>
          ) : (
            <>
              {user?.role === 'doctor' ? <User className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
              <span>{recipientName || 'Healthcare Provider'}</span>
            </>
          )}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg">No messages yet. Start the conversation!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {chatType === 'ai-doctor' ? 'Ask me anything about medical cases, treatments, or patient care.' :
                 chatType === 'ai-patient' ? 'I\'m here to provide emotional support and stress relief.' :
                 'Start a conversation with your healthcare provider.'}
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.sender === 'user' ? 'justify-end space-x-reverse' : 'justify-start'
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground order-2'
                  : message.sender === 'ai'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {getMessageIcon(message.sender)}
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col space-y-1 max-w-[70%] ${
                message.sender === 'user' ? 'items-end order-1' : 'items-start'
              }`}>
                {/* Sender Name */}
                <div className={`text-xs font-medium text-muted-foreground px-1 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.senderName}
                </div>

                {/* Message Content */}
                <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : message.sender === 'ai'
                      ? 'bg-accent text-accent-foreground rounded-bl-md border border-accent/20'
                      : 'bg-muted text-muted-foreground rounded-bl-md'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Timestamp */}
                <div className={`text-xs text-muted-foreground px-1 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3 justify-start">
              {/* AI Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>

              {/* Typing Indicator */}
              <div className="flex flex-col space-y-1 max-w-[70%] items-start">
                <div className="text-xs font-medium text-muted-foreground px-1">
                  {chatType === 'ai-doctor' ? 'AI Assistant' : 'AI Support'}
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-accent text-accent-foreground border border-accent/20 shadow-sm">
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
                    <span className="text-sm text-muted-foreground">AI is typing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;