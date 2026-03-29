import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool } from './fs-tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let systemPrompt = null;

async function getSystemPrompt() {
  if (!systemPrompt) {
    systemPrompt = await readFile(join(__dirname, 'system-prompt.txt'), 'utf8');
  }
  return systemPrompt;
}

/**
 * Convert tool definitions to OpenAI-compatible format for local LLMs.
 */
function toOpenAITools(tools) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));
}

/**
 * Try OpenClaw API (primary).
 */
async function tryOpenClaw(message, tools, history) {
  const url = process.env.OPENCLAW_API_URL;
  if (!url) return null;

  try {
    const prompt = await getSystemPrompt();
    const response = await axios.post(url, {
      model: process.env.OPENCLAW_MODEL || 'default',
      messages: [
        { role: 'system', content: prompt },
        ...history,
        { role: 'user', content: message }
      ],
      tools: toOpenAITools(tools),
      max_tokens: 2048
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OPENCLAW_API_KEY && { 'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}` })
      }
    });

    return parseOpenAIResponse(response.data);
  } catch (err) {
    console.error('[AI] OpenClaw failed:', err.message);
    return null;
  }
}

/**
 * Try local LLM (OpenAI-compatible, e.g., LM Studio).
 */
async function tryLocalLLM(message, tools, history) {
  const url = process.env.LOCAL_LLM_URL;
  if (!url) return null;

  try {
    const prompt = await getSystemPrompt();
    const response = await axios.post(`${url}/v1/chat/completions`, {
      model: process.env.LOCAL_LLM_MODEL || 'default',
      messages: [
        { role: 'system', content: prompt },
        ...history,
        { role: 'user', content: message }
      ],
      tools: toOpenAITools(tools),
      max_tokens: 2048
    }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });

    return parseOpenAIResponse(response.data);
  } catch (err) {
    console.error('[AI] Local LLM failed:', err.message);
    return null;
  }
}

/**
 * Try Anthropic API directly.
 */
async function tryAnthropicDirect(message, tools, history) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = await getSystemPrompt();
    const client = new Anthropic({ apiKey });

    // Convert history to Anthropic format
    const messages = [
      ...history.map(h => ({
        role: h.role === 'system' ? 'user' : h.role,
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: prompt,
      messages,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    return parseAnthropicResponse(response);
  } catch (err) {
    console.error('[AI] Anthropic direct failed:', err.message);
    return null;
  }
}

/**
 * Parse OpenAI-format response.
 */
function parseOpenAIResponse(data) {
  const choice = data.choices?.[0];
  if (!choice) return null;

  const msg = choice.message;
  const toolCalls = msg.tool_calls?.map(tc => ({
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments || '{}'),
    id: tc.id
  })) || [];

  return {
    response: msg.content || '',
    tool_calls: toolCalls,
    stop_reason: choice.finish_reason
  };
}

/**
 * Parse Anthropic-format response.
 */
function parseAnthropicResponse(response) {
  let textContent = '';
  const toolCalls = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        input: block.input,
        id: block.id
      });
    }
  }

  return {
    response: textContent,
    tool_calls: toolCalls,
    stop_reason: response.stop_reason
  };
}

/**
 * Main chat function — tries each provider in order.
 * Returns first success. Handles tool_use by executing tools and returning results.
 */
export async function chat(message, history = []) {
  const tools = toolDefinitions;

  // Try providers in order
  let result = await tryOpenClaw(message, tools, history);
  if (!result) result = await tryLocalLLM(message, tools, history);
  if (!result) result = await tryAnthropicDirect(message, tools, history);

  if (!result) {
    return {
      response: 'No AI provider is currently available. Please check your configuration in .env (OPENCLAW_API_URL, LOCAL_LLM_URL, or ANTHROPIC_API_KEY).',
      tool_calls: [],
      tool_results: []
    };
  }

  // Execute any tool calls
  const toolResults = [];
  if (result.tool_calls.length > 0) {
    for (const call of result.tool_calls) {
      const toolResult = await executeTool(call.name, call.input);
      toolResults.push({
        tool_name: call.name,
        tool_input: call.input,
        result: toolResult
      });
    }
  }

  return {
    response: result.response,
    tool_calls: result.tool_calls,
    tool_results: toolResults
  };
}
