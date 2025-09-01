import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

    // Mock AI/Doctor response (in real app this would call the backend API)
    setTimeout(() => {
      let aiResponse = '';
      
      if (chatType === 'ai-doctor') {
        aiResponse = 'Based on the symptoms you\'ve described, I recommend considering the following treatment approaches. Would you like me to provide more specific guidance?';
      } else if (chatType === 'ai-patient') {
        aiResponse = 'I understand you might be feeling stressed. It\'s completely normal to have these feelings. Let\'s try some breathing exercises together. Would that help?';
      } else {
        aiResponse = 'Thank you for your message. I\'ll review this and get back to you shortly with my recommendations.';
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
    }, 1500);
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
          {chatType === 'ai-doctor' && <><Bot className="h-5 w-5 text-secondary" /><span>AI Medical Assistant</span></>}
          {chatType === 'ai-patient' && <><Bot className="h-5 w-5 text-secondary" /><span>AI Support</span></>}
          {chatType === 'doctor-patient' && (
            <>
              {user?.role === 'doctor' ? <User className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
              <span>{recipientName || 'Healthcare Provider'}</span>
            </>
          )}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3 rounded-lg ${getMessageStyle(message.sender)}`}>
              <div className="flex items-center space-x-2 mb-1">
                {getMessageIcon(message.sender)}
                <span className="text-xs font-medium opacity-75">
                  {message.senderName}
                </span>
                <span className="text-xs opacity-50">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs">Typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
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