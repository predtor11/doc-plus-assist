import type { Database } from '@/integrations/supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: number;
  };
}

export class OpenRouterService {
  private static readonly BASE_URL = '/api/openrouter';
  private static readonly MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
  private static readonly API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  /**
   * Test OpenRouter API connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.API_KEY) {
        return { success: false, error: 'OpenRouter API key not found. Please check your environment variables.' };
      }

      console.log('Testing OpenRouter connection...');
      console.log('API Key available:', !!this.API_KEY);

      const response = await fetch(`${this.BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
      });

      console.log('OpenRouter models endpoint response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Available models:', data);
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Connection failed with status:', response.status, errorData);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('OpenRouter connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Generate AI response for doctor chat
   */
  static async generateDoctorResponse(
    userMessage: string,
    conversationHistory: Message[] = [],
    sessionType: string = 'ai-doctor'
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      if (!this.API_KEY) {
        return { success: false, error: 'OpenRouter API key not found. Please check your environment variables.' };
      }

      console.log('Generating AI response for:', { userMessage, sessionType });

      // Build conversation context
      const messages: OpenRouterMessage[] = [];

      // Add system prompt based on session type
      if (sessionType === 'ai-doctor') {
        messages.push({
          role: 'system',
          content: `You are an AI medical assistant helping doctors with patient care. You provide:
- Clinical insights and recommendations
- Treatment suggestions based on symptoms
- Medical knowledge and best practices
- Professional, evidence-based responses
- Clear explanations for complex medical concepts

Always maintain patient confidentiality and encourage evidence-based medicine. If you're unsure about something, recommend consulting specialists or current medical literature.`
        });
      } else if (sessionType === 'ai-patient') {
        messages.push({
          role: 'system',
          content: `You are an AI support assistant helping patients with emotional support and stress relief. You provide:
- Empathetic listening and understanding
- Stress management techniques
- Emotional support and encouragement
- General wellness advice
- Professional boundaries (you're not a replacement for medical care)

Always encourage seeking professional medical help when appropriate and maintain appropriate boundaries as an AI assistant.`
        });
      }

      // Add conversation history (last 10 messages for context)
      const recentMessages = conversationHistory.slice(-10);
      for (const msg of recentMessages) {
        if (!msg.is_ai_message) {
          messages.push({
            role: 'user',
            content: msg.content
          });
        } else {
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      const requestBody: OpenRouterRequest = {
        model: this.MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };

      console.log('Sending request to OpenRouter:', {
        model: requestBody.model,
        messageCount: messages.length,
        lastMessage: userMessage.substring(0, 100) + '...'
      });

      const response = await fetch(`${this.BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('OpenRouter response status:', response.status);
      console.log('OpenRouter response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData: OpenRouterError = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('OpenRouter API error:', response.status, errorData);

        return {
          success: false,
          error: `API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`
        };
      }

      const data: OpenRouterResponse = await response.json();
      console.log('OpenRouter response received:', {
        id: data.id,
        model: data.model,
        usage: data.usage,
        responseLength: data.choices[0]?.message?.content?.length || 0
      });

      const aiResponse = data.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        return {
          success: false,
          error: 'No response generated by AI'
        };
      }

      return {
        success: true,
        response: aiResponse
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get available models (for debugging)
   */
  static async getAvailableModels(): Promise<{ success: boolean; models?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, models: data.data || [] };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}
