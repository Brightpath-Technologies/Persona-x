import Anthropic from "@anthropic-ai/sdk";

/**
 * LLM Client
 *
 * Wraps the Anthropic SDK with retry logic and structured response handling.
 * All LLM calls in Persona-x go through this module.
 *
 * Retry policy: exponential backoff, 3 attempts max (per CLAUDE.md).
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface LLMResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequestOptions {
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Create an Anthropic client instance.
 * Requires ANTHROPIC_API_KEY environment variable.
 */
export function createClient(): Anthropic {
  return new Anthropic();
}

/**
 * Send a message to the LLM with retry logic.
 * Uses exponential backoff: 1s, 2s, 4s delays between attempts.
 */
export async function sendMessage(
  client: Anthropic,
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const { system, messages, maxTokens = 4096, temperature = 0.7 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in LLM response");
      }

      return {
        content: textBlock.text,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on authentication or validation errors
      if (err instanceof Anthropic.AuthenticationError) throw lastError;
      if (err instanceof Anthropic.BadRequestError) throw lastError;

      // Retry on rate limits and server errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("LLM request failed after retries");
}

/**
 * Send a message and parse the response as JSON.
 * Extracts JSON from the response even if wrapped in markdown code blocks.
 */
export async function sendMessageForJSON<T>(
  client: Anthropic,
  options: LLMRequestOptions,
  validate: (data: unknown) => T
): Promise<T> {
  const response = await sendMessage(client, options);
  const jsonStr = extractJSON(response.content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON: ${response.content.substring(0, 200)}`
    );
  }

  return validate(parsed);
}

/**
 * Extract JSON from a string that may contain markdown code blocks.
 */
function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON (object or array)
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].trim();
  }

  // Return as-is and let JSON.parse handle the error
  return text.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
