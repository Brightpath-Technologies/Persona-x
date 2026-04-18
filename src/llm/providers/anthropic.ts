import Anthropic from "@anthropic-ai/sdk";
import { assertOfflineCompliant } from "./guard.js";
import {
  ProviderRequestError,
  type LLMProvider,
  type LLMRequestOptions,
  type LLMResponse,
} from "./types.js";

/**
 * Anthropic Provider
 *
 * Implements the LLMProvider contract against Claude models.
 * Uses prompt caching (ephemeral cache_control) on the system prompt
 * when cacheSystem is requested.
 */

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const API_URL = "https://api.anthropic.com";

export interface AnthropicProviderOptions {
  model?: string;
  apiKey?: string;
}

export function createAnthropicProvider(
  options: AnthropicProviderOptions = {}
): LLMProvider {
  const model = options.model ?? process.env.PERSONA_X_MODEL ?? DEFAULT_MODEL;
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;

  const client = new Anthropic(apiKey ? { apiKey } : {});

  return {
    name: "anthropic",
    model,
    async sendMessage(opts: LLMRequestOptions): Promise<LLMResponse> {
      assertOfflineCompliant("anthropic", API_URL);

      const { system, messages, maxTokens = 4096, temperature = 0.7 } = opts;

      try {
        const systemBlocks = buildSystemBlocks(system, opts.cacheSystem);

        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          ...(systemBlocks ? { system: systemBlocks } : {}),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        const textBlock = response.content.find(
          (block) => block.type === "text"
        );
        if (!textBlock || textBlock.type !== "text") {
          throw new ProviderRequestError(
            "No text content in Anthropic response",
            "anthropic",
            undefined,
            false
          );
        }

        const usage = response.usage as {
          input_tokens: number;
          output_tokens: number;
          cache_read_input_tokens?: number;
          cache_creation_input_tokens?: number;
        };

        return {
          content: textBlock.text,
          provider: "anthropic",
          model,
          usage: {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cache_read_input_tokens: usage.cache_read_input_tokens,
            cache_creation_input_tokens: usage.cache_creation_input_tokens,
          },
        };
      } catch (err) {
        if (err instanceof ProviderRequestError) throw err;
        if (err instanceof Anthropic.AuthenticationError) {
          throw new ProviderRequestError(
            `Anthropic authentication failed: ${err.message}`,
            "anthropic",
            err,
            false
          );
        }
        if (err instanceof Anthropic.BadRequestError) {
          throw new ProviderRequestError(
            `Anthropic request malformed: ${err.message}`,
            "anthropic",
            err,
            false
          );
        }
        throw new ProviderRequestError(
          `Anthropic request failed: ${err instanceof Error ? err.message : String(err)}`,
          "anthropic",
          err,
          true
        );
      }
    },
  };
}

/**
 * Build the Anthropic `system` parameter.
 * When cacheSystem is true the system prompt is wrapped in a block with
 * ephemeral cache_control — repeat calls reuse the cached prefix at ~10%
 * cost. Returns undefined when no system prompt supplied.
 */
function buildSystemBlocks(
  system: string | undefined,
  cacheSystem: boolean | undefined
):
  | string
  | Array<{
      type: "text";
      text: string;
      cache_control?: { type: "ephemeral" };
    }>
  | undefined {
  if (!system) return undefined;
  if (!cacheSystem) return system;

  return [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" },
    },
  ];
}
