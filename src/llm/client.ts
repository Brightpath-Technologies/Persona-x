import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOllamaProvider } from "./providers/ollama.js";
import { createOpenAICompatibleProvider } from "./providers/openai-compatible.js";
import {
  ProviderRequestError,
  type LLMProvider,
  type LLMRequestOptions,
  type LLMResponse,
  type ProviderName,
} from "./providers/types.js";

/**
 * LLM Client — provider-agnostic entry point.
 *
 * Every LLM call in Persona-x goes through this factory. The concrete
 * provider is chosen by PERSONA_X_PROVIDER (default: ollama) — this keeps
 * the trust boundary explicit and lets consumers pick local-only operation
 * without touching call sites.
 *
 * Retry policy lives here so every provider benefits equally.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export type LLMClient = LLMProvider;

export type {
  LLMResponse,
  LLMMessage,
  LLMRequestOptions,
  ProviderName,
} from "./providers/types.js";

export { OfflineViolationError, ProviderRequestError } from "./providers/types.js";

export interface CreateClientOptions {
  provider?: ProviderName;
}

/**
 * Create an LLM client for the configured provider.
 *
 * Provider selection:
 *   options.provider argument   > PERSONA_X_PROVIDER env var   > "ollama"
 */
export function createClient(options: CreateClientOptions = {}): LLMClient {
  const name = options.provider ?? readProviderEnv() ?? "ollama";

  switch (name) {
    case "anthropic":
      return createAnthropicProvider();
    case "ollama":
      return createOllamaProvider();
    case "openai-compatible":
      return createOpenAICompatibleProvider();
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}

function readProviderEnv(): ProviderName | null {
  const raw = process.env.PERSONA_X_PROVIDER;
  if (!raw) return null;
  if (raw === "anthropic" || raw === "ollama" || raw === "openai-compatible") {
    return raw;
  }
  throw new Error(
    `PERSONA_X_PROVIDER must be anthropic | ollama | openai-compatible, got: ${raw}`
  );
}

/**
 * Send a message through the active provider with retry on transient failures.
 */
export async function sendMessage(
  client: LLMClient,
  options: LLMRequestOptions
): Promise<LLMResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.sendMessage(options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof ProviderRequestError && !err.retryable) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("LLM request failed after retries");
}

/**
 * Send a message and parse the response as JSON, extracting from
 * markdown code fences when present.
 */
export async function sendMessageForJSON<T>(
  client: LLMClient,
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

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].trim();
  }

  return text.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
