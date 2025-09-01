import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MessageCircle, Bot, Stethoscope, Search, Filter } from 'lucide-react';

const History = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  // Mock conversation history
  const conversations = [
    {
      id: '1',
      type: 'ai',
      participant: 'AI Assistant',
      date: '2024-01-15',
      time: '14:30',
      lastMessage: 'Based on the symptoms, I recommend...',
      messageCount: 12,
      status: 'completed'
    },
    {
      id: '2',
      type: 'doctor',
      participant: user?.role === 'doctor' ? 'John Doe' : 'Dr. Sarah Smith',
      date: '2024-01-14',
      time: '16:45',
      lastMessage: 'Please continue with the prescribed medication.',
      messageCount: 8,
      status: 'active'
    },
    {
      id: '3',
      type: 'ai',
      participant: 'AI Support',
      date: '2024-01-13',
      time: '09:15',
      lastMessage: 'Remember to practice the breathing exercises we discussed.',
      messageCount: 15,
      status: 'completed'
    },
    {
      id: '4',
      type: 'doctor',
      participant: user?.role === 'doctor' ? 'Jane Wilson' : 'Dr. Sarah Smith',
      date: '2024-01-12',
      time: '11:20',
      lastMessage: 'How are you feeling after the treatment?',
      messageCount: 6,
      status: 'pending'
    },
  ];

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || conv.type === filterType;
    const matchesDate = !selectedDate || conv.date === selectedDate;
    
    return matchesSearch && matchesType && matchesDate;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'doctor':
        return user?.role === 'doctor' ? <MessageCircle className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Conversation History</h1>
          <p className="text-muted-foreground">
            {user?.role === 'doctor' 
              ? 'Review your patient interactions and AI consultations'
              : 'View your chat history with doctors and AI support'
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conversations</SelectItem>
                  <SelectItem value="ai">AI Chats</SelectItem>
                  <SelectItem value="doctor">
                    {user?.role === 'doctor' ? 'Patient Chats' : 'Doctor Chats'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation List */}
      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No conversations found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2 rounded-full ${
                      conversation.type === 'ai' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                    }`}>
                      {getTypeIcon(conversation.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-foreground">{conversation.participant}</h3>
                        <Badge className={getStatusColor(conversation.status)}>
                          {conversation.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {conversation.date} at {conversation.time}
                        </span>
                        <span>{conversation.messageCount} messages</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    View Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button */}
      {filteredConversations.length > 0 && (
        <div className="text-center">
          <Button variant="outline">Load More Conversations</Button>
        </div>
      )}
    </div>
  );
};

export default History;