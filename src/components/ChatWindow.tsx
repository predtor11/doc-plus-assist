import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Stethoscope, AtSign, Upload, File, X, Image, FileText, Paperclip, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useChatSessions';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FileUpload, { UploadedFile } from './FileUpload';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];

interface ChatWindowProps {
  session: ChatSession | null;
  onSessionUpdate?: () => void;
  onNewSession?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, onSessionUpdate, onNewSession }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPatientMentions, setShowPatientMentions] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // Force re-render key
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { messages, sendMessage, refreshMessages } = useMessages(session?.id || null);

  // Debug: Monitor messages changes
  useEffect(() => {
    console.log('🔄 ChatWindow: Messages updated - Total count:', messages.length);
    if (messages.length === 0) {
      console.log('📭 No messages in state');
    } else {
      console.log('📨 Current messages in state:');
      messages.forEach((msg, index) => {
        console.log(`  Message ${index + 1}:`, {
          id: msg.id,
          is_ai: msg.is_ai_message,
          sender: msg.sender_id,
          created_at: msg.created_at,
          content_preview: msg.content.substring(0, 50) + '...'
        });
      });
    }
    
    // Force a re-render by updating render key
    setRenderKey(prev => prev + 1);
    
    // Scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFilesUploaded = (files: UploadedFile[]) => {
    console.log('Files uploaded:', files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getFileContext = () => {
    if (uploadedFiles.length === 0) return '';

    const fileSummaries = uploadedFiles.map(file => {
      const content = file.extractedText || `[${file.type} file: ${file.name}]`;
      return `File: ${file.name}\nContent: ${content}`;
    }).join('\n\n');

    return `\n\n--- FILE CONTEXT ---\n${fileSummaries}\n--- END FILE CONTEXT ---`;
  };

  const fetchPatients = async (searchTerm: string = '') => {
    if (!user) {
      console.log('No user found, cannot fetch patients');
      return;
    }

    console.log('Fetching patients for:', user.role, 'with search term:', searchTerm);

    if (user.role === 'patient') {
      // Patients can only see their own information
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.user_id)
          .single();

        if (error) {
          console.error('Error fetching patient data:', error);
          return;
        }

        if (data) {
          setSelectedPatient(data);
          setPatients([data]);
          console.log('Patient data loaded:', data.name);
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
      }
    } else if (user.role === 'doctor') {
      // Doctors can see their assigned patients
      try {
        let query = supabase
          .from('patients')
          .select('*')
          .eq('assigned_doctor_id', user.user_id)
          .order('name');

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data, error } = await query.limit(10);

        if (error) {
          console.error('Error fetching patients:', error);
          return;
        }

        setPatients(data || []);
        console.log('Patients loaded for doctor:', data?.length || 0, 'patients');
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    console.log('Patient selected:', patient.name, 'by user role:', user?.role);
    if (user?.role === 'doctor') {
      // Only doctors can select different patients
      setSelectedPatient(patient);
      setShowPatientMentions(false);
      setPatientSearchTerm('');
      // Insert patient name at cursor position
      const patientMention = `@${patient.name}`;
      setNewMessage(prev => {
        const updated = prev.replace(/@\w*$/, patientMention + ' ');
        console.log('Message updated with patient mention:', updated);
        return updated;
      });
    }
  };

  const getPatientContext = (patient: Patient | null) => {
    if (!patient) return '';

    const isPatientSession = user?.role === 'patient';

    if (isPatientSession) {
      // Therapeutic context for patient sessions
      return `
Personal Context for Therapeutic Session:
- Your name: ${patient.name}
- Your age: ${patient.age || 'Not specified'}
- Your background: ${patient.medical_history ? 'You have shared some health experiences that we can discuss' : 'We can explore your health journey together'}
- Your current support: ${patient.current_medications ? 'You are currently receiving medical support' : 'We can discuss your wellness journey'}
- Your care team: You have healthcare professionals supporting you
- Your emergency contacts: You have trusted contacts for urgent situations

Remember: This is your private, confidential space to discuss your feelings, stress, and well-being. Everything we discuss here is just between us and focused on supporting your mental health and stress management.
      `.trim();
    } else {
      // Clinical context for doctor sessions
      return `
Patient Context:
- Name: ${patient.name}
- Age: ${patient.age || 'Not specified'}
- Gender: ${patient.gender || 'Not specified'}
- Medical History: ${patient.medical_history || 'None provided'}
- Current Medications: ${patient.current_medications || 'None'}
- Allergies: ${patient.allergies || 'None reported'}
- Emergency Contact: ${patient.emergency_contact_name || 'Not provided'} (${patient.emergency_contact_phone || 'No phone'})
- Address: ${patient.address || 'Not provided'}
- Phone: ${patient.phone || 'Not provided'}
- Email: ${patient.email || 'Not provided'}
      `.trim();
    }
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

  const handleTestResponse = async () => {
    console.log('=== TESTING SIMPLE LM STUDIO RESPONSE ===');
    try {
      const testMessages = [
        { role: 'user', content: 'Hello, can you help me?' }
      ];
      
      console.log('Sending simple test request...');
      const response = await fetch(`/api/lm-studio/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: testMessages,
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      console.log('Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Test response data:', data);
        console.log('Test response structure:', JSON.stringify(data, null, 2));
        
        // Try to extract content
        let testContent = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          testContent = data.choices[0].message.content;
        } else if (data.content) {
          testContent = data.content;
        } else if (data.response) {
          testContent = data.response;
        }
        
        console.log('Extracted test content:', testContent);
        
        if (testContent) {
          await sendMessage(`TEST RESPONSE: ${testContent}`, true);
        } else {
          await sendMessage('TEST: Could not extract content from response', true);
        }
      } else {
        const errorText = await response.text();
        console.error('Test failed:', errorText);
        await sendMessage(`TEST FAILED: ${response.status} - ${errorText}`, true);
      }
    } catch (error) {
      console.error('Test error:', error);
      await sendMessage(`TEST ERROR: ${error.message}`, true);
    }
  };

  useEffect(() => {
    // Clear selected patient when session changes
    setSelectedPatient(null);
    setShowPatientMentions(false);
    setPatientSearchTerm('');
  }, [session?.id]);

  useEffect(() => {
    // Load patient data when user changes or component mounts
    if (user) {
      console.log('Loading patient data for user:', user.role, user.user_id);
      fetchPatients();
    }
  }, [user]);

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

  useEffect(() => {
    // Handle patient mention detection
    const atIndex = newMessage.lastIndexOf('@');
    console.log('Checking for @ mentions:', { atIndex, messageLength: newMessage.length, userRole: user?.role });
    
    if (atIndex !== -1 && user?.role === 'doctor') {
      const afterAt = newMessage.slice(atIndex + 1);
      console.log('Found @ symbol, text after @:', afterAt);
      
      if (!afterAt.includes(' ')) {
        console.log('No space found after @, showing patient mentions');
        setPatientSearchTerm(afterAt);
        setShowPatientMentions(true);
        fetchPatients(afterAt);
      } else {
        console.log('Space found after @, hiding patient mentions');
        setShowPatientMentions(false);
      }
    } else {
      if (showPatientMentions) {
        console.log('Hiding patient mentions - no @ or not doctor');
        setShowPatientMentions(false);
      }
    }
  }, [newMessage, user, showPatientMentions]);

  const handleInputChange = (value: string) => {
    console.log('Input changed:', value);
    setNewMessage(value);
  };

  // Custom markdown components for better styling
  const MarkdownComponents = {
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: any) => (
      <tr className="border-b border-border" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: any) => (
      <th className="px-4 py-2 text-left font-semibold text-sm border-r border-border last:border-r-0" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2 text-sm border-r border-border last:border-r-0" {...props}>
        {children}
      </td>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-bold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic text-muted-foreground" {...props}>
        {children}
      </em>
    ),
    p: ({ children, ...props }: any) => (
      <p className="mb-2 last:mb-0" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-sm" {...props}>
        {children}
      </li>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-xl font-bold mb-2 text-foreground" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-lg font-bold mb-2 text-foreground" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-base font-bold mb-2 text-foreground" {...props}>
        {children}
      </h3>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-2" {...props}>
        {children}
      </blockquote>
    ),
    code: ({ children, ...props }: any) => (
      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ),
    pre: ({ children, ...props }: any) => (
      <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2" {...props}>
        {children}
      </pre>
    ),
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) {
      console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasSession: !!session });
      return;
    }

    console.log('Sending message:', newMessage);
    console.log('Current user:', user);
    console.log('Session:', session);
    console.log('Selected patient:', selectedPatient);

    const messageContent = uploadedFiles.length > 0
      ? `${newMessage}\n\n[Attached ${uploadedFiles.length} file(s)]`
      : newMessage;
    
    console.log('Final message content:', messageContent);
    
    // Don't clear the input yet - wait until we confirm the message is saved
    const originalMessage = newMessage;
    setIsLoading(true);
    setError(null); // Clear any previous errors

    // Add a timeout to prevent loading state from getting stuck
    const loadingTimeout = setTimeout(() => {
      console.warn('⏰ Loading timeout reached (30s), resetting loading state');
      setIsLoading(false);
      setNewMessage(originalMessage); // Restore the message if timeout
    }, 30000); // 30 second timeout

    // Send user message
    console.log('Calling sendMessage for user message...');
    const userMessage = await sendMessage(messageContent, false, () => {
      console.log('🎉 User message state update callback triggered');
      setRenderKey(prev => prev + 1); // Force re-render
      // Only clear input after successful save
      setNewMessage('');
    });
    console.log('User message result:', userMessage);

    if (!userMessage) {
      console.error('❌ Failed to send user message - stopping here');
      setError('Failed to send message. Please try again.');
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setNewMessage(originalMessage); // Restore the message
      return;
    }

    console.log('✅ User message sent successfully, now generating AI response...');

    // Only proceed with AI response if this is an AI session
    if (!session?.session_type.includes('ai')) {
      console.log('Not an AI session, skipping AI response generation');
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      onSessionUpdate?.();
      return;
    }

    console.log('🤖 This is an AI session, proceeding with AI response generation...');

    // Prevent multiple simultaneous AI requests
    if (isGeneratingAI) {
      console.log('⚠️ AI response already in progress, skipping duplicate request');
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      return;
    }

    setIsGeneratingAI(true);

    try {
      // Build conversation history including the user message that was just sent
      // We need to get fresh messages or build the context manually
      console.log('Building conversation history...');
      console.log('Current messages in state:', messages.length);
      
      // Build conversation messages including the new user message
      const conversationMessages = [
        ...messages.map(msg => ({
          role: msg.is_ai_message ? 'assistant' : 'user',
          content: msg.content,
        })),
        // Add the current user message to the conversation
        {
          role: 'user',
          content: messageContent,
        }
      ];

      console.log('Conversation messages for LM Studio:', conversationMessages.length, 'messages');
      console.log('Last message in conversation:', conversationMessages[conversationMessages.length - 1]);

      // Create the medical AI system prompt based on user role
      const isPatientSession = user?.role === 'patient';
      const fileContext = getFileContext();

      let systemPrompt;

      if (isPatientSession) {
        // Patient-focused therapeutic system prompt
        systemPrompt = `You are a compassionate and professional AI therapist specializing in stress relief and mental health support. You are speaking directly with a patient who needs emotional support and stress management guidance.

${selectedPatient ? getPatientContext(selectedPatient) : ''}

${fileContext ? `Patient's Uploaded Files:\n${fileContext}` : ''}

Your Role and Responsibilities:
- Act as a supportive therapist focused on stress relief and emotional well-being
- Provide empathetic, non-judgmental listening and guidance
- Help patients manage stress, anxiety, and emotional challenges
- Offer practical coping strategies and relaxation techniques
- Encourage healthy lifestyle habits that support mental health
- Guide patients toward professional help when appropriate

Core Principles:
- Maintain absolute confidentiality - never discuss other patients or doctors
- Focus exclusively on the patient's own experiences and concerns
- Remember and reference previous conversations with this specific patient
- Build therapeutic rapport and trust
- Use active listening and validation techniques
- Provide evidence-based stress management strategies

Therapeutic Approach:
- Practice mindfulness and present-moment awareness
- Teach breathing exercises and relaxation techniques
- Help identify stress triggers and coping mechanisms
- Support emotional regulation and resilience building
- Encourage self-care and work-life balance
- Promote positive thinking and cognitive reframing

Boundaries and Ethics:
- Never provide medical diagnoses or treatment recommendations
- Do not prescribe medications or alter treatment plans
- Always recommend professional medical help for serious concerns
- Respect patient privacy and maintain therapeutic confidentiality
- If patient shows signs of crisis, encourage immediate professional help

Communication Style:
- Warm, empathetic, and genuinely caring
- Use simple, accessible language
- Be patient and allow time for emotional processing
- Ask open-ended questions to encourage self-reflection
- Validate feelings and experiences
- Provide hope and encouragement

Remember: You are having a private, confidential conversation with this specific patient. Focus entirely on their individual needs, experiences, and journey toward better mental health and stress management.

${selectedPatient ? 'Always incorporate this patient\'s specific context and history in your therapeutic responses.' : ''}
${fileContext ? 'Consider any uploaded files or documents in your therapeutic guidance.' : ''}`;
      } else {
        // Doctor-focused medical system prompt (existing)
        systemPrompt = `You are a medical AI assistant that helps doctors by providing medical information, clinical guidance, and patient-related insights.

${selectedPatient ? getPatientContext(selectedPatient) : ''}

${fileContext ? `Attached Files Context:\n${fileContext}` : ''}

Your responsibilities:
- Answer questions about patient information, medical conditions, treatments, and clinical guidance
- Analyze and provide insights about uploaded medical documents, images, and files
- Provide summaries of patient context and medical history when requested
- Give answers that are precise, clear, and human-friendly
- Focus on medical knowledge, clinical guidance, and patient-related insights
- Suggest practical next steps in a way that is understandable for both the doctor and the patient
- Help with useful medical tasks, such as:
  • Making treatment plans (step-by-step with clear explanations)
  • Generating diet or lifestyle plans appropriate for the condition
  • Summarizing patient context into quick overviews
  • Analyzing medical images and documents
  • Suggesting diagnostic tests or follow-up actions where medically relevant
  • Providing information about medications, symptoms, and medical procedures

File Analysis Capabilities:
- Analyze uploaded medical images (X-rays, scans, photos)
- Extract and summarize information from medical reports and documents
- Provide insights about laboratory results, prescriptions, and medical records
- Help interpret medical terminology and abbreviations
- Cross-reference information from multiple documents when available

Tone:
- Be professional but supportive
- Avoid unnecessary jargon; explain complex terms in simple ways if needed
- Prioritize accuracy and brevity

Guidelines:
- Always provide helpful medical information when asked
- If you have patient context available, incorporate it into your responses
- If files are attached, analyze them and provide relevant medical insights
- For patient information requests, provide relevant details from the patient context
- When analyzing files, explain your findings clearly and suggest clinical implications
- If asked about something outside your medical knowledge, politely explain your limitations

${selectedPatient ? 'Always incorporate the patient context provided above in your reasoning and response when relevant.' : ''}
${fileContext ? 'Always consider the attached files in your analysis and responses.' : ''}`;
      }

      // Add system prompt at the beginning
      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...conversationMessages
      ];

      console.log('System prompt length:', systemPrompt.length);
      console.log('System prompt preview:', systemPrompt.substring(0, 200) + '...');
      console.log('Final messages with system prompt:', messagesWithSystem);

      console.log('🚀 Attempting to connect to LM Studio at:', `/api/lm-studio/v1/chat/completions`);
      console.log('Request payload preview:', {
        messageCount: messagesWithSystem.length,
        lastMessage: messagesWithSystem[messagesWithSystem.length - 1]?.content?.substring(0, 100) + '...',
        max_tokens: 1000,
        temperature: 0.7,
      });

      // Validate that we have a proper conversation to send
      if (messagesWithSystem.length < 2) {
        console.error('❌ Not enough messages for AI conversation:', messagesWithSystem.length);
        throw new Error('Insufficient conversation context for AI response');
      }

      const lastUserMessage = messagesWithSystem[messagesWithSystem.length - 1];
      if (lastUserMessage.role !== 'user' || !lastUserMessage.content.trim()) {
        console.error('❌ Last message is not a valid user message:', lastUserMessage);
        throw new Error('Invalid last message for AI response');
      }
      
      let response;
      try {
        response = await fetch(`/api/lm-studio/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesWithSystem,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });
      } catch (firstAttemptError) {
        console.log('First endpoint failed, trying alternative endpoint...');
        try {
          response = await fetch(`/api/lm-studio/v1/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: messagesWithSystem.map(m => `${m.role}: ${m.content}`).join('\n'),
              max_tokens: 1000,
              temperature: 0.7,
            }),
          });
        } catch (secondAttemptError) {
          console.error('Both endpoints failed:', { firstAttemptError, secondAttemptError });
          throw firstAttemptError; // Throw the original error
        }
      }

      console.log('LM Studio response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio error response:', errorText);
        throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('LM Studio response data:', data);
      console.log('Full response structure:', JSON.stringify(data, null, 2));
      
      // Try different response formats that LM Studio might use
      let aiResponse = '';
      
      // Check if response is an array (some models return arrays)
      if (Array.isArray(data)) {
        console.log('Response is an array, using first item');
        const firstItem = data[0];
        if (firstItem && firstItem.content) {
          aiResponse = firstItem.content;
        } else if (firstItem && firstItem.message && firstItem.message.content) {
          aiResponse = firstItem.message.content;
        } else if (firstItem && firstItem.text) {
          aiResponse = firstItem.text;
        }
      }
      
      // Handle single object with role/content structure (like the user's example)
      if (!aiResponse && data.role === 'assistant' && data.content) {
        console.log('Found assistant role with content field');
        aiResponse = data.content;
      }
      
      // OpenAI-style format
      if (!aiResponse && data.choices && data.choices[0]) {
        if (data.choices[0].message && data.choices[0].message.content) {
          aiResponse = data.choices[0].message.content;
        } else if (data.choices[0].text) {
          aiResponse = data.choices[0].text;
        } else if (data.choices[0].content) {
          aiResponse = data.choices[0].content;
        }
      }
      
      // Direct response format
      if (!aiResponse) {
        if (data.response) {
          aiResponse = data.response;
        } else if (data.content) {
          aiResponse = data.content;
        } else if (data.text) {
          aiResponse = data.text;
        } else if (data.message) {
          aiResponse = data.message;
        } else if (typeof data === 'string') {
          aiResponse = data;
        }
      }

      console.log('Extracted AI response:', aiResponse);
      console.log('AI response length:', aiResponse ? aiResponse.length : 0);
      console.log('AI response type:', typeof aiResponse);

      // If we still don't have a response, log the raw data for debugging
      if (!aiResponse || aiResponse.trim() === '') {
        console.warn('No AI response found, raw response data:', JSON.stringify(data, null, 2));
        console.warn('Available keys in response:', Object.keys(data));
        if (Array.isArray(data)) {
          console.warn('Array length:', data.length);
          if (data.length > 0) {
            console.warn('First array item keys:', Object.keys(data[0]));
          }
        }
        aiResponse = 'Sorry, I couldn\'t generate a response. Please try again.';
      }

      console.log('Final AI response to send:', aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''));
      console.log('About to call sendMessage with isAiMessage=true');
      
      try {
        console.log('=== CALLING SENDMESSAGE FOR AI RESPONSE ===');
        console.log('AI Response content length:', aiResponse.length);
        console.log('AI Response preview:', aiResponse.substring(0, 100));
        console.log('Session ID for AI message:', session?.id);
        console.log('Current user for AI message:', user?.user_id);
        
        const sendResult = await sendMessage(aiResponse, true, () => {
          console.log('🎉 AI message state update callback triggered');
          setRenderKey(prev => prev + 1); // Force re-render
          onSessionUpdate?.();
        });
        console.log('=== SENDMESSAGE RESULT FOR AI ===');
        console.log('Send result:', sendResult);
        console.log('Send result type:', typeof sendResult);
        console.log('Send result ID:', sendResult?.id);
        
        if (!sendResult) {
          console.error('❌ Failed to save AI message to database - sendResult is null/undefined');
          console.error('This means the AI response was generated but not saved to the database');
          setError('Failed to save AI response. Please try again.');
        } else {
          console.log('✅ AI message saved successfully with ID:', sendResult.id);
          console.log('Message should now appear in chat window');
          
          // Force a UI update by triggering a re-render and refresh
          setTimeout(() => {
            console.log('🔄 Forcing component re-render and refresh to ensure AI message appears');
            setRenderKey(prev => prev + 1);
            refreshMessages(); // Also refresh from database to ensure sync
          }, 100);
          
          setError(null); // Clear error on successful response
        }
      } catch (sendError) {
        console.error('Error sending AI message:', sendError);
        console.error('Send error details:', {
          message: sendError.message,
          stack: sendError.stack
        });
        setError('Failed to save AI response. Please try again.');
        // Don't re-throw here, we want to continue to the finally block
      }
    } catch (error) {
      console.error('Error calling LM Studio:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      const errorMessage = 'Sorry, I\'m having trouble connecting to the AI service. Please check that LM Studio is running and accessible at 127.0.0.1:1234. You can also use the "Test LM Studio" button to diagnose the connection.';
      try {
        await sendMessage(errorMessage, true);
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    } finally {
      console.log('Setting isLoading to false...');
      clearTimeout(loadingTimeout); // Clear the timeout
      setIsLoading(false);
      setIsGeneratingAI(false); // Reset AI generation flag
      console.log('Calling onSessionUpdate...');
      onSessionUpdate?.();
      // Clear selected patient after response
      setSelectedPatient(null);
      // Clear uploaded files after response
      setUploadedFiles([]);
      console.log('Message sending process completed');
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
            {user?.role === 'patient'
              ? 'Welcome to Your Stress Relief Space'
              : 'Welcome to Doc+ AI Assistant'
            }
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {user?.role === 'patient'
              ? 'I\'m here to listen, support you, and help you manage stress. Your thoughts and feelings are safe with me. Let\'s start a conversation whenever you\'re ready.'
              : 'Get instant help from our AI assistant. Start a conversation to begin.'
            }
          </p>
          {onNewSession && (
            <Button
              onClick={onNewSession}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Bot className="h-4 w-4 mr-2" />
              {user?.role === 'patient' ? 'Start Our Conversation' : 'Start New Conversation'}
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
                {session.title || (user?.role === 'patient' ? 'Your Therapeutic Support Session' : 'Chat Session')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {session.session_type === 'ai-doctor' && 'AI Medical Assistant'}
                {session.session_type === 'ai-patient' && (user?.role === 'patient' ? 'Your Personal Therapeutic Support' : 'AI Therapeutic Support')}
                {session.session_type === 'doctor-patient' && (
                  user?.role === 'doctor' ? 'Patient Communication' : 'Doctor Communication'
                )}
              </p>
              {selectedPatient && (
                <p className="text-xs text-accent-foreground mt-1">
                  {user?.role === 'patient'
                    ? '🧘 Your personal therapeutic space - confidential and supportive'
                    : `📋 Context: ${selectedPatient.name} (${selectedPatient.age}y, ${selectedPatient.gender})`
                  }
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSession}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {user?.role === 'patient' ? 'New Session' : 'New Conversation'}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}
        {/* Debug Info */}
        <div className="mt-2 p-2 bg-muted/50 border border-muted rounded text-xs text-muted-foreground">
          Debug: {messages.length} messages | Loading: {isLoading ? 'Yes' : 'No'} | Session: {session?.id || 'None'}
          <button 
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              refreshMessages();
            }}
            className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
          >
            Refresh Messages
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" key={`messages-${renderKey}`}>
          {(() => {
            console.log('🎨 Rendering messages in UI, count:', messages.length, 'renderKey:', renderKey);
            return null;
          })()}
          
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          
          {messages.map((message) => {
            console.log('🎨 Processing message for display:', {
              id: message.id,
              content: message.content.substring(0, 100) + '...',
              is_ai_message: message.is_ai_message,
              sender_id: message.sender_id,
              user_id: user?.user_id,
              willShowAsUser: message.sender_id === user?.user_id,
              willShowAsAI: message.is_ai_message
            });
            return (
            <div
              key={message.id}
              className={`flex ${
                message.is_ai_message || message.sender_id !== user?.user_id ? 'justify-start' : 'justify-end'
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
                {message.is_ai_message ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
            );
          })}

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
      <div className="p-4 border-t bg-card relative">
        {/* Patient Mentions Dropdown - Only for doctors */}
        {showPatientMentions && patients.length > 0 && user?.role === 'doctor' && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handlePatientSelect(patient)}
                className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center space-x-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {patient.age && `${patient.age} years old`}
                      {patient.gender && ` • ${patient.gender}`}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Patient Indicator */}
        {selectedPatient && (
          <div className="mb-2 p-2 bg-accent/20 border border-accent/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AtSign className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">
                  {user?.role === 'patient' ? 'Your Personal Session' : `Context: ${selectedPatient.name}`}
                </span>
                {user?.role === 'doctor' && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedPatient.age}y, {selectedPatient.gender})
                  </span>
                )}
              </div>
              {user?.role === 'doctor' && (
                <Button
                  onClick={() => setSelectedPatient(null)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        )}

        {/* File Upload Section */}
        {showFileUpload && (
          <div className="mb-4 p-4 bg-muted/30 border border-border rounded-lg">
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              maxFiles={5}
              maxSize={30 * 1024 * 1024} // 30MB
              disabled={isLoading}
            />
          </div>
        )}

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 p-2 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Attached Files ({uploadedFiles.length})</span>
              <Button
                onClick={() => setUploadedFiles([])}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-2 bg-background px-2 py-1 rounded text-xs"
                >
                  {getFileIcon(file.type)}
                  <span className="truncate max-w-24">{file.name}</span>
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={() => setShowFileUpload(!showFileUpload)}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="px-3"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              user?.role === 'doctor'
                ? "Type your message... (use @ to mention patients)"
                : "Share what's on your mind... I'm here to listen and help with stress relief"
            }
            onKeyPress={(e) => {
              if (e.key === 'Enter' && (!showPatientMentions || user?.role !== 'doctor')) {
                handleSendMessage();
              } else if (e.key === 'Enter' && showPatientMentions && user?.role === 'doctor') {
                e.preventDefault(); // Prevent sending when patient mentions are shown
              }
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim() || showPatientMentions}
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