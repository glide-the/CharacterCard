import type { TaskAIConfig } from "../types";
import { GoogleGenAI, Schema, Type } from "@google/genai";
import OpenAI from "openai";

// --- JSON Format Prompt Templates ---

/**
 * JSON response format prefix instruction
 * Reference: Python implementation GLM_JSON_RESPONSE_PREFIX from LayoutForgeAI
 */
const JSON_FORMAT_PREFIX = `You should always follow the instructions and output a valid JSON object.
The structure of the JSON object you can found in the instructions.

And you should always end the block with a "\`\`\`" to indicate the end of the JSON object.

IMPORTANT: You must output exactly one top-level JSON object inside a single fenced code block that starts with \`\`\`json and ends with \`\`\`. You must only output one such fenced code block per response, without any additional code blocks or text outside it.

<instructions>
`;

/**
 * JSON response format suffix instruction
 * Reference: Python implementation GLM_JSON_RESPONSE_SUFFIX from LayoutForgeAI
 */
const JSON_FORMAT_SUFFIX = `Output:
</instructions>

`;

// --- JSON Parsing Utilities ---

/**
 * Extract JSON content from AI response
 * Multi-level fallback strategy:
 * 1. Extract ```json...``` code block
 * 2. Parse entire response as JSON directly
 * 3. Attempt to repair malformed JSON
 */
function extractJSONFromResponse(response: string): string {
  if (!response || response.trim().length === 0) {
    throw new Error("Empty response from AI");
  }

  // Strategy 1: Try to extract ```json...``` code block
  const codeBlockPattern = /```(?:json\s*)?([\s\S]*?)```/;
  const match = response.match(codeBlockPattern);

  if (match && match[1]) {
    const extracted = match[1].trim();
    // Verify extracted content looks like JSON
    if (extracted.startsWith('{') || extracted.startsWith('[')) {
      return extracted;
    }
  }

  // Strategy 2: Try to parse entire response directly
  const trimmed = response.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Strategy 3: Find content after first { or [
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    // Find matching closing bracket
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        // Found complete JSON object or array
        if ((braceCount === 0 && bracketCount === 0) && i > startIndex) {
          return trimmed.substring(startIndex, i + 1);
        }
      }
    }

    // If complete closing bracket not found, return from start to end
    return trimmed.substring(startIndex);
  }

  throw new Error(`Could not extract valid JSON from response. Response preview: ${response.substring(0, 200)}...`);
}

/**
 * Safely parse JSON with auto-repair for common errors
 */
function safeParseJSON(jsonString: string): any {
  try {
    // Try direct parsing
    return JSON.parse(jsonString);
  } catch (error) {
    // Try to repair common JSON errors
    let repaired = jsonString
      // Remove BOM
      .replace(/^\uFEFF/, '')
      // Remove trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix single quotes
      .replace(/'/g, '"')
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

    try {
      return JSON.parse(repaired);
    } catch (retryError) {
      throw new Error(`Failed to parse JSON even after repair attempts. Original error: ${error}. Repaired error: ${retryError}`);
    }
  }
}

/**
 * Parse AI response to JSON object
 * Combines extraction and parsing steps
 */
function parseAIResponse(response: string): any {
  const extracted = extractJSONFromResponse(response);
  return safeParseJSON(extracted);
}

// --- Configuration Interface ---

export interface AIProviderConfig {
  provider: 'gemini' | 'openai';
  gemini?: {
    apiKey?: string;
  };
  openai?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
}

export interface CompletionRequest {
  prompt: string;
  systemInstruction?: string;
  jsonSchema?: Schema | any;
  jsonMode?: boolean;
}

// --- Validation ---

function validateConfig(provider: 'gemini' | 'openai', config: { geminiApiKey?: string; openaiApiKey?: string }) {
  if (provider === 'openai' && !config.openaiApiKey) {
    throw new Error("OpenAI API Key is missing in settings.");
  }

  if (provider === 'gemini' && !process.env.API_KEY && !config.geminiApiKey) {
    throw new Error("Gemini API Key is missing (process.env.API_KEY).");
  }
}

/**
 * Convert Schema to prompt description for OpenAI
 */
function schemaToPromptDescription(geminiSchema: Schema, indent = 0): string {
  const prefix = '  '.repeat(indent);

  if (geminiSchema.type === Type.OBJECT && geminiSchema.properties) {
    let desc = '{\n';
    for (const [key, value] of Object.entries(geminiSchema.properties)) {
      const prop = value as any;
      const required = geminiSchema.required?.includes(key) ? ' (required)' : ' (optional)';
      const enumDesc = prop.enum ? ` Enum: ${prop.enum.join(', ')}` : '';
      desc += `${prefix}  "${key}": ${prop.type}${required}${enumDesc},\n`;
    }
    desc += `${prefix}}`;
    return desc;
  }

  if (geminiSchema.type === Type.ARRAY && geminiSchema.items) {
    return `[\n${schemaToPromptDescription(geminiSchema.items as Schema, indent + 1)}\n${prefix}]`;
  }

  return geminiSchema.type?.toLowerCase() || 'object';
}

// --- Main Engine Functions ---

/**
 * Unified generation method for text or JSON
 */
export const generateContent = async (
  config: AIProviderConfig,
  request: CompletionRequest,
  taskConfig?: TaskAIConfig
): Promise<string> => {
  const effectiveProvider = taskConfig?.provider || config.provider;
  const geminiApiKey = taskConfig?.geminiApiKey || config.gemini?.apiKey;
  const openaiApiKey = taskConfig?.openaiApiKey || config.openai?.apiKey;

  validateConfig(effectiveProvider, { geminiApiKey, openaiApiKey });

  // --- Gemini Implementation ---
  if (effectiveProvider === 'gemini') {
    const apiKey = geminiApiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    const geminiConfig: any = {
      systemInstruction: request.systemInstruction,
      ...(taskConfig ? {
        temperature: taskConfig.temperature,
        maxOutputTokens: taskConfig.maxOutputTokens,
        topP: taskConfig.topP,
        topK: taskConfig.topK,
      } : {}),
    };

    if (request.jsonMode) {
      geminiConfig.responseMimeType = "application/json";
      if (request.jsonSchema) {
        geminiConfig.responseSchema = request.jsonSchema;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: taskConfig?.geminiModel || 'gemini-2.5-flash-preview-05-20',
        contents: request.prompt,
        config: geminiConfig
      });
      return response.text || "";
    } catch (e: any) {
      console.error("Gemini Error:", e);
      throw new Error(`Gemini Error: ${e.message}`);
    }
  }

  // --- OpenAI Implementation ---
  if (effectiveProvider === 'openai') {
    const client = new OpenAI({
      apiKey: openaiApiKey || '',
      baseURL: taskConfig?.openaiBaseUrl || config.openai?.baseUrl || "https://api.openai.com/v1",
      dangerouslyAllowBrowser: true
    });

    // Build Schema description if jsonMode is enabled
    const schemaDescription = request.jsonMode && request.jsonSchema
      ? `\n\nExpected JSON Schema Structure:\n${schemaToPromptDescription(request.jsonSchema)}\n\nStrictly follow the structure above.`
      : (request.jsonMode ? '\n\nOutput must be a valid JSON object.' : '');

    // Wrap message with JSON_FORMAT_PREFIX and JSON_FORMAT_SUFFIX if jsonMode is enabled
    const enhancedSystemMessage = request.jsonMode
      ? (request.systemInstruction
          ? `${JSON_FORMAT_PREFIX}${request.systemInstruction}${schemaDescription}\n</instructions>\n${JSON_FORMAT_SUFFIX}`
          : `${JSON_FORMAT_PREFIX}${schemaDescription}\n</instructions>\n${JSON_FORMAT_SUFFIX}`)
      : request.systemInstruction;

    const messages: any[] = [];
    if (enhancedSystemMessage) {
      messages.push({ role: "system", content: enhancedSystemMessage });
    }
    messages.push({ role: "user", content: request.prompt });

    try {
      const requestOptions: any = {
        messages,
        model: taskConfig?.openaiModel || config.openai?.model || 'gpt-4-turbo-preview',
        ...(taskConfig ? {
          temperature: taskConfig.temperature,
          max_tokens: taskConfig.maxOutputTokens,
          top_p: taskConfig.topP,
        } : {}),
      };

      const completion = await client.chat.completions.create(requestOptions);

      if (request.jsonMode) {
        // Parse AI response using enhanced parser
        const parsed = parseAIResponse(completion.choices[0].message.content || "");
        return JSON.stringify(parsed);
      } else {
        // Return raw response for non-JSON mode
        return completion.choices[0].message.content || "";
      }
    } catch (e: any) {
      console.error("OpenAI Error:", e);
      throw new Error(`OpenAI Error: ${e.message}`);
    }
  }

  throw new Error("Invalid Provider Configuration");
};

/**
 * Unified streaming method
 */
export async function* generateStream(
  config: AIProviderConfig,
  request: CompletionRequest,
  taskConfig?: TaskAIConfig
): AsyncGenerator<string> {
  const effectiveProvider = taskConfig?.provider || config.provider;
  const geminiApiKey = taskConfig?.geminiApiKey || config.gemini?.apiKey;
  const openaiApiKey = taskConfig?.openaiApiKey || config.openai?.apiKey;

  validateConfig(effectiveProvider, { geminiApiKey, openaiApiKey });

  // --- Gemini Stream ---
  if (effectiveProvider === 'gemini') {
    const apiKey = geminiApiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    const streamResp = await ai.models.generateContentStream({
      model: taskConfig?.geminiModel || 'gemini-2.5-flash-preview-05-20',
      contents: request.prompt,
      config: {
        systemInstruction: request.systemInstruction,
        ...(taskConfig ? {
          temperature: taskConfig.temperature,
          maxOutputTokens: taskConfig.maxOutputTokens,
          topP: taskConfig.topP,
          topK: taskConfig.topK,
        } : {}),
      }
    });

    for await (const chunk of streamResp) {
      if (chunk.text) yield chunk.text;
    }
    return;
  }

  // --- OpenAI Stream ---
  if (effectiveProvider === 'openai') {
    const client = new OpenAI({
      apiKey: openaiApiKey || '',
      baseURL: taskConfig?.openaiBaseUrl || config.openai?.baseUrl || "https://api.openai.com/v1",
      dangerouslyAllowBrowser: true,
    });

    const messages: any[] = [];
    if (request.systemInstruction) {
      messages.push({ role: "system", content: request.systemInstruction });
    }
    messages.push({ role: "user", content: request.prompt });

    const stream = await client.chat.completions.create({
      model: taskConfig?.openaiModel || config.openai?.model || 'gpt-4-turbo-preview',
      messages,
      stream: true,
      ...(taskConfig ? {
        temperature: taskConfig.temperature,
        max_tokens: taskConfig.maxOutputTokens,
        top_p: taskConfig.topP,
      } : {}),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
    return;
  }
}


export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  taskConfig: TaskAIConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= taskConfig.maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), taskConfig.timeoutMs)
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < taskConfig.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, taskConfig.retryDelayMs));
      }
    }
  }

  throw lastError || new Error('All retries exhausted');
}
