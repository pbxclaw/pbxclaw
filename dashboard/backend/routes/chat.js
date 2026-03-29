import { Router } from 'express';
import { chat } from '../lib/ai-client.js';

const router = Router();

/**
 * POST /api/chat
 * AI admin chat endpoint.
 * Body: { message: string, history: array }
 */
router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await chat(message, history);
    return res.json({
      response: result.response,
      tool_calls: result.tool_calls,
      tool_results: result.tool_results
    });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    return res.status(500).json({ error: 'AI chat failed', detail: err.message });
  }
});

export default router;
