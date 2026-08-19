import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Switch AI, a friendly shopping assistant for Switch fashion store.

IMPORTANT: When recommending products, ALWAYS include product IDs in this exact format at the END of your response:
[PRODUCTS: id1, id2, id3]

The store catalog is managed via the admin panel. Ask the user what they're looking for and guide them through the available options.

Always be helpful, concise, and include the [PRODUCTS: ...] tag when recommending items.`;

export const useAIChat = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    messages: Message[],
    onDelta: (text: string) => void,
    onDone: () => void
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        const lines = textBuffer.split('\n');
        textBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content || parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) onDelta(content);
            } catch (e) { /* ignore */ }
          }
        }
      }

      onDone();
    } catch (error) {
      console.error('AI Chat error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
      onDone();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading };
};
