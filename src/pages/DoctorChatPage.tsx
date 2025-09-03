import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, Stethoscope, Search, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useChatSessions';

interface Patient {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  status: 'online' | 'offline' | 'away';
  avatar?: string;
}

const DoctorChatPage = () => {
  const { user } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mock patients data - in real app this would come from API
  const [patients] = useState<Patient[]>([
    {
      id: '1',
      name: 'John Doe',
      lastMessage: 'Thank you for the consultation, Doctor.',
      lastMessageTime: new Date(Date.now() - 30 * 60000),
      unreadCount: 2,
      status: 'online',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      lastMessage: 'I have some questions about my medication.',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60000),
      unreadCount: 1,
      status: 'away',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: '3',
      name: 'Michael Brown',
      lastMessage: 'The symptoms have improved significantly.',
      lastMessageTime: new Date(Date.now() - 24 * 60 * 60000),
      unreadCount: 0,
      status: 'offline',
      avatar: '/api/placeholder/32/32'
    },
  ]);

  const { messages, loading, sendMessage } = useMessages(selectedPatientId);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPatientId) return;
    
    await sendMessage(newMessage);
    setNewMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getMessageAlignment = (senderId: string) => {
    return senderId === user?.id ? 'justify-end' : 'justify-start';
  };

  const getMessageStyle = (senderId: string) => {
    return senderId === user?.id
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Patients List - Creative Sidebar */}
      <div className="w-80 border-r bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Your Patients</span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="space-y-2 p-4">
            {filteredPatients.map((patient) => (
              <Card
                key={patient.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                  selectedPatientId === patient.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedPatientId(patient.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={patient.avatar} />
                        <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(patient.status)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">{patient.name}</h3>
                        {patient.unreadCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {patient.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      {patient.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {patient.lastMessage}
                        </p>
                      )}
                      
                      {patient.lastMessageTime && (
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {patient.lastMessageTime.toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedPatient ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={selectedPatient.avatar} />
                      <AvatarFallback>{selectedPatient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(selectedPatient.status)}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedPatient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">{selectedPatient.status}</p>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${getMessageAlignment(message.sender_id || '')}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${getMessageStyle(message.sender_id || '')}`}>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-75">
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <CardContent className="border-t bg-card p-4">
              <div className="flex space-x-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={loading || !newMessage.trim()}
                  className="px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Patient</h3>
              <p className="text-muted-foreground">Choose a patient from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorChatPage;