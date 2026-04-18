import { assertOfflineCompliant } from "./guard.js";
import {
  ProviderRequestError,
  type LLMProvider,
  type LLMRequestOptions,
  type LLMResponse,
} from "./types.js";

/**
 * Ollama Provider
 *
 * The trust-first default. Talks to a local Ollama daemon on
 * http://localhost:11434 using its OpenAI-compatible /v1/chat/completions
 * endpoint. No API key. No network egress. Works offline.
 */

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1";

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
}

export function createOllamaProvider(
  options: OllamaProviderOptions = {}
): LLMProvider {
  const baseUrl = (
    options.baseUrl ??
    process.env.PERSONA_X_OLLAMA_URL ??
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const model = options.model ?? process.env.PERSONA_X_MODEL ?? DEFAULT_MODEL;

  return {
    name: "ollama",
    model,
    async sendMessage(opts: LLMRequestOptions): Promise<LLMResponse> {
      const endpoint = `${baseUrl}/v1/chat/completions`;
      assertOfflineCompliant("ollama", endpoint);

      const { system, messages, maxTokens = 4096, temperature = 0.7 } = opts;

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: false,
      };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderRequestError(
          `Ollama request failed (is the daemon running at ${baseUrl}?): ${err instanceof Error ? err.message : String(err)}`,
          "ollama",
          err,
          true
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ProviderRequestError(
          `Ollama returned ${res.status}: ${text.substring(0, 200)}`,
          "ollama",
          undefined,
          res.status >= 500 || res.status === 429
        );
      }

      const data = (await res.json()) as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new ProviderRequestError(
          "No content in Ollama response",
          "ollama",
          undefined,
          false
        );
      }

      return {
        content,
        provider: "ollama",
        model: data.model ?? model,
        usage: {
          input_tokens: data.usage?.prompt_tokens ?? 0,
          output_tokens: data.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
