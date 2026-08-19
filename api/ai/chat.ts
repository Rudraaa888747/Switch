import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAdminApiAuthorized } from '../_lib/supabase-admin';

/**
 * Secure server-side proxy for OpenAI chat completions.
 * The OPENAI_API_KEY is NEVER sent to the browser — only stored server-side.
 *
 * POST /api/ai/chat
 * Body: { messages: Array<{role: string, content: string}>, model?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const { messages, model = 'gpt-4o-mini' } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Allow up to 20 messages to prevent abuse
  const trimmedMessages = messages.slice(-20).map((m: { role: string; content: string }) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
  }));

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: trimmedMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openAiRes.ok) {
      const errorBody = await openAiRes.text();
      console.error('[AI Proxy] OpenAI error:', errorBody);
      return res.status(openAiRes.status).json({ error: 'AI service error' });
    }

    const data = await openAiRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[AI Proxy] Fetch error:', err);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
}
