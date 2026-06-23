import { assertOfflineCompliant } from "./guard.js";
import {
  ProviderRequestError,
  type LLMProvider,
  type LLMRequestOptions,
  type LLMResponse,
} from "./types.js";

/**
 * OpenAI-Compatible Provider
 *
 * A generic adapter for any HTTP endpoint that implements OpenAI's
 * /v1/chat/completions contract. Covers: self-hosted vLLM / TGI,
 * Fireworks, Together, Groq, OpenAI itself, OpenRouter — anything
 * speaking the same protocol.
 *
 * Driven by env vars:
 *   PERSONA_X_OAI_BASE_URL   (required, e.g. https://api.fireworks.ai/inference)
 *   PERSONA_X_OAI_API_KEY    (required if the endpoint authenticates)
 *   PERSONA_X_MODEL          (required)
 */

export interface OpenAICompatibleOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface ChatResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
}

export function createOpenAICompatibleProvider(
  options: OpenAICompatibleOptions = {},
): LLMProvider {
  const baseUrl = (
    options.baseUrl ?? process.env.PERSONA_X_OAI_BASE_URL
  )?.replace(/\/$/, "");
  const apiKey = options.apiKey ?? process.env.PERSONA_X_OAI_API_KEY;
  const model = options.model ?? process.env.PERSONA_X_MODEL;

  if (!baseUrl) {
    throw new Error(
      "openai-compatible provider requires PERSONA_X_OAI_BASE_URL",
    );
  }
  if (!model) {
    throw new Error("openai-compatible provider requires PERSONA_X_MODEL");
  }

  return {
    name: "openai-compatible",
    model,
    async sendMessage(opts: LLMRequestOptions): Promise<LLMResponse> {
      const endpoint = `${baseUrl}/v1/chat/completions`;
      assertOfflineCompliant("openai-compatible", endpoint);

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
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderRequestError(
          `OpenAI-compatible request to ${baseUrl} failed: ${err instanceof Error ? err.message : String(err)}`,
          "openai-compatible",
          err,
          true,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const retryable = res.status >= 500 || res.status === 429;
        throw new ProviderRequestError(
          `OpenAI-compatible endpoint returned ${res.status}: ${text.substring(0, 200)}`,
          "openai-compatible",
          undefined,
          retryable,
        );
      }

      const data = (await res.json()) as ChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new ProviderRequestError(
          "No content in OpenAI-compatible response",
          "openai-compatible",
          undefined,
          false,
        );
      }

      return {
        content,
        provider: "openai-compatible",
        model: data.model ?? model,
        usage: {
          input_tokens: data.usage?.prompt_tokens ?? 0,
          output_tokens: data.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
